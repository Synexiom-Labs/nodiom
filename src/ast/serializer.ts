import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import type { Root, RootContent } from 'mdast';

/*
 * Frontmatter must be recognised explicitly. Without it, the closing `---` of
 * a YAML block reads as a setext heading underline, so the properties become a
 * heading called "title: …" — one that tree() reports, a selector can target,
 * and a delete destroys. With it, the block parses as its own yaml/toml node:
 * never a heading, never inside a heading's scope, and — because edits splice
 * by source offset — left byte-identical by every operation.
 */
const processor = unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ['yaml', 'toml'])
  .use(remarkGfm)
  .use(remarkStringify);

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
