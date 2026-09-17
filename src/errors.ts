/** Base class for all Nodiom errors. */
export class NodiomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NodiomError';
  }
}

/** Thrown when a selector does not match any node in the document. */
export class SelectorNotFoundError extends NodiomError {
  readonly selector: string;
  readonly suggestions: string[];

  constructor(selector: string, suggestions: string[] = []) {
    const hint =
      suggestions.length > 0
        ? ` Did you mean: ${suggestions.map((s) => `'${s}'`).join(', ')}?`
        : '';
    super(`Selector not found: '${selector}'.${hint}`);
    this.name = 'SelectorNotFoundError';
    this.selector = selector;
    this.suggestions = suggestions;
  }
}

/**
 * Thrown when a content selector matches more than one node.
 *
 * Addressing by content is only safe if it is unambiguous, so this is an error
 * rather than a first-match-wins: silently editing one of several candidates is
 * exactly the class of bug content addressing exists to prevent.
 */
export class AmbiguousSelectorError extends NodiomError {
  readonly selector: string;
  readonly matchCount: number;

  constructor(selector: string, matchCount: number) {
    super(
      `Selector '${selector}' matched ${matchCount} nodes — a content selector must match exactly one. ` +
        `Use a longer or more distinctive substring.`,
    );
    this.name = 'AmbiguousSelectorError';
    this.selector = selector;
    this.matchCount = matchCount;
  }
}

/** Thrown when a selector string cannot be parsed. */
export class SelectorParseError extends NodiomError {
  readonly selector: string;

  constructor(selector: string, reason: string) {
    super(`Invalid selector '${selector}': ${reason}`);
    this.name = 'SelectorParseError';
    this.selector = selector;
  }
}

/** Thrown when an advisory file lock cannot be acquired or released. */
export class LockError extends NodiomError {
  readonly filePath: string;

  constructor(filePath: string, reason: string) {
    super(`Lock error on '${filePath}': ${reason}`);
    this.name = 'LockError';
    this.filePath = filePath;
  }
}
