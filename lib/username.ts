// Consecutive and trailing hyphens are allowed because older GitHub accounts have them.
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/;

export function isValidUsername(value: unknown): value is string {
  return typeof value === "string" && USERNAME_PATTERN.test(value);
}

export function normalizeUsername(username: string): string {
  return username.toLowerCase();
}

/** Returns a message describing the problem, or null when the value is usable. */
export function usernameProblem(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Enter a GitHub username.";
  if (trimmed.length > 39) return "GitHub usernames have at most 39 characters.";
  if (trimmed.startsWith("-")) return "GitHub usernames can't start with a hyphen.";
  if (!USERNAME_PATTERN.test(trimmed)) {
    return "GitHub usernames contain only letters, numbers and hyphens.";
  }
  return null;
}
