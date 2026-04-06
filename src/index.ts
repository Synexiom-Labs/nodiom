import { readFile, writeFile } from 'node:fs/promises';
import type { Heading, Root, RootContent } from 'mdast';
import { parseMarkdown, normalizeContent } from './ast/serializer.js';
import { resolveSelector, extractHeadingText } from './ast/traverser.js';
import { SelectorNotFoundError } from './errors.js';
import { acquireLock, releaseLock } from './lock/file-lock.js';
import type { LockHandle } from './lock/file-lock.js';
import { parseSelector } from './selector/parser.js';
import type { FromFileOptions, OutlineNode, QueryResult } from './types.js';

export { NodiomError, SelectorNotFoundError, SelectorParseError, LockError } from './errors.js';
export type { FromFileOptions, OutlineNode, QueryResult } from './types.js';

export class Nodiom {
  private source: string;
  private ast: Root;
  private filePath: string | null;
  private lockHandle: LockHandle | null = null;

  private constructor(source: string, ast: Root, filePath: string | null) {
    this.source = source;
    this.ast = ast;
    this.filePath = filePath;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Creates a Nodiom instance from a Markdown file on disk.
   * If options.lock is true, acquires an advisory file lock.
   */
  static async fromFile(filePath: string, options: FromFileOptions = {}): Promise<Nodiom> {
    const source = await readFile(filePath, 'utf-8');
    const ast = parseMarkdown(source);
    const instance = new Nodiom(source, ast, filePath);

    if (options.lock) {
      const timeoutMs = options.lockTimeout ?? 5000;
      instance.lockHandle = await acquireLock(filePath, timeoutMs);
    }

    return instance;
  }

  /**
   * Creates a Nodiom instance from a Markdown string in memory.
   * No filesystem access — safe for serverless environments.
   */
  static fromString(content: string): Nodiom {
    const ast = parseMarkdown(content);
    return new Nodiom(content, ast, null);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Returns the Markdown content at the given selector as a string.
   * For a heading selector, returns all content within that heading's scope.
   * For an element selector, returns the content of that specific element.
   */
  read(selector: string): string {
    const path = parseSelector(selector);
    const location = resolveSelector(this.ast, this.source, path);

    // Slice the original source — roundtrip fidelity guaranteed
    return this.source.slice(location.startOffset, location.endOffset).trim();
  }

  /**
   * Returns an array of plain-text strings for each list item under the selector.
   * The selector should resolve to a section containing a list.
   */
  readList(selector: string): string[] {
    const path = parseSelector(selector);
    const location = resolveSelector(this.ast, this.source, path);

    const items: string[] = [];
    const scopeNodes = location.targetNode ? [location.targetNode] : location.scopeNodes;

    for (const node of scopeNodes) {
      if (node.type === 'list') {
        const list = node as { type: 'list'; children: Array<{ children: RootContent[] }> };
        for (const item of list.children) {
          // Extract the raw text of this list item from the source
          const itemNode = item as RootContent;
          if (itemNode.position) {
            const text = this.source
              .slice(itemNode.position.start.offset, itemNode.position.end.offset)
              .trim();
            items.push(text);
          }
        }
      }
    }

    return items;
  }

  /**
   * Returns structural metadata about the location matched by the selector.
   */
  query(selector: string): QueryResult {
    const path = parseSelector(selector);

    try {
      const location = resolveSelector(this.ast, this.source, path);
      const node = location.targetNode ?? location.headingNode;

      if (!node) {
        return { exists: false, type: null, depth: null, childCount: null, index: null };
      }

      const depth = node.type === 'heading' ? (node as Heading).depth : null;
      const childCount =
        'children' in node ? (node as { children: unknown[] }).children.length : null;

      // Find the index of this node among its siblings in the AST
      const index = this.ast.children.indexOf(node as RootContent);

      return {
        exists: true,
        type: node.type,
        depth,
        childCount,
        index: index === -1 ? null : index,
      };
    } catch (e) {
      if (e instanceof SelectorNotFoundError) {
        return { exists: false, type: null, depth: null, childCount: null, index: null };
      }
      throw e;
    }
  }

  /**
   * Returns the full structural outline of the document as a nested tree of headings.
   */
  tree(): OutlineNode[] {
    return buildOutline(this.ast.children);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /**
   * Replaces all content within the selector's scope with new content.
   * The heading itself is preserved; only the body content is replaced.
   */
  write(selector: string, content: string): this {
    const path = parseSelector(selector);
    const location = resolveSelector(this.ast, this.source, path);

    const normalized = normalizeContent(content);

    if (location.targetNode) {
      // Element selector — replace just that node
      const node = location.targetNode;
      const start = node.position!.start.offset;
      const end = node.position!.end.offset;
      this.source =
        this.source.slice(0, start) + normalized.trimEnd() + this.source.slice(end);
    } else {
      // Heading selector — replace the scope content (preserve the heading line)
      const headingNode = location.headingNode!;
      const headingEnd = headingNode.position!.end.offset;

      // The scope content starts after the heading line
      const scopeStart = headingEnd;

      // The scope content ends at the endOffset
      const scopeEnd = location.endOffset;

      // Build replacement: newline + new content
      const replacement = '\n\n' + normalized.trimEnd();
      this.source =
        this.source.slice(0, scopeStart) + replacement + this.source.slice(scopeEnd);
    }

    this.reparse();
    return this;
  }

  /**
   * Appends content after the last child in the selector's scope.
   */
  append(selector: string, content: string): this {
    const path = parseSelector(selector);
    const location = resolveSelector(this.ast, this.source, path);

    const normalized = normalizeContent(content);

    // Insert after the end of the current scope
    const insertAt = location.endOffset;
    this.source =
      this.source.slice(0, insertAt) +
      '\n' +
      normalized.trimEnd() +
      this.source.slice(insertAt);

    this.reparse();
    return this;
  }

  /**
   * Removes the node or section matched by the selector.
   */
  delete(selector: string): this {
    const path = parseSelector(selector);
    const location = resolveSelector(this.ast, this.source, path);

    const start = location.startOffset;
    const end = location.endOffset;

    // Trim any leading newlines before the deleted block to avoid double blank lines
    let deleteFrom = start;
    while (deleteFrom > 0 && this.source[deleteFrom - 1] === '\n') {
      deleteFrom--;
    }
    // Keep one newline separator if we're not at the start of the document
    if (deleteFrom > 0) {
      deleteFrom++;
    }

    this.source = this.source.slice(0, deleteFrom) + this.source.slice(end);
    this.reparse();
    return this;
  }

  // ---------------------------------------------------------------------------
  // Serialization & File I/O
  // ---------------------------------------------------------------------------

  /** Returns the current document as a Markdown string. */
  toString(): string {
    return this.source;
  }

  /** Writes the document back to the file it was loaded from, then releases any lock. */
  async save(): Promise<void> {
    if (!this.filePath) {
      throw new Error('Cannot save: document was created from a string, not a file. Use saveAs().');
    }
    await writeFile(this.filePath, this.source, 'utf-8');
    await this.unlock();
  }

  /** Writes the document to a new file path. Does not release the original lock. */
  async saveAs(filePath: string): Promise<void> {
    await writeFile(filePath, this.source, 'utf-8');
  }

  /** Explicitly releases the advisory file lock. */
  async unlock(): Promise<void> {
    if (this.lockHandle && this.filePath) {
      await releaseLock(this.lockHandle, this.filePath);
      this.lockHandle = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Re-parses the source after a mutation to keep the AST in sync. */
  private reparse(): void {
    this.ast = parseMarkdown(this.source);
  }
}

// ---------------------------------------------------------------------------
// Outline builder
// ---------------------------------------------------------------------------

function buildOutline(nodes: RootContent[]): OutlineNode[] {
  const result: OutlineNode[] = [];
  const stack: Array<{ node: OutlineNode; depth: number }> = [];

  for (const node of nodes) {
    if (node.type !== 'heading') continue;
    const h = node as Heading;
    const text = extractHeadingText(h);
    const outlineNode: OutlineNode = { heading: text, depth: h.depth, children: [] };

    // Pop stack entries that are at the same depth or deeper
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= h.depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      result.push(outlineNode);
    } else {
      stack[stack.length - 1]!.node.children.push(outlineNode);
    }

    stack.push({ node: outlineNode, depth: h.depth });
  }

  return result;
}
