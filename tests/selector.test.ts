import { describe, expect, it } from 'vitest';
import { SelectorParseError } from '../src/errors.js';
import { parseSelector } from '../src/selector/parser.js';

describe('selector parser', () => {
  describe('heading segments', () => {
    it('parses a single H1', () => {
      const path = parseSelector('# Hello');
      expect(path).toEqual([{ kind: 'heading', depth: 1, text: 'Hello' }]);
    });

    it('parses a single H2', () => {
      const path = parseSelector('## Tasks');
      expect(path).toEqual([{ kind: 'heading', depth: 2, text: 'Tasks' }]);
    });

    it('parses H3 through H6', () => {
      expect(parseSelector('### A')[0]).toMatchObject({ depth: 3, text: 'A' });
      expect(parseSelector('#### B')[0]).toMatchObject({ depth: 4, text: 'B' });
      expect(parseSelector('##### C')[0]).toMatchObject({ depth: 5, text: 'C' });
      expect(parseSelector('###### D')[0]).toMatchObject({ depth: 6, text: 'D' });
    });

    it('parses multi-word heading text', () => {
      const path = parseSelector('# Project Alpha');
      expect(path[0]).toMatchObject({ text: 'Project Alpha' });
    });

    it('parses a chained heading path', () => {
      const path = parseSelector('# Project Alpha > ## Tasks > ### Active');
      expect(path).toEqual([
        { kind: 'heading', depth: 1, text: 'Project Alpha' },
        { kind: 'heading', depth: 2, text: 'Tasks' },
        { kind: 'heading', depth: 3, text: 'Active' },
      ]);
    });
  });

  describe('element segments', () => {
    it('parses a list item selector', () => {
      const path = parseSelector('## Tasks > li[0]');
      expect(path[1]).toEqual({ kind: 'element', elementType: 'li', index: 0 });
    });

    it('parses a paragraph selector', () => {
      const path = parseSelector('## Section > p[0]');
      expect(path[1]).toEqual({ kind: 'element', elementType: 'p', index: 0 });
    });

    it('parses a code block selector', () => {
      const path = parseSelector('## Section > code[0]');
      expect(path[1]).toEqual({ kind: 'element', elementType: 'code', index: 0 });
    });

    it('parses a table selector', () => {
      const path = parseSelector('## Section > table[0]');
      expect(path[1]).toEqual({ kind: 'element', elementType: 'table', index: 0 });
    });

    it('parses negative indexing', () => {
      const path = parseSelector('## Tasks > li[-1]');
      expect(path[1]).toEqual({ kind: 'element', elementType: 'li', index: -1 });
    });
  });

  describe('error cases', () => {
    it('throws SelectorParseError for empty string', () => {
      expect(() => parseSelector('')).toThrow(SelectorParseError);
    });

    it('throws SelectorParseError for whitespace-only string', () => {
      expect(() => parseSelector('   ')).toThrow(SelectorParseError);
    });

    it('throws SelectorParseError for missing space after #', () => {
      expect(() => parseSelector('#Tasks')).toThrow(SelectorParseError);
    });

    it('throws SelectorParseError for unknown element type', () => {
      expect(() => parseSelector('## Tasks > span[0]')).toThrow(SelectorParseError);
    });

    it('throws SelectorParseError for element segment in non-final position', () => {
      expect(() => parseSelector('li[0] > ## Tasks')).toThrow(SelectorParseError);
    });

    it('throws SelectorParseError for double separator', () => {
      expect(() => parseSelector('# Foo >  > ## Bar')).toThrow(SelectorParseError);
    });
  });
});
