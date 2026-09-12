import bcrypt from "bcryptjs";

/**
 * Password policy and hashing [BR-06, BR-07, AC-19].
 *
 * The single most important property here is that `normalizePassword` is the
 * only place a password is ever trimmed, and it is applied on both the setting
 * path and the verifying path. A password stored after a trim that login did
 * not repeat would lock its owner out permanently with no way back.
 */

/** bcryptjs cost, inside the 10-12 range BR-06 permits [D19]. */
const BCRYPT_COST = 10;

/** Marker written by the Lab 3 migration for accounts the seed has not reached. */
export const PLACEHOLDER_PASSWORD_HASH = "MIGRATED_PENDING_SEED";

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignores input past 72 bytes, so a longer password is a silent trap. */
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRuleId =
  | "minLength"
  | "maxBytes"
  | "uppercase"
  | "lowercase"
  | "digit"
  | "special";

type PasswordRule = {
  id: PasswordRuleId;
  issue: string;
  satisfiedBy: (password: string) => boolean;
};

const RULES: PasswordRule[] = [
  {
    id: "minLength",
    issue: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    satisfiedBy: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "maxBytes",
    issue: `Password must be at most ${PASSWORD_MAX_BYTES} bytes`,
    satisfiedBy: (password) =>
      Buffer.byteLength(password, "utf8") <= PASSWORD_MAX_BYTES,
  },
  {
    id: "uppercase",
    issue: "Password must contain an upper case letter",
    satisfiedBy: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    issue: "Password must contain a lower case letter",
    satisfiedBy: (password) => /[a-z]/.test(password),
  },
  {
    id: "digit",
    issue: "Password must contain a digit",
    satisfiedBy: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    issue: "Password must contain a special character",
    satisfiedBy: (password) => /[^a-zA-Z0-9]/.test(password),
  },
];

export type PasswordFailure = {
  field: "newPassword";
  rule: PasswordRuleId;
  issue: string;
};

export type PasswordValidation = {
  valid: boolean;
  password: string;
  failures: PasswordFailure[];
};

/**
 * The one trim in the system. Applied identically when a password is set and
 * when it is verified [BR-07].
 */
export function normalizePassword(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function validatePassword(raw: unknown): PasswordValidation {
  const password = normalizePassword(raw);
  const failures = RULES.filter((rule) => !rule.satisfiedBy(password)).map(
    (rule) => ({
      field: "newPassword" as const,
      rule: rule.id,
      issue: rule.issue,
    })
  );
  return { valid: failures.length === 0, password, failures };
}

export async function hashPassword(raw: unknown): Promise<string> {
  return bcrypt.hash(normalizePassword(raw), BCRYPT_COST);
}

/**
 * A stored hash is usable only if bcrypt produced it. Migrated accounts carry a
 * placeholder until the seed runs, and comparing against that must be a plain
 * negative rather than a thrown error, so an unseeded account fails login the
 * same generic way every other bad credential does [BR-01].
 */
export function isUsablePasswordHash(hash: string | null | undefined): boolean {
  return typeof hash === "string" && /^\$2[aby]?\$/.test(hash);
}

export async function verifyPassword(
  raw: unknown,
  hash: string | null | undefined
): Promise<boolean> {
  if (!isUsablePasswordHash(hash)) {
    return false;
  }
  return bcrypt.compare(normalizePassword(raw), hash as string);
}
