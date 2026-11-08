/** Split user input into lower-case word tokens (letters and digits, any script). */
export function tokenize(input: string): string[] {
  return input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * Build a safe FTS5 MATCH expression: every token quoted (so operators and
 * punctuation in user input are inert) and prefix-matched, all required.
 */
export function toFtsQuery(input: string): string | undefined {
  const tokens = tokenize(input);
  return tokens.length ? tokens.map((t) => `"${t}"*`).join(' ') : undefined;
}

/** Fallback matcher with the same semantics (every token prefixes some word). */
export function matchesAllTokens(text: string, tokens: readonly string[]): boolean {
  const words = tokenize(text);
  return tokens.every((t) => words.some((w) => w.startsWith(t)));
}
