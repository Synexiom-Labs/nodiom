/** A heading segment: matches a heading node by depth and text. e.g. "## Tasks" */
export interface HeadingSegment {
  kind: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export type ElementType =
  | 'p' | 'li' | 'code' | 'blockquote' | 'table' | 'hr' | 'image' | 'thematicBreak';

/**
 * How an element segment picks its node.
 *
 * `index` is positional and therefore only valid for as long as nothing before
 * it changes — a second writer appending to the same scope shifts it.
 *
 * `contains` matches on the node's own source text and must resolve to exactly
 * one node, so it stays correct across concurrent edits. Prefer it whenever
 * more than one writer touches a document.
 */
export type ElementMatch =
  | { by: 'index'; index: number }
  | { by: 'contains'; text: string };

/**
 * An element segment: matches a typed node either by index ("li[0]", "p[-1]")
 * or by content ("li[contains=\"c_7f3a\"]").
 */
export interface ElementSegment {
  kind: 'element';
  elementType: ElementType;
  match: ElementMatch;
}

export type SelectorSegment = HeadingSegment | ElementSegment;

/** A fully parsed selector — an ordered list of segments. */
export type SelectorPath = SelectorSegment[];
