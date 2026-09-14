/**
 * The live password checklist [BR-07, D6, ui-spec section 4].
 *
 * Four rules, matching the handout mockup exactly: the server's upper-case and
 * lower-case checks are shown here as one line, because that is what the
 * mockup displays and because a user typing a password thinks in terms of
 * "letters of both cases", not two separate requirements.
 *
 * This is a mirror of the server policy, never a replacement for it. The server
 * validates independently and its answer is the one that decides.
 */

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores input past 72 bytes, so a longer password is a silent trap. Mirrors the server's PASSWORD_MAX_BYTES. */
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRuleId =
  | "length"
  | "letterCase"
  | "digit"
  | "special"
  | "maxBytes";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  isMet: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    // Trimmed first, like the server: surrounding whitespace is stripped
    // before any rule is evaluated, so it never counts toward length.
    isMet: (password) =>
      normalizePassword(password).length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letterCase",
    label: "Includes upper and lower case letters",
    isMet: (password) => {
      const trimmed = normalizePassword(password);
      return /[A-Z]/.test(trimmed) && /[a-z]/.test(trimmed);
    },
  },
  {
    id: "digit",
    label: "Includes a number",
    isMet: (password) => /[0-9]/.test(normalizePassword(password)),
  },
  {
    id: "special",
    label: "Includes a special character",
    // Evaluated after the trim: a trailing space is not a special character
    // the server would accept, since the server trims before validating.
    isMet: (password) => /[^a-zA-Z0-9]/.test(normalizePassword(password)),
  },
  {
    id: "maxBytes",
    label: `At most ${PASSWORD_MAX_BYTES} bytes`,
    // UTF-8 byte length of the trimmed value, mirroring the server's
    // Buffer.byteLength check. TextEncoder works in the browser where Buffer
    // does not.
    isMet: (password) =>
      new TextEncoder().encode(normalizePassword(password)).length <=
      PASSWORD_MAX_BYTES,
  },
];

export function unmetPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.isMet(password));
}

export function isPasswordCompliant(password: string): boolean {
  return unmetPasswordRules(password).length === 0;
}

/**
 * The same trim the server applies when it stores and when it verifies
 * (BR-07). Doing it here too means the checklist agrees with the answer the
 * server will give, rather than ticking a rule the server then rejects.
 */
export function normalizePassword(password: string): string {
  return password.trim();
}
