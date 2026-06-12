# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
