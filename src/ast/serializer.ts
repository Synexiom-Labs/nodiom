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
 * Normalizes new content provided by the user into a clean Markdown string.
 * If the content is already a string, it is parsed and re-serialized to
 * ensure it is valid Markdown.
 */
export function normalizeContent(content: string): string {
  const ast = processor.parse(content) as Root;
  return processor.stringify(ast);
}
