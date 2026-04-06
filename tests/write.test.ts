import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import { Nodiom } from '../src/index.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

// Each test gets a fresh document so mutations don't bleed between tests
async function freshDoc(): Promise<Nodiom> {
  const source = await readFile(join(FIXTURES, 'agent-wiki.md'), 'utf-8');
  return Nodiom.fromString(source);
}

describe('write()', () => {
  it('replaces the content of a section', async () => {
    const doc = await freshDoc();
    doc.write('# Project Aurora > ## Overview', 'Project Aurora is on track.');
    const result = doc.read('# Project Aurora > ## Overview');
    expect(result).toContain('Project Aurora is on track.');
    expect(result).not.toContain('legacy recommendation system');
  });

  it('preserves the heading after a write', async () => {
    const doc = await freshDoc();
    doc.write('# Project Aurora > ## Overview', 'New content.');
    expect(doc.toString()).toContain('## Overview');
  });

  it('does not modify other sections when writing one section', async () => {
    const doc = await freshDoc();
    const originalTeam = doc.read('# Project Aurora > ## Team');
    doc.write('# Project Aurora > ## Overview', 'Changed.');
    expect(doc.read('# Project Aurora > ## Team')).toBe(originalTeam);
  });

  it('replaces a specific list item with an element selector', async () => {
    const doc = await freshDoc();
    doc.write('# Project Aurora > ## Team > li[0]', '- **Alice Chen** — Engineering Lead');
    const updated = doc.readList('# Project Aurora > ## Team');
    expect(updated[0]).toContain('Engineering Lead');
    expect(updated[1]).toContain('Bob Martinez');
  });
});

describe('append()', () => {
  it('adds a new list item to a section', async () => {
    const doc = await freshDoc();
    doc.append('# Project Aurora > ## Tasks > ### Active', '- [ ] Write integration tests');
    const items = doc.readList('# Project Aurora > ## Tasks > ### Active');
    expect(items).toHaveLength(5);
    expect(items[4]).toContain('Write integration tests');
  });

  it('does not affect content before the target section', async () => {
    const doc = await freshDoc();
    const originalOverview = doc.read('# Project Aurora > ## Overview');
    doc.append('# Project Aurora > ## Tasks > ### Active', '- [ ] New task');
    expect(doc.read('# Project Aurora > ## Overview')).toBe(originalOverview);
  });

  it('does not affect content after the target section', async () => {
    const doc = await freshDoc();
    const originalCompleted = doc.read('# Project Aurora > ## Tasks > ### Completed');
    doc.append('# Project Aurora > ## Tasks > ### Active', '- [ ] New task');
    expect(doc.read('# Project Aurora > ## Tasks > ### Completed')).toBe(originalCompleted);
  });

  it('supports method chaining', async () => {
    const doc = await freshDoc();
    doc
      .append('# Project Aurora > ## Tasks > ### Active', '- [ ] Task A')
      .append('# Project Aurora > ## Tasks > ### Active', '- [ ] Task B');
    const items = doc.readList('# Project Aurora > ## Tasks > ### Active');
    expect(items).toHaveLength(6);
  });
});

describe('delete()', () => {
  it('removes the first completed task', async () => {
    const doc = await freshDoc();
    doc.delete('# Project Aurora > ## Tasks > ### Completed > li[0]');
    const items = doc.readList('# Project Aurora > ## Tasks > ### Completed');
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Data audit completed');
  });

  it('removes the second completed task', async () => {
    const doc = await freshDoc();
    doc.delete('# Project Aurora > ## Tasks > ### Completed > li[1]');
    const items = doc.readList('# Project Aurora > ## Tasks > ### Completed');
    expect(items).toHaveLength(2);
    expect(items.some((i) => i.includes('Data audit completed'))).toBe(false);
  });

  it('does not affect adjacent sections', async () => {
    const doc = await freshDoc();
    const beforeActive = doc.readList('# Project Aurora > ## Tasks > ### Active');
    doc.delete('# Project Aurora > ## Tasks > ### Completed > li[0]');
    expect(doc.readList('# Project Aurora > ## Tasks > ### Active')).toEqual(beforeActive);
  });

  it('supports chained mutations: append then delete', async () => {
    const doc = await freshDoc();
    doc
      .append('# Project Aurora > ## Tasks > ### Active', '- [ ] Temporary task')
      .delete('# Project Aurora > ## Tasks > ### Active > li[0]');
    const items = doc.readList('# Project Aurora > ## Tasks > ### Active');
    expect(items).toHaveLength(4);
    expect(items.some((i) => i.includes('collaborative filtering'))).toBe(false);
    expect(items.some((i) => i.includes('Temporary task'))).toBe(true);
  });
});
