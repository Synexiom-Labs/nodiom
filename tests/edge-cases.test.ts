import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('edge cases', () => {
  it('first-match wins for duplicate headings', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    const result = doc.read('# Duplicate Heading > ## Tasks');
    // Should match the FIRST "## Tasks" section
    expect(result).toContain('alpha');
    expect(result).toContain('beta');
    expect(result).not.toContain('gamma');
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
