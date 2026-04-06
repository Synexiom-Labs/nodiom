# nodiom

**Address any node in your Markdown.**

[![npm version](https://img.shields.io/npm/v/nodiom)](https://www.npmjs.com/package/nodiom)
[![license](https://img.shields.io/npm/l/nodiom)](./LICENSE)
[![test](https://img.shields.io/github/actions/workflow/status/synexiom-labs/nodiom/test.yml?label=tests)](https://github.com/synexiom-labs/nodiom/actions)

Markdown has structure. Every tool ignores it. Nodiom doesn't.

---

## The Problem

When an AI agent or any program needs to modify a Markdown document, it loads the whole file as a string, uses fragile regex to find the right section, splices in new content, and hopes the formatting didn't break.

Nodiom solves this by treating Markdown as what it actually is: a tree. Every heading creates a branch, every list item is a node. You address them with path-like selectors — the same way you'd query a DOM node or a database row.

---

## Quick Example

```typescript
import { Nodiom } from 'nodiom';

const doc = await Nodiom.fromFile('./project-wiki.md');

// Read everything under a heading
const tasks = doc.read('# Project Alpha > ## Active Tasks');

// Add a new task
doc.append('# Project Alpha > ## Active Tasks', '- [ ] Deploy to staging');

// Remove a completed item
doc.delete('# Project Alpha > ## Completed > li[0]');

// Save back to disk
await doc.save();
```

---

## Install

```bash
npm install nodiom
```

**Requirements:** Node.js 18+

---

## Core Concepts: Selectors

A selector is a `" > "`-separated path of segments, each matching a node in the document's structure.

### Heading segments

```
"# Project Alpha"              → The H1 "Project Alpha" and all its content
"## Tasks"                     → Any top-level H2 named "Tasks"
"# Project Alpha > ## Tasks"   → The H2 "Tasks" nested under H1 "Project Alpha"
```

The depth of the `#` characters must match the heading depth in the document.

### Element segments

```
"## Tasks > li[0]"     → First list item under ## Tasks
"## Tasks > li[-1]"    → Last list item (negative indexing)
"## Notes > p[0]"      → First paragraph under ## Notes
"## Arch > table[0]"   → First table under ## Architecture
"## Arch > code[0]"    → First code block under ## Architecture
```

Valid element types: `p`, `li`, `code`, `blockquote`, `table`, `hr`

### Heading scope semantics

"Content under `## Tasks`" means all nodes that appear after the `## Tasks` heading until the next heading of equal or lesser depth. This matches how you naturally read a Markdown document.

---

## API Reference

### Initialization

```typescript
// From a file
const doc = await Nodiom.fromFile('./wiki.md');

// From a file with advisory locking (for concurrent access)
const doc = await Nodiom.fromFile('./wiki.md', { lock: true, lockTimeout: 5000 });

// From a string (no filesystem — safe for serverless)
const doc = Nodiom.fromString(markdownContent);
```

### Reading

```typescript
// Returns the Markdown string of everything under the selector
const content: string = doc.read('# Project > ## Summary');

// Returns an array of list item strings
const items: string[] = doc.readList('# Project > ## Tasks');

// Returns metadata about the location
const info = doc.query('# Project > ## Tasks');
// { exists: true, type: 'heading', depth: 2, childCount: 7, index: 3 }

// Returns the structural outline of the document
const outline = doc.tree();
// [{ heading: 'Project', depth: 1, children: [{ heading: 'Tasks', depth: 2, children: [] }] }]
```

### Mutating

All mutation methods return `this`, so they can be chained.

```typescript
// Replace all content within a section (heading is preserved)
doc.write('# Project > ## Summary', 'The project is on track for Q3.');

// Append content after the last item in a section
doc.append('# Project > ## Tasks', '- [ ] Final review');

// Remove a node
doc.delete('# Project > ## Completed > li[0]');

// Chaining
doc
  .append('# Project > ## Tasks', '- [ ] Task A')
  .append('# Project > ## Tasks', '- [ ] Task B')
  .delete('# Project > ## Completed > li[-1]');
```

### Serialization & File I/O

```typescript
// Get the current document as a Markdown string
const output: string = doc.toString();

// Write back to the original file (releases lock if held)
await doc.save();

// Write to a new file
await doc.saveAs('./output.md');

// Explicitly release a lock
await doc.unlock();
```

### Error Handling

```typescript
import { SelectorNotFoundError, SelectorParseError, LockError } from 'nodiom';

try {
  doc.read('# Project > ## Taks'); // typo
} catch (e) {
  if (e instanceof SelectorNotFoundError) {
    console.log(e.selector);     // "# Project > ## Taks"
    console.log(e.suggestions);  // ["Tasks"] — fuzzy match
  }
}
```

---

## AI Agent Example

A LangChain-style agent maintaining a project wiki:

```typescript
import { Nodiom } from 'nodiom';

async function agentUpdateWiki(wikiPath: string, taskDescription: string) {
  // Load with lock — safe for concurrent agent access on the same machine
  const doc = await Nodiom.fromFile(wikiPath, { lock: true });

  // Add a new active task
  doc.append('## Tasks > ### Active', `- [ ] ${taskDescription}`);

  // Log the current task count
  const activeTasks = doc.readList('## Tasks > ### Active');
  console.log(`Active tasks: ${activeTasks.length}`);

  // Save and release the lock
  await doc.save();
}
```

---

## Concurrency

Nodiom includes advisory file locking via [`proper-lockfile`](https://github.com/moxystudio/node-proper-lockfile).

```typescript
const doc = await Nodiom.fromFile('./shared-wiki.md', { lock: true });
// Other Nodiom processes trying to lock this file will wait or throw LockError

doc.append('## Log', `- ${new Date().toISOString()} Agent B completed task`);
await doc.save(); // writes and releases the lock
```

**Scope of the concurrency guarantee:** Advisory locking prevents corruption from multiple Node.js processes on the **same machine**. For distributed multi-agent environments (multiple machines or serverless functions), use Nodiom Cloud (coming soon) which provides true distributed concurrency with structural merge semantics.

---

## Comparison

| Approach | Structured reads? | Structural writes? | Roundtrip fidelity | Serverless | Concurrent |
|---|---|---|---|---|---|
| `fs.readFile` + regex | No | Fragile | Depends on regex | No | No |
| `gray-matter` | Frontmatter only | Frontmatter only | Yes | Yes | No |
| Databases | No | No | No (loses Markdown) | Yes | Yes |
| Vector DBs | Semantic only | No | No | Yes | Yes |
| **Nodiom** | **Yes** | **Yes** | **Yes** | **Yes** | **Single-machine** |

---

## Roadmap

- **v0.2.0** — `insert()` with positional control (`before` / `after` a sibling), `diff()` structural diffing, glob selectors (`## *Tasks*`)
- **v0.3.0** — LangChain tool wrapper, MCP server (expose Nodiom as Model Context Protocol tools)
- **v1.0.0** — Stable selector syntax, production-ready API
- **Nodiom Cloud** — Hosted API for serverless and distributed multi-agent use. Real-time sync, WebSocket subscriptions, structural merge for concurrent edits.

---

## Contributing

Contributions welcome. Please open an issue before submitting a PR for non-trivial changes.

```bash
git clone https://github.com/synexiom-labs/nodiom
cd nodiom
npm install
npm test
```

---

## License

MIT — [Synexiom Labs Inc.](https://synexiom.com)

*Born from the state layer powering Cortexiom's reasoning architecture.*
