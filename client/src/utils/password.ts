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

export type PasswordRuleId = "length" | "letterCase" | "digit" | "special";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  isMet: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    isMet: (password) => password.trim().length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letterCase",
    label: "Includes upper and lower case letters",
    isMet: (password) => /[A-Z]/.test(password) && /[a-z]/.test(password),
  },
  {
    id: "digit",
    label: "Includes a number",
    isMet: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "Includes a special character",
    isMet: (password) => /[^a-zA-Z0-9]/.test(password),
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
