/** A heading segment: matches a heading node by depth and text. e.g. "## Tasks" */
export interface HeadingSegment {
  kind: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

/** An element segment: matches a typed node by index. e.g. "li[0]", "p[-1]" */
export interface ElementSegment {
  kind: 'element';
  elementType: 'p' | 'li' | 'code' | 'blockquote' | 'table' | 'hr' | 'image' | 'thematicBreak';
  index: number;
}

export type SelectorSegment = HeadingSegment | ElementSegment;

/** A fully parsed selector — an ordered list of segments. */
export type SelectorPath = SelectorSegment[];
