import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('edge cases', () => {
  it('a duplicated heading is ambiguous rather than silently resolving to the first', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    const { AmbiguousSelectorError } = await import('../src/errors.js');
    expect(() => doc.read('# Duplicate Heading > ## Tasks')).toThrow(AmbiguousSelectorError);
  });

  it('each duplicated heading is addressable by index', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);

    const first = doc.read('# Duplicate Heading > ## Tasks[0]');
    expect(first).toContain('alpha');
    expect(first).not.toContain('gamma');

    const second = doc.read('# Duplicate Heading > ## Tasks[1]');
    expect(second).toContain('gamma');
    expect(second).not.toContain('alpha');

    expect(doc.read('# Duplicate Heading > ## Tasks[-1]')).toContain('gamma');
  });

  it('headings inside fenced code blocks are not matched', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    // The heading "# This heading is inside a code block" must not be matchable
    const { SelectorNotFoundError } = await import('../src/errors.js');
    expect(() =>
      doc.read('# This heading is inside a code block'),
    ).toThrow(SelectorNotFoundError);
  });

  it('reads a section after an empty section', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    const result = doc.read('# Section After Empty');
    expect(result).toContain('Content here');
  });

  it('negative index li[-1] returns the last item', async () => {
    const source = await readFile(join(FIXTURES, 'agent-wiki.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    const last = doc.read('# Project Aurora > ## Team > li[-1]');
    expect(last).toContain('David Kim');
  });

  it('fromString produces identical toString output (in-memory roundtrip)', () => {
    const source = '# Hello\n\nWorld.\n';
    const doc = Nodiom.fromString(source);
    expect(doc.toString()).toBe(source);
  });

  it('handles special characters in heading text', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    const result = doc.read('# Special Ch@r$ & Symbols!');
    expect(result).toContain('Content under special heading');
  });
});
