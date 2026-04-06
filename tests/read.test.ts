import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { Nodiom } from '../src/index.js';
import { SelectorNotFoundError } from '../src/errors.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('read operations', () => {
  let doc: Nodiom;

  beforeAll(async () => {
    const source = await readFile(join(FIXTURES, 'agent-wiki.md'), 'utf-8');
    doc = Nodiom.fromString(source);
  });

  describe('read()', () => {
    it('reads a top-level heading section', () => {
      const result = doc.read('# Project Aurora > ## Overview');
      expect(result).toContain('replace the legacy recommendation system');
    });

    it('reads a nested heading section', () => {
      const result = doc.read('# Project Aurora > ## Tasks > ### Active');
      expect(result).toContain('Implement collaborative filtering pipeline');
      expect(result).toContain('Design A/B testing framework');
    });

    it('reads a deeply nested section', () => {
      const result = doc.read('# Project Aurora > ## Meeting Notes > ### 2026-03-28');
      expect(result).toContain('migration timeline');
      expect(result).toContain('parallel systems for 30 days');
    });

    it('reads only the matched section, not adjacent sections', () => {
      const result = doc.read('# Project Aurora > ## Tasks > ### Active');
      expect(result).not.toContain('Project charter approved'); // that's in Completed
    });

    it('throws SelectorNotFoundError for a missing heading', () => {
      expect(() => doc.read('# Project Aurora > ## Nonexistent')).toThrow(SelectorNotFoundError);
    });

    it('includes fuzzy suggestions in SelectorNotFoundError', () => {
      try {
        doc.read('# Project Aurora > ## Taks'); // typo
        expect.fail('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(SelectorNotFoundError);
        expect((e as SelectorNotFoundError).suggestions).toContain('Tasks');
      }
    });

    it('reads a paragraph element selector', () => {
      const result = doc.read('# Project Aurora > ## Overview > p[0]');
      expect(result).toContain('Project Aurora aims to replace');
    });

    it('reads the table in Architecture section', () => {
      const result = doc.read('# Project Aurora > ## Architecture > ### Tech Stack > table[0]');
      expect(result).toContain('Kafka');
      expect(result).toContain('PyTorch');
    });
  });

  describe('readList()', () => {
    it('returns an array of team members', () => {
      const items = doc.readList('# Project Aurora > ## Team');
      expect(items).toHaveLength(4);
      expect(items[0]).toContain('Alice Chen');
      expect(items[3]).toContain('David Kim');
    });

    it('returns active tasks as an array', () => {
      const items = doc.readList('# Project Aurora > ## Tasks > ### Active');
      expect(items).toHaveLength(4);
      expect(items[0]).toContain('collaborative filtering pipeline');
    });

    it('returns negative-indexed item with li[-1]', () => {
      const lastItem = doc.read('# Project Aurora > ## Team > li[-1]');
      expect(lastItem).toContain('David Kim');
    });
  });

  describe('query()', () => {
    it('returns exists: true for a valid selector', () => {
      const result = doc.query('# Project Aurora > ## Tasks');
      expect(result.exists).toBe(true);
      expect(result.type).toBe('heading');
      expect(result.depth).toBe(2);
    });

    it('returns exists: false for a missing selector', () => {
      const result = doc.query('# Project Aurora > ## DoesNotExist');
      expect(result.exists).toBe(false);
    });
  });

  describe('tree()', () => {
    it('returns a structured outline of the document', () => {
      const outline = doc.tree();
      expect(outline).toHaveLength(1);
      expect(outline[0]!.heading).toBe('Project Aurora');
      expect(outline[0]!.depth).toBe(1);

      const h2s = outline[0]!.children.map((c) => c.heading);
      expect(h2s).toContain('Overview');
      expect(h2s).toContain('Tasks');
      expect(h2s).toContain('Architecture');
    });

    it('nests subheadings correctly', () => {
      const outline = doc.tree();
      const tasks = outline[0]!.children.find((c) => c.heading === 'Tasks')!;
      expect(tasks.children.map((c) => c.heading)).toContain('Active');
      expect(tasks.children.map((c) => c.heading)).toContain('Completed');
      expect(tasks.children.map((c) => c.heading)).toContain('Blocked');
    });
  });
});
