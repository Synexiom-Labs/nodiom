import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import type { Root, RootContent } from 'mdast';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkStringify);

/** Parses a Markdown string into an mdast Root. */
export function parseMarkdown(source: string): Root {
  return processor.parse(source) as Root;
}

/**
 * Serializes a single mdast node or a list of nodes into a Markdown string.
 * Used ONLY for new content being inserted — never for existing content.
 */
export function serializeNodes(nodes: RootContent[]): string {
  const root: Root = { type: 'root', children: nodes };
  return processor.stringify(root);
}

/**
 * Returns user-provided content trimmed, without re-serialization.
 *
 * Re-serializing through remark-stringify silently corrupts content:
 * list bullets change (`- [ ]` → `* [ ]`), underscores in filenames
 * get escaped, etc. Users are responsible for providing valid Markdown.
 */
export function normalizeContent(content: string): string {
  return content.trim();
}
