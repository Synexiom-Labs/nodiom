import type { Heading, Root, RootContent } from 'mdast';
import { SelectorNotFoundError } from '../errors.js';
import type { ElementSegment, HeadingSegment, SelectorPath } from '../selector/types.js';
import type { ResolvedLocation } from '../types.js';
import { levenshtein } from '../utils/levenshtein.js';

/**
 * Resolves a SelectorPath against an mdast Root and returns the matched location.
 *
 * Heading scope semantics: "nodes under heading H" = all sibling nodes after H
 * until the next heading node of depth <= H.depth.
 *
 * First match wins for duplicate headings.
 */
export function resolveSelector(
  ast: Root,
  source: string,
  path: SelectorPath,
): ResolvedLocation {
  return resolveInScope(ast.children, source, path, 0);
}

function resolveInScope(
  nodes: RootContent[],
  source: string,
  path: SelectorPath,
  segmentIndex: number,
): ResolvedLocation {
  const segment = path[segmentIndex]!;

  if (segment.kind === 'heading') {
    return resolveHeadingSegment(nodes, source, path, segmentIndex, segment);
  } else {
    return resolveElementSegment(nodes, source, segment, path);
  }
}

function resolveHeadingSegment(
  nodes: RootContent[],
  source: string,
  path: SelectorPath,
  segmentIndex: number,
  segment: HeadingSegment,
): ResolvedLocation {
  // Find the heading node matching this segment
  const headingIndex = findHeadingIndex(nodes, segment);

  if (headingIndex === -1) {
    const allHeadings = collectAllHeadingTexts(nodes);
    const suggestions = fuzzyMatch(segment.text, allHeadings);
    const fullSelector = path.map(segmentToString).join(' > ');
    throw new SelectorNotFoundError(fullSelector, suggestions);
  }

  const headingNode = nodes[headingIndex] as Heading;

  // Collect the scope: all nodes after this heading until the next heading of <= depth
  const scopeNodes = collectScope(nodes, headingIndex, headingNode.depth);

  // If this is the last segment, the entire scope is the target
  if (segmentIndex === path.length - 1) {
    const startOffset = getStartOffset(headingNode, source);
    const endOffset = getScopeEndOffset(scopeNodes, headingNode, source);
    return {
      headingNode,
      scopeNodes,
      targetNode: null,
      startOffset,
      endOffset,
    };
  }

  // Otherwise, recurse into the scope with the next segment
  return resolveInScope(scopeNodes, source, path, segmentIndex + 1);
}

function resolveElementSegment(
  nodes: RootContent[],
  source: string,
  segment: ElementSegment,
  path: SelectorPath,
): ResolvedLocation {
  // Map element type names to mdast node types
  const mdastType = elementTypeToMdast(segment.elementType);

  // For 'li', we need to look inside list nodes
  let candidates: RootContent[];
  if (segment.elementType === 'li') {
    candidates = collectListItems(nodes);
  } else {
    candidates = nodes.filter((n) => n.type === mdastType);
  }

  const count = candidates.length;
  if (count === 0) {
    const fullSelector = path.map(segmentToString).join(' > ');
    throw new SelectorNotFoundError(fullSelector, []);
  }

  // Resolve negative indices
  let idx = segment.index;
  if (idx < 0) {
    idx = count + idx;
  }

  if (idx < 0 || idx >= count) {
    const fullSelector = path.map(segmentToString).join(' > ');
    throw new SelectorNotFoundError(
      fullSelector,
      [],
    );
  }

  const targetNode = candidates[idx]!;
  const startOffset = getNodeStartOffset(targetNode, source);
  const endOffset = getNodeEndOffset(targetNode, source);

  return {
    headingNode: null,
    scopeNodes: nodes,
    targetNode,
    startOffset,
    endOffset,
  };
}

/** Finds the index of the first heading node matching depth and text (case-sensitive). */
function findHeadingIndex(nodes: RootContent[], segment: HeadingSegment): number {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.type === 'heading') {
      const h = node as Heading;
      if (h.depth === segment.depth && extractHeadingText(h) === segment.text) {
        return i;
      }
    }
  }
  return -1;
}

/** Collects all nodes after headingIndex until the next heading of <= depth. */
function collectScope(
  nodes: RootContent[],
  headingIndex: number,
  depth: number,
): RootContent[] {
  const scope: RootContent[] = [];
  for (let i = headingIndex + 1; i < nodes.length; i++) {
    const node = nodes[i]!;
    if (node.type === 'heading' && (node as Heading).depth <= depth) {
      break;
    }
    scope.push(node);
  }
  return scope;
}

/** Extracts the plain text content of a heading node. */
export function extractHeadingText(heading: Heading): string {
  return heading.children
    .map((child) => {
      if ('value' in child) return child.value;
      if ('children' in child) {
        return (child.children as Array<{ value?: string }>)
          .map((c) => c.value ?? '')
          .join('');
      }
      return '';
    })
    .join('');
}

/** Collects all heading texts from a flat node list (for fuzzy suggestions). */
function collectAllHeadingTexts(nodes: RootContent[]): string[] {
  return nodes
    .filter((n) => n.type === 'heading')
    .map((n) => extractHeadingText(n as Heading));
}

/** Returns up to 3 closest heading text matches using Levenshtein distance. */
function fuzzyMatch(query: string, candidates: string[]): string[] {
  return candidates
    .map((c) => ({ text: c, dist: levenshtein(query.toLowerCase(), c.toLowerCase()) }))
    .filter(({ dist }) => dist <= Math.max(3, Math.floor(query.length * 0.4)))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(({ text }) => text);
}

/** Collects all list items (direct children of list nodes) from a scope. */
function collectListItems(nodes: RootContent[]): RootContent[] {
  const items: RootContent[] = [];
  for (const node of nodes) {
    if (node.type === 'list') {
      const list = node as { type: 'list'; children: RootContent[] };
      items.push(...list.children);
    }
  }
  return items;
}

function elementTypeToMdast(elementType: ElementSegment['elementType']): string {
  const map: Record<string, string> = {
    p: 'paragraph',
    li: 'listItem',
    code: 'code',
    blockquote: 'blockquote',
    table: 'table',
    hr: 'thematicBreak',
    image: 'image',
    thematicBreak: 'thematicBreak',
  };
  return map[elementType] ?? elementType;
}

// --- Position/offset helpers ---

/** Gets the source offset for the start of a heading node (including the # characters). */
function getStartOffset(heading: Heading, source: string): number {
  return heading.position?.start.offset ?? 0;
}

/**
 * Gets the end offset for a heading's scope.
 * If the scope has nodes, the end is after the last scope node.
 * If the scope is empty, the end is after the heading line itself.
 */
function getScopeEndOffset(scopeNodes: RootContent[], heading: Heading, source: string): number {
  if (scopeNodes.length > 0) {
    const lastNode = scopeNodes[scopeNodes.length - 1]!;
    return getNodeEndOffset(lastNode, source);
  }
  // Empty scope — end at the end of the heading line
  return heading.position?.end.offset ?? source.length;
}

function getNodeStartOffset(node: RootContent, source: string): number {
  return node.position?.start.offset ?? 0;
}

function getNodeEndOffset(node: RootContent, source: string): number {
  return node.position?.end.offset ?? source.length;
}

function segmentToString(segment: import('../selector/types.js').SelectorSegment): string {
  if (segment.kind === 'heading') {
    return `${'#'.repeat(segment.depth)} ${segment.text}`;
  }
  return `${segment.elementType}[${segment.index}]`;
}
