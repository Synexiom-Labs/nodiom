import type { Root, RootContent } from 'mdast';

/** A resolved location in the document — the matched nodes and their source positions. */
export interface ResolvedLocation {
  /** The heading node that opened this scope (null for root-level element matches). */
  headingNode: RootContent | null;
  /** All nodes that fall within this scope (children of the heading's implicit section). */
  scopeNodes: RootContent[];
  /** The specific node targeted by the final element segment, if any. */
  targetNode: RootContent | null;
  /** Character offset in the source string where this location starts. */
  startOffset: number;
  /** Character offset in the source string where this location ends (exclusive). */
  endOffset: number;
}

/** Structural metadata returned by doc.query(). */
export interface QueryResult {
  exists: boolean;
  type: string | null;
  depth: number | null;
  childCount: number | null;
  index: number | null;
}

/** A node in the document outline returned by doc.tree(). */
export interface OutlineNode {
  heading: string;
  depth: number;
  children: OutlineNode[];
}

/** Options for Nodiom.fromFile(). */
export interface FromFileOptions {
  /** If true, acquires an advisory file lock. Release with doc.unlock() or doc.save(). */
  lock?: boolean;
  /** How long to wait for a lock before throwing LockError, in milliseconds. Default: 5000. */
  lockTimeout?: number;
}

/** Internal parsed AST with its source string. */
export interface ParsedDocument {
  source: string;
  ast: Root;
}
