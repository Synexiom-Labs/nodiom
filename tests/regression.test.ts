/**
 * Regression tests for bugs found in v0.1.1 QE analysis.
 * Each test is named after the specific behaviour it guards.
 */
import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';

describe('regression: normalizeContent does not corrupt user content', () => {
  it('preserves task list bullet markers (- not converted to *)', () => {
    const doc = Nodiom.fromString('## Tasks\n\nExisting.\n');
    doc.append('## Tasks', '- [ ] new task');
    expect(doc.toString()).toContain('- [ ] new task');
    expect(doc.toString()).not.toContain('* [ ] new task');
  });

  it('preserves checked task list markers', () => {
    const doc = Nodiom.fromString('## Done\n\nExisting.\n');
    doc.append('## Done', '- [x] completed task');
    expect(doc.toString()).toContain('- [x] completed task');
    expect(doc.toString()).not.toContain('* [x] completed task');
  });

  it('preserves underscores in filenames without escaping', () => {
    const doc = Nodiom.fromString('## Docs\n\nExisting.\n');
    doc.append('## Docs', 'See file_name.md for details.');
    expect(doc.toString()).toContain('file_name.md');
    expect(doc.toString()).not.toContain('file\\_name.md');
  });

  it('write() preserves task list markers', () => {
    const doc = Nodiom.fromString('## Tasks\n\n- [x] old task\n');
    doc.write('## Tasks', '- [ ] replacement task');
    expect(doc.toString()).toContain('- [ ] replacement task');
    expect(doc.toString()).not.toContain('* [ ] replacement task');
  });
});

describe('regression: append() uses correct block separator', () => {
  it('appended paragraph is separated by a blank line', () => {
    const source = '## Section\n\nFirst paragraph.\n';
    const doc = Nodiom.fromString(source);
    doc.append('## Section', 'Second paragraph.');
    expect(doc.toString()).toContain('First paragraph.\n\nSecond paragraph.');
  });

  it('appended list item joins the existing list correctly', () => {
    const source = '## Tasks\n\n- [ ] first\n- [ ] second\n';
    const doc = Nodiom.fromString(source);
    doc.append('## Tasks', '- [ ] third');
    const items = doc.readList('## Tasks');
    expect(items).toHaveLength(3);
    expect(items[2]).toContain('third');
  });
});

describe('regression: write(sel, read(sel)) does not duplicate heading', () => {
  it('re-writing read content does not embed the heading twice', () => {
    const source = '## Summary\n\nOriginal content.\n';
    const doc = Nodiom.fromString(source);
    const readResult = doc.read('## Summary');
    doc.write('## Summary', readResult);
    // Heading should appear exactly once
    const headingMatches = doc.toString().match(/## Summary/g);
    expect(headingMatches).toHaveLength(1);
  });
});
