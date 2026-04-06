import { SelectorParseError } from '../errors.js';
import type { ElementSegment, HeadingSegment, SelectorPath, SelectorSegment } from './types.js';

const SEGMENT_SEPARATOR = ' > ';

const ELEMENT_TYPES = new Set([
  'p', 'li', 'code', 'blockquote', 'table', 'hr', 'image', 'thematicBreak',
]);

/**
 * Parses a selector string into a typed SelectorPath.
 *
 * Examples:
 *   "# Project Alpha"                       → [HeadingSegment(1, "Project Alpha")]
 *   "# Project Alpha > ## Tasks"            → [HeadingSegment(1, ...), HeadingSegment(2, ...)]
 *   "# Project Alpha > ## Tasks > li[0]"    → [..., ElementSegment("li", 0)]
 *   "## Tasks > li[-1]"                     → [HeadingSegment(2, ...), ElementSegment("li", -1)]
 */
export function parseSelector(selector: string): SelectorPath {
  if (!selector || selector.trim() === '') {
    throw new SelectorParseError(selector, 'selector must not be empty');
  }

  const raw = selector.trim();
  const parts = raw.split(SEGMENT_SEPARATOR);
  const path: SelectorPath = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed === '') {
      throw new SelectorParseError(selector, 'empty segment in selector (check spacing around " > ")');
    }
    path.push(parseSegment(trimmed, selector));
  }

  // Validate: element segments can only appear as the final segment
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i]!.kind === 'element') {
      throw new SelectorParseError(
        selector,
        'element selectors (e.g. li[0]) can only appear as the last segment',
      );
    }
  }

  return path;
}

function parseSegment(part: string, fullSelector: string): SelectorSegment {
  // Try heading: starts with one or more '#' followed by a space
  if (part.startsWith('#')) {
    return parseHeadingSegment(part, fullSelector);
  }

  // Try element: type[index] — e.g. li[0], p[-1]
  const elementMatch = /^([a-zA-Z]+)\[(-?\d+)\]$/.exec(part);
  if (elementMatch) {
    return parseElementSegment(elementMatch, part, fullSelector);
  }

  throw new SelectorParseError(
    fullSelector,
    `unrecognized segment '${part}' — expected a heading (e.g. "## Tasks") or element (e.g. "li[0]")`,
  );
}

function parseHeadingSegment(part: string, fullSelector: string): HeadingSegment {
  let i = 0;
  while (i < part.length && part[i] === '#') {
    i++;
  }
  const depth = i;

  if (depth < 1 || depth > 6) {
    throw new SelectorParseError(fullSelector, `invalid heading depth ${depth} in '${part}'`);
  }

  if (part[i] !== ' ') {
    throw new SelectorParseError(
      fullSelector,
      `heading segment '${part}' must have a space after the '#' characters`,
    );
  }

  const text = part.slice(i + 1).trim();
  if (text === '') {
    throw new SelectorParseError(fullSelector, `heading segment '${part}' has no text`);
  }

  return { kind: 'heading', depth: depth as HeadingSegment['depth'], text };
}

function parseElementSegment(
  match: RegExpExecArray,
  part: string,
  fullSelector: string,
): ElementSegment {
  const elementType = match[1]!;
  const index = parseInt(match[2]!, 10);

  if (!ELEMENT_TYPES.has(elementType)) {
    throw new SelectorParseError(
      fullSelector,
      `unknown element type '${elementType}' in '${part}' — valid types: ${[...ELEMENT_TYPES].join(', ')}`,
    );
  }

  return {
    kind: 'element',
    elementType: elementType as ElementSegment['elementType'],
    index,
  };
}
