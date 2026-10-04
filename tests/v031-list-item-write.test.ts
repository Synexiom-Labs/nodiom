import { describe, expect, it } from 'vitest';
import { Nodiom } from '../src/index.js';

// v0.3.1: writing to a list item keeps it a list item. Before, content
// written without a bullet turned the item into a paragraph that swallowed
// the next item, and the selector stopped matching.
const DOC = '# Run\n\n## Gates\n\n- GATE 1: open\n- GATE 2: open\n\n## Cards\n\n- [ ] Draft the brief <!-- nodiom: id=c_1 -->\n- [x] Ship it <!-- nodiom: id=c_2 -->\n';

describe('write to a list item', () => {
  it('keeps the bullet when the content has none', () => {
    const doc = Nodiom.fromString(DOC).write('## Gates > li[contains="GATE 1"]', 'GATE 1: waiting…');
    expect(doc.toString()).toContain('## Gates\n\n- GATE 1: waiting…\n- GATE 2: open\n');
    expect(doc.readList('## Gates')).toHaveLength(2);
    expect(doc.query('## Gates > li[contains="GATE 1"]').exists).toBe(true);
  });

  it('keeps the checkbox too', () => {
    const doc = Nodiom.fromString(DOC).write('## Cards > li[contains="id=c_1"]', 'Draft the brief, v2 <!-- nodiom: id=c_1 -->');
    expect(doc.toString()).toContain('- [ ] Draft the brief, v2 <!-- nodiom: id=c_1 -->\n- [x] Ship it');
  });

  it('uses the bullet and checkbox the content brings', () => {
    const doc = Nodiom.fromString(DOC).write('## Cards > li[contains="id=c_1"]', '- [x] Draft the brief <!-- nodiom: id=c_1 -->');
    expect(doc.toString()).toContain('- [x] Draft the brief <!-- nodiom: id=c_1 -->\n- [x] Ship it');
    expect(doc.readList('## Cards')).toHaveLength(2);
  });

  it('keeps an ordered marker', () => {
    const doc = Nodiom.fromString('# L\n\n1. one\n2. two\n').write('# L > li[1]', 'zwei');
    expect(doc.toString()).toBe('# L\n\n1. one\n2. zwei\n');
  });
});
