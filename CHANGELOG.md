# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.3.1] - 2026-10-04

### Fixed

- `write()` to a list item keeps it a list item. Content written without its own bullet now keeps the item's original marker (and checkbox, if it had one), the way a heading write keeps the heading. Before, the item became a paragraph that swallowed the next item, and the selector stopped matching. Found in a real multi-agent run.

---

## [0.3.0] - 2026-09-30

Both fixes in this release were reported by an early user who ran nodiom across 1,560 of their own notes. Thank you.

### Fixed
- **YAML and TOML frontmatter is no longer parsed as a heading.** The closing `---` of a frontmatter block reads as a setext heading underline, so a note's properties surfaced in `tree()` as a heading called `title: …` — one a selector could target, and a `delete()` would destroy, taking the note's properties with it. Frontmatter now parses as its own node via `remark-frontmatter`: never a heading, never inside a heading's scope, and left byte-identical by every edit. Measured on 845 real Markdown files that begin with frontmatter: 0.2.0 exposed the properties as a heading in all 845; 0.3.0 in none. All 2,369 files in that sample still round-trip byte-identically.

### Changed
- **BREAKING: a heading that appears more than once in a scope is now ambiguous.** Previously the first match won, silently — so an edit meant for the second `## Notes` landed on the first. It now throws `AmbiguousSelectorError`, the same rule content selectors already follow. Selectors whose headings are unique in scope are unaffected.
- `AmbiguousSelectorError` accepts an optional hint, so its message explains how to disambiguate for the kind of selector that failed.

### Added
- **Indexed heading segments** — `## Notes[1]` addresses the second of several `## Notes`, zero-based and negative-capable like `li[n]`. The index must sit directly against the text: `## References [1]`, with a space, stays a literal heading, and literal text is always tried first.

[0.3.0]: https://github.com/Synexiom-Labs/nodiom/compare/v0.2.0...v0.3.0

---

## [0.2.0] - 2026-09-17

### Added
- **Content-addressed element selectors** — `li[contains="c_7f3a"]` matches a list item by a substring of its own source text instead of by position. Positional selectors (`li[0]`) are only valid for as long as nothing before them changes; a second writer appending to the same scope silently shifts them. Content selectors survive concurrent edits, which makes them the correct choice whenever more than one agent writes to a document.
- `AmbiguousSelectorError`, thrown when a content selector matches more than one node. Matching several and picking the first would reintroduce exactly the class of bug this feature prevents, so ambiguity is an error.

### Changed
- Internal `ElementSegment` now carries a discriminated `match` field (`{ by: 'index', index }` or `{ by: 'contains', text }`) rather than a bare `index`. This type is not part of the public API; `parseSelector` output shape changes for anyone reaching into internals.

[0.2.0]: https://github.com/Synexiom-Labs/nodiom/compare/v0.1.2...v0.2.0

---

## [0.1.2] - 2026-06-12

### Fixed
- **Lock acquired before read** — `fromFile()` now acquires the advisory lock before reading the file, closing the race window where two processes could clobber each other's writes
- **`read()` returns body only for heading selectors** — previously included the heading line, causing `write(sel, read(sel))` to duplicate the heading; now returns body content only, consistent with what `write()` expects
- **`append()` blank line separator** — changed from `\n` to `\n\n` so appended paragraphs are correctly separated rather than merged into the preceding block
- **`normalizeContent()` no longer re-serializes user content** — remark-stringify was silently corrupting content: `- [ ]` task list markers became `* [ ]`, underscores in filenames were escaped. User content is now used as-is (trimmed only)

### Added
- Regression test suite (`tests/regression.test.ts`) covering all four fixes with exact assertions

[0.1.2]: https://github.com/Synexiom-Labs/nodiom/compare/v0.1.1...v0.1.2

---

## [0.1.1] - 2026-04-07

### Fixed
- npm version badge URL — encode `%2F` for scoped package name so shields.io resolves correctly

---

## [0.1.0] - 2026-04-06

### Added
- `Nodiom.fromFile(path, options?)` — load a document from disk with optional advisory file locking
- `Nodiom.fromString(content)` — load a document from a string (serverless-safe)
- `doc.read(selector)` — extract Markdown content at a structural location
- `doc.readList(selector)` — extract list items as a string array
- `doc.write(selector, content)` — replace content at a structural location
- `doc.append(selector, content)` — append content after the last child at a location
- `doc.delete(selector)` — remove a node or section
- `doc.query(selector)` — return structural metadata about a location
- `doc.tree()` — return the full heading outline of the document
- `doc.toString()` — serialize the document back to a Markdown string
- `doc.save()` — write to the original file and release any lock
- `doc.saveAs(path)` — write to a new file
- `doc.unlock()` — explicitly release an advisory file lock
- Selector syntax: heading segments (`# H1 > ## H2`), element segments (`li[0]`, `p[-1]`), negative indexing
- `SelectorNotFoundError` with fuzzy-match suggestions ("Did you mean '## Tasks'?")
- `SelectorParseError` for malformed selector strings
- `LockError` for advisory lock failures
- GFM support (tables, task list checkboxes) via `remark-gfm`
- Roundtrip fidelity — untouched sections are never re-serialized, byte-identical output guaranteed
- 53 tests across selector parsing, read, write, roundtrip, and edge cases
- GitHub Actions CI on Node.js 20, 22, and 24

[0.1.1]: https://github.com/Synexiom-Labs/nodiom/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Synexiom-Labs/nodiom/releases/tag/v0.1.0
