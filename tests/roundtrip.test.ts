import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('roundtrip fidelity', () => {
  it('parse → toString() produces identical output for agent-wiki.md', async () => {
    const source = await readFile(join(FIXTURES, 'agent-wiki.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    expect(doc.toString()).toBe(source);
  });

  it('parse → toString() produces identical output for simple.md', async () => {
    const source = await readFile(join(FIXTURES, 'simple.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    expect(doc.toString()).toBe(source);
  });

  it('parse → toString() produces identical output for edge-cases.md', async () => {
    const source = await readFile(join(FIXTURES, 'edge-cases.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    expect(doc.toString()).toBe(source);
  });

  it('a no-op read does not mutate the document', async () => {
    const source = await readFile(join(FIXTURES, 'agent-wiki.md'), 'utf-8');
    const doc = Nodiom.fromString(source);
    doc.read('# Project Aurora > ## Tasks');
    expect(doc.toString()).toBe(source);
  });
});
