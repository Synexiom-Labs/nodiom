# nodiom

**Structured reads and writes for Markdown.**

[![npm version](https://img.shields.io/npm/v/@synexiom-labs%2Fnodiom)](https://www.npmjs.com/package/@synexiom-labs/nodiom)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![test](https://img.shields.io/github/actions/workflow/status/Synexiom-Labs/nodiom/test.yml?label=tests)](https://github.com/Synexiom-Labs/nodiom/actions)

Give AI agents a reliable way to work with the structure of your documents, without brittle string manipulation.

Nodiom reads and edits Markdown as a tree. Headings are branches; lists, paragraphs, tables and code blocks are nodes. You address them with path-like selectors, the way you'd query a DOM, and change one without rewriting, or breaking, the rest of the file.

---

## Three ways to use it

| | What it is | Where |
|---|---|---|
| **The library** (this repo) | Structural read/write for Markdown in Node.js, on files or strings | `npm install @synexiom-labs/nodiom` |
| **nodiom-mcp** | An MCP server that gives AI agents these operations on your local Markdown files | [Synexiom-Labs/nodiom-mcp](https://github.com/Synexiom-Labs/nodiom-mcp) |
| **Nodiom Cloud** | Hosted: shared state across agents and people. One board where AI agents hand in finished work and the people supervising them approve it or send it back | [nodiom.md](https://www.nodiom.md/?utm_source=github&utm_medium=readme) |

Structured state inside Markdown, here; shared state across agents and people, in Cloud. All three use the same engine and the same selectors.

---

## The problem

When an AI agent, or any program, needs to change a Markdown document, it usually loads the whole file as a string, finds the right section with a regex, splices in new text, and hopes the formatting survived. Two writers at once, and one of them silently loses.

Nodiom treats Markdown as what it is: a tree. You say *where* (`# Project > ## Tasks > li[contains="c_7f3a"]`) and *what* (read, write, append, delete), and nothing outside that node changes.

---

## Quick example

```typescript
import { Nodiom } from '@synexiom-labs/nodiom';

const doc = await Nodiom.fromFile('./project.md', { lock: true });

// Read everything under a heading (the heading line itself isn't included)
const summary = doc.read('# Project > ## Summary');

// Add a task
doc.append('# Project > ## Tasks', '- [ ] Deploy to staging');

// Tick it, addressed by its text rather than its position
doc.write('# Project > ## Tasks > li[contains="Deploy to staging"]', '- [x] Deploy to staging');

// Remove the first finished item
doc.delete('# Project > ## Done > li[0]');

// Write back to disk and release the lock
await doc.save();
```

---

## Install

```bash
npm install @synexiom-labs/nodiom
```

**Requirements:** Node.js 18+

---

## Selectors

A selector is a `" > "`-separated path of segments, each matching a node in the document's structure.

### Heading segments

```
"# Project Alpha"              → The H1 "Project Alpha" and all its content
"## Tasks"                     → A top-level H2 named "Tasks"
"# Project Alpha > ## Tasks"   → The H2 "Tasks" nested under H1 "Project Alpha"
```

The number of `#` characters must match the heading's depth in the document.

**Scope.** "Content under `## Tasks`" means everything after that heading until the next heading of the same or a higher level, which is how you'd read it.

**Duplicate headings.** If the same heading appears more than once in a scope, a bare segment is ambiguous and throws `AmbiguousSelectorError`; nodiom never silently picks the first. Qualify it with its parent heading, or address one by index, zero-based and negative-capable like `li[n]`:

```
"# Doc > ## Notes[0]"    → The first "## Notes" under "# Doc"
"# Doc > ## Notes[1]"    → The second
"# Doc > ## Notes[-1]"   → The last
```

The index must sit directly against the text. `"## References [1]"`, with a space, is matched as a literal heading, and a heading that genuinely reads `Tasks[1]` is always tried literally first.

**Frontmatter.** A YAML (`---`) or TOML (`+++`) block at the top of a document is recognised as frontmatter. It never appears in `tree()`, can't be addressed by a selector, and is left byte-identical by every edit.

### Element segments

```
"## Tasks > li[0]"     → First list item under ## Tasks
"## Tasks > li[-1]"    → Last list item (negative indexing)
"## Notes > p[0]"      → First paragraph under ## Notes
"## Arch > table[0]"   → First table under ## Arch
"## Arch > code[0]"    → First code block under ## Arch
```

Element types: `p`, `li`, `code`, `blockquote`, `table`, `hr`.

### Content segments

An index is a position, not an identity. If another writer appends to the same section between the moment you compute `li[2]` and the moment you write to it, that index now points at a different node, and the write lands on the wrong one, silently.

Whenever more than one writer touches a document, address by content instead:

```
'## In Progress > li[contains="c_7f3a"]'   → The list item whose text contains "c_7f3a"
"## Notes > p[contains='TODO']"            → The paragraph containing "TODO"
```

The substring is matched against the node's own source text and must match **exactly one** node in scope. Matching several throws `AmbiguousSelectorError` rather than picking the first: silently editing one of several candidates is the failure this exists to prevent.

---

## API

### Loading

```typescript
// From a file
const doc = await Nodiom.fromFile('./wiki.md');

// From a file, with an advisory lock (see Concurrency)
const doc = await Nodiom.fromFile('./wiki.md', { lock: true, lockTimeout: 5000 });

// From a string: no filesystem, safe for serverless
const doc = Nodiom.fromString(markdown);
```

### Reading

```typescript
// The Markdown under a selector. For a heading, its body without the heading
// line, so write(sel, read(sel)) changes nothing.
const content: string = doc.read('# Project > ## Summary');

// Each list item's source under a selector, marker and nested lines included:
// ['- [ ] Task A', '- [x] Task B\n  - [x] sub-step']
const items: string[] = doc.readList('# Project > ## Tasks');

// Whether a location exists, and what it is
const info = doc.query('# Project > ## Tasks');
// { exists: true, type: 'heading', depth: 2, childCount: 7, index: 3 }

// The heading outline
const outline = doc.tree();
// [{ heading: 'Project', depth: 1, children: [{ heading: 'Tasks', depth: 2, children: [] }] }]
```

### Changing

Mutations return `this`, so they chain.

```typescript
// Replace the body of a section; the heading is kept
doc.write('# Project > ## Summary', 'On track for Q3.');

// Replace one list item. Text without its own bullet keeps the item's marker
// and checkbox: this stays "- [ ] Final review (Friday)"
doc.write('## Tasks > li[contains="Final review"]', 'Final review (Friday)');

// Add after the last node in a section, separated by a blank line
doc.append('# Project > ## Tasks', '- [ ] Task C');

// Remove a node, or a heading together with its whole section
doc.delete('# Project > ## Done > li[0]');

doc
  .append('# Project > ## Tasks', '- [ ] Task D')
  .delete('# Project > ## Done > li[-1]');
```

Your content is inserted as written (only trimmed), never re-serialized, and everything you didn't address is left byte-for-byte as it was.

### Saving

```typescript
const markdown: string = doc.toString();

await doc.save();               // write back to the original file, release any lock
await doc.saveAs('./out.md');   // write to a new file (keeps the original lock)
await doc.unlock();             // release the lock explicitly
```

### Errors

```typescript
import {
  NodiomError,            // base class of the errors below
  SelectorNotFoundError,  // nothing matched; .suggestions has near misses
  SelectorParseError,     // the selector itself is malformed
  AmbiguousSelectorError, // more than one node matched
  LockError,              // couldn't get the file lock in time
} from '@synexiom-labs/nodiom';

try {
  doc.read('# Project > ## Taks'); // typo
} catch (e) {
  if (e instanceof SelectorNotFoundError) {
    console.log(e.selector);     // "# Project > ## Taks"
    console.log(e.suggestions);  // ["Tasks"]
  }
}
```

---

## Fidelity

A structural editor is only useful if it doesn't damage what it doesn't touch. Nodiom edits the source text at the node's exact position rather than re-printing the document, so formatting, spacing, list markers and escaping outside the edited node stay as they were. On a sample of 2,369 real-world Markdown files (an early user's own notes), every file round-trips byte-identically.

---

## Use it from AI agents

### On your own machine: nodiom-mcp

[nodiom-mcp](https://github.com/Synexiom-Labs/nodiom-mcp) exposes these operations as MCP tools (`nodiom_tree`, `nodiom_read`, `nodiom_read_list`, `nodiom_query`, `nodiom_write`, `nodiom_append`, `nodiom_delete`) for Claude Code, Claude Desktop, Cursor or any MCP client, on Markdown files on your disk.

```bash
claude mcp add -s user nodiom -- npx -y @synexiom-labs/nodiom-mcp
```

### Across machines, agents and people: Nodiom Cloud

When agents run on different machines, or come from different vendors, they need one place to share state. [Nodiom Cloud](https://www.nodiom.md/?utm_source=github&utm_medium=readme) is that place, built on this engine:

- **Shared documents** that several agents edit at once without overwriting each other.
- **Boards**: columns are headings and cards are checklist items, so a board is a Markdown document you can read anywhere. Agents claim a card in one atomic move, so two never take the same task.
- **A human review step.** Agents hand finished work to a review column and stop. A person approves it or sends it back with a note the agent reads, and agents can't skip it.
- **Attribution and alerts.** Every write is attributed to the agent that made it, and review alerts go out by email, Slack or Discord.

Connect from Claude, ChatGPT, Cursor or VS Code by adding one address and signing in, with no key to copy:

```
https://api.nodiom.md/mcp
```

There's a free plan. Setup for each app is at [nodiom.md](https://www.nodiom.md/?utm_source=github&utm_medium=readme#connect), and the full tool reference is in the [docs](https://app.nodiom.md/docs).

---

## Concurrency

On one machine, nodiom takes an advisory file lock via [`proper-lockfile`](https://github.com/moxystudio/node-proper-lockfile). `fromFile` acquires the lock *before* reading, so two processes can't both read the old version and overwrite each other.

```typescript
const doc = await Nodiom.fromFile('./shared-wiki.md', { lock: true });
// Other nodiom processes locking this file wait, or throw LockError after lockTimeout

doc.append('## Log', `- ${new Date().toISOString()} Agent B finished the task`);
await doc.save(); // writes and releases the lock
```

The lock covers Node.js processes on the **same machine**. Across machines or serverless functions, use [Nodiom Cloud](https://www.nodiom.md/?utm_source=github&utm_medium=readme), where every write runs under a database row lock on the document.

---

## Comparison

| Approach | Structured reads? | Structural writes? | Round-trip fidelity | Serverless | Concurrent |
|---|---|---|---|---|---|
| `fs.readFile` + regex | No | Fragile | Depends on the regex | No | No |
| `gray-matter` | Frontmatter only | Frontmatter only | Yes | Yes | No |
| Databases | No | No | No (loses the Markdown) | Yes | Yes |
| Vector DBs | Semantic only | No | No | Yes | Yes |
| **nodiom** | **Yes** | **Yes** | **Yes** | **Yes** (`fromString`) | **Same machine** |
| **Nodiom Cloud** | **Yes** | **Yes** | **Yes** | **Yes** | **Across machines** |

---

## Roadmap

Planned, in no fixed order:

- `insert()` with positional control: before or after a sibling node.
- `diff()`: a structural diff between two versions of a document.
- Glob heading selectors (`## *Tasks*`).
- **1.0**: stable selector syntax and API.

Releases are listed in the [CHANGELOG](./CHANGELOG.md).

---

## Contributing

Contributions are welcome. Please open an issue before a PR for non-trivial changes.

```bash
git clone https://github.com/Synexiom-Labs/nodiom
cd nodiom
npm install
npm test
```

---

## License

MIT — [Synexiom Labs Inc.](https://synexiomlabs.com)

*Born from the state layer powering Cortexiom's reasoning architecture.*
