import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';
import { AmbiguousSelectorError, SelectorNotFoundError } from '../src/errors.js';
import { parseSelector } from '../src/selector/parser.js';

const BOARD = `# Auth Migration

## In Progress

- [ ] Swap session cookies for signed JWT <!-- nodiom: id=c_7f3a -->
- [ ] Rotate signing keys in staging <!-- nodiom: id=c_4d22 -->
- [ ] Rewrite SDK auth docs <!-- nodiom: id=c_5e93 -->

## Done

- [x] Provision the new key store <!-- nodiom: id=c_8c40 -->
`;

describe('content-addressed element selectors', () => {
  describe('parsing', () => {
    it('parses double-quoted contains', () => {
      const path = parseSelector('## In Progress > li[contains="c_7f3a"]');
      expect(path[1]).toEqual({
        kind: 'element',
        elementType: 'li',
        match: { by: 'contains', text: 'c_7f3a' },
      });
    });

    it('parses single-quoted contains', () => {
      const path = parseSelector("## In Progress > li[contains='c_7f3a']");
      expect(path[1]).toEqual({
        kind: 'element',
        elementType: 'li',
        match: { by: 'contains', text: 'c_7f3a' },
      });
    });

    it('rejects an empty contains value', () => {
      expect(() => parseSelector('## In Progress > li[contains=""]')).toThrow(/empty contains/);
    });

    it('still parses positional selectors', () => {
      const path = parseSelector('## In Progress > li[1]');
      expect(path[1]).toEqual({
        kind: 'element',
        elementType: 'li',
        match: { by: 'index', index: 1 },
      });
    });
  });

  describe('resolution', () => {
    it('reads the item containing the text', () => {
      const doc = Nodiom.fromString(BOARD);
      expect(doc.read('## In Progress > li[contains="c_4d22"]')).toContain('Rotate signing keys');
    });

    it('throws when nothing matches', () => {
      const doc = Nodiom.fromString(BOARD);
      expect(() => doc.read('## In Progress > li[contains="c_nope"]')).toThrow(SelectorNotFoundError);
    });

    it('throws rather than guessing when several match', () => {
      const doc = Nodiom.fromString(BOARD);
      expect(() => doc.read('## In Progress > li[contains="- [ ]"]')).toThrow(AmbiguousSelectorError);
    });

    it('is scoped to its heading', () => {
      const doc = Nodiom.fromString(BOARD);
      // c_8c40 lives under ## Done, so it must not resolve under ## In Progress.
      expect(() => doc.read('## In Progress > li[contains="c_8c40"]')).toThrow(SelectorNotFoundError);
    });
  });

  describe('writing', () => {
    it('deletes the addressed item and leaves the others', () => {
      const doc = Nodiom.fromString(BOARD);
      doc.delete('## In Progress > li[contains="c_4d22"]');
      const after = doc.toString();
      expect(after).not.toContain('c_4d22');
      expect(after).toContain('c_7f3a');
      expect(after).toContain('c_5e93');
      expect(after).toContain('c_8c40');
    });

    it('writes to the addressed item', () => {
      const doc = Nodiom.fromString(BOARD);
      doc.write(
        '## In Progress > li[contains="c_5e93"]',
        '- [x] Rewrite SDK auth docs <!-- nodiom: id=c_5e93 -->',
      );
      expect(doc.toString()).toContain('- [x] Rewrite SDK auth docs');
      expect(doc.toString()).toContain('c_7f3a');
    });

    /*
     * The property the whole feature exists for. An index computed before a
     * concurrent append points at the wrong item afterwards; a content selector
     * does not.
     */
    it('still addresses the same item after another writer prepends one', () => {
      const withNew = BOARD.replace(
        '## In Progress\n\n',
        '## In Progress\n\n- [ ] Injected by another agent <!-- nodiom: id=c_new1 -->\n',
      );

      const positional = Nodiom.fromString(withNew);
      // li[0] meant "Swap session cookies" a moment ago; now it does not.
      expect(positional.read('## In Progress > li[0]')).toContain('Injected by another agent');

      const byContent = Nodiom.fromString(withNew);
      expect(byContent.read('## In Progress > li[contains="c_7f3a"]')).toContain(
        'Swap session cookies',
      );
    });
  });
});
