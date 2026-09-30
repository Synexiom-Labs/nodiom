import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';
import { AmbiguousSelectorError, SelectorNotFoundError } from '../src/errors.js';

/*
 * Both cases here were reported by an early user who ran nodiom across 1,560 of
 * their own notes. The inputs are theirs in shape: a note with YAML properties,
 * and a note with the same heading twice.
 */

function flatOutline(doc: Nodiom): string[] {
  const out: string[] = [];
  const walk = (nodes: ReturnType<Nodiom['tree']>): void => {
    for (const n of nodes) {
      out.push(`${'#'.repeat(n.depth)} ${n.heading}`);
      walk(n.children);
    }
  };
  walk(doc.tree());
  return out;
}

const YAML_NOTE = `---
title: Weekly review
tags: [ops, agents]
---

# Weekly review

Body text.

## Actions

- [ ] Ship the fix
`;

describe('frontmatter is never a heading', () => {
  it('does not appear in tree()', () => {
    expect(flatOutline(Nodiom.fromString(YAML_NOTE))).toEqual([
      '# Weekly review',
      '## Actions',
    ]);
  });

  it('cannot be addressed as a heading', () => {
    const doc = Nodiom.fromString(YAML_NOTE);
    expect(() => doc.read('## title: Weekly review\ntags: [ops, agents]')).toThrow(
      SelectorNotFoundError,
    );
  });

  it('round-trips byte-identically', () => {
    expect(Nodiom.fromString(YAML_NOTE).toString()).toBe(YAML_NOTE);
  });

  it('survives every kind of edit untouched', () => {
    const doc = Nodiom.fromString(YAML_NOTE);
    doc.append('# Weekly review > ## Actions', '- [ ] Write the changelog');
    doc.write('# Weekly review > ## Actions > li[0]', '- [x] Ship the fix');
    doc.delete('# Weekly review > ## Actions > li[-1]');
    doc.append('# Weekly review', 'Another paragraph.');

    const after = doc.toString();
    expect(after.startsWith('---\ntitle: Weekly review\ntags: [ops, agents]\n---\n')).toBe(true);
  });

  it('handles TOML frontmatter too', () => {
    const toml = '+++\ntitle = "Weekly review"\n+++\n\n# Weekly review\n\nBody.\n';
    const doc = Nodiom.fromString(toml);
    expect(flatOutline(doc)).toEqual(['# Weekly review']);
    expect(doc.toString()).toBe(toml);
  });

  it('still reads a setext heading that is not frontmatter', () => {
    const doc = Nodiom.fromString('# Doc\n\nIntro.\n\nSection\n-------\n\nBody.\n');
    expect(flatOutline(doc)).toEqual(['# Doc', '## Section']);
  });

  it('still treats a thematic break mid-document as a break', () => {
    const md = '# Doc\n\nAbove.\n\n---\n\nBelow.\n';
    const doc = Nodiom.fromString(md);
    expect(flatOutline(doc)).toEqual(['# Doc']);
    expect(doc.toString()).toBe(md);
  });
});

const DUP_NOTE = `# Doc

## Notes

first notes

## Other

x

## Notes

second notes
`;

describe('duplicate headings are ambiguous, not first-match', () => {
  it('throws instead of silently editing the first', () => {
    const doc = Nodiom.fromString(DUP_NOTE);
    expect(() => doc.write('# Doc > ## Notes', 'EDITED')).toThrow(AmbiguousSelectorError);
    // Nothing was changed by the rejected write.
    expect(doc.toString()).toBe(DUP_NOTE);
  });

  it('explains how to disambiguate', () => {
    const doc = Nodiom.fromString(DUP_NOTE);
    expect(() => doc.read('# Doc > ## Notes')).toThrow(/## Notes\[0\].*## Notes\[1\]/);
  });

  it('addresses each duplicate by index', () => {
    const doc = Nodiom.fromString(DUP_NOTE);
    doc.write('# Doc > ## Notes[1]', 'second, edited');
    const after = doc.toString();
    expect(after).toContain('first notes');
    expect(after).toContain('second, edited');
    expect(after).not.toContain('second notes');
  });

  it('supports negative indices', () => {
    expect(Nodiom.fromString(DUP_NOTE).read('# Doc > ## Notes[-1]')).toContain('second notes');
  });

  it('reports an out-of-range index as not found', () => {
    expect(() => Nodiom.fromString(DUP_NOTE).read('# Doc > ## Notes[2]')).toThrow(
      SelectorNotFoundError,
    );
  });

  it('leaves a unique heading unaffected', () => {
    expect(Nodiom.fromString(DUP_NOTE).read('# Doc > ## Other')).toContain('x');
  });

  it('resolves duplicates that live under different parents', () => {
    const md = '# A\n\n## Notes\n\nunder a\n\n# B\n\n## Notes\n\nunder b\n';
    const doc = Nodiom.fromString(md);
    expect(doc.read('# A > ## Notes')).toContain('under a');
    expect(doc.read('# B > ## Notes')).toContain('under b');
    // Without the parent, the same selector is ambiguous.
    expect(() => doc.read('## Notes')).toThrow(AmbiguousSelectorError);
  });

  it('keeps a literal heading that happens to end in brackets', () => {
    const md = '# Doc\n\n## References [1]\n\nsource one\n';
    expect(Nodiom.fromString(md).read('# Doc > ## References [1]')).toContain('source one');
  });

  it('prefers a literal heading over index syntax', () => {
    const md = '# Doc\n\n## Tasks[1]\n\nliteral heading\n';
    expect(Nodiom.fromString(md).read('# Doc > ## Tasks[1]')).toContain('literal heading');
  });
});
