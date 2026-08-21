const MAX_USERNAME_LENGTH = 10;

function toAsciiLower(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function buildCandidate(firstName: string, code: string): string {
  const maxFirstNameLength = Math.max(MAX_USERNAME_LENGTH - 1 - code.length, 1);
  const truncatedFirstName = firstName.slice(0, maxFirstNameLength);
  return `${truncatedFirstName}.${code}`;
}

/**
 * Generates a unique username from an English full name, e.g.
 * "Apirak Jaisue" -> "apirak.ja". On collision, the second character of the
 * two-letter surname code advances through the surname ("ja" -> "ji" -> "js"
 * for surname "jaisue"), keeping the surname's first letter fixed. Once the
 * surname is exhausted, falls back to a numeric suffix on the original code
 * ("apirak.ja2", "apirak.ja3", ...). Total length is always capped at 10
 * characters by truncating the first-name portion, never the code.
 */
export async function generateUsername(
  fullNameEn: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  const parts = fullNameEn.trim().split(/\s+/);
  const firstNameRaw = parts[0] ?? "";
  const surnameRaw = parts.slice(1).join("");

  const firstName = toAsciiLower(firstNameRaw) || "user";
  const surname = toAsciiLower(surnameRaw);

  const firstLetter = surname[0] ?? "x";
  const baseCode = surname.length > 0 ? firstLetter + (surname[1] ?? firstLetter) : "xx";

  // Attempt 1: the natural "firstname.xx" code.
  let candidate = buildCandidate(firstName, baseCode);
  if (!(await isTaken(candidate))) return candidate;

  // Phase 1: advance the second character through the rest of the surname
  // (position 2 onward — positions 0 and 1 were already used in baseCode).
  for (let i = 2; i < surname.length; i++) {
    candidate = buildCandidate(firstName, firstLetter + surname[i]);
    if (!(await isTaken(candidate))) return candidate;
  }

  // Phase 2: surname exhausted, still colliding — numeric suffix fallback.
  for (let n = 2; n < 1000; n++) {
    candidate = buildCandidate(firstName, `${baseCode}${n}`);
    if (!(await isTaken(candidate))) return candidate;
  }

  // Astronomically unlikely, but keep the function total.
  throw new Error("Could not generate a unique username");
}

/**
 * Resolves a collision on an *admin-supplied* username (e.g. from the
 * roster import, where the file already specifies a username rather than
 * asking us to derive one) by appending a numeric suffix — truncating the
 * base itself if it's already at the 10-character cap, so "thirapo.ka"
 * (10 chars) colliding becomes "thirapo.k2" (still 10 chars), not
 * "thirapo.ka2" (11, over the limit).
 */
export async function makeUniqueUsername(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  if (!(await isTaken(base))) return base;

  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const maxBaseLength = Math.max(MAX_USERNAME_LENGTH - suffix.length, 1);
    const candidate = base.slice(0, maxBaseLength) + suffix;
    if (!(await isTaken(candidate))) return candidate;
  }

  throw new Error("Could not generate a unique username");
}
