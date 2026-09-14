/**
 * Per-email failed-login throttle [FR-29, BR-21, D13, AC-20].
 *
 * Held in server memory and self-expiring, so there is no persisted lockout
 * state and therefore no unlock workflow to build -- account unlocking is
 * excluded from Lab 3 (specification section 4.2).
 *
 * The clock is injectable and `reset` exists purely as a test seam. Every
 * failed-login test shares one in-process app, so a module-level counter with
 * no way to clear it would let the invalid-credentials tests silently push the
 * throttle test over its limit before it ran a single request of its own.
 */

export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Sweep threshold: keeps an abandoned key set from growing without bound. */
const SWEEP_AT_KEYS = 1000;

export type Clock = () => number;

export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();
  private now: Clock;

  constructor(clock: Clock = () => Date.now()) {
    this.now = clock;
  }

  private static key(email: string): string {
    return email.trim().toLowerCase();
  }

  private recent(key: string): number[] {
    const cutoff = this.now() - LOGIN_WINDOW_MS;
    const kept = (this.failures.get(key) ?? []).filter(
      (stamp) => stamp > cutoff
    );
    if (kept.length) {
      this.failures.set(key, kept);
    } else {
      this.failures.delete(key);
    }
    return kept;
  }

  private sweep(): void {
    if (this.failures.size < SWEEP_AT_KEYS) {
      return;
    }
    for (const key of [...this.failures.keys()]) {
      this.recent(key);
    }
  }

  /**
   * Atomic admission for the login route [BR-21, AC-20].
   *
   * The check and the reservation happen synchronously with no await between
   * them, so six parallel failures cannot all observe "four so far" and all
   * answer 401. The reservation IS the failure record: the caller keeps it on
   * a credential failure, clears it on success, and withdraws it when the
   * attempt never reached a verdict (DB/config fault).
   */
  tryAdmit(email: string): boolean {
    const key = LoginThrottle.key(email);
    const kept = this.recent(key);
    if (kept.length >= LOGIN_FAILURE_LIMIT) {
      return false;
    }
    kept.push(this.now());
    this.failures.set(key, kept);
    this.sweep();
    return true;
  }

  /**
   * Withdraws the reservation `tryAdmit` just made, for the path where the
   * login attempt never reached a credential verdict (a rejected Prisma call).
   * A database fault is not a failed login and must not consume throttle
   * budget.
   */
  cancelAdmission(email: string): void {
    const key = LoginThrottle.key(email);
    const kept = this.recent(key);
    kept.pop();
    if (kept.length) {
      this.failures.set(key, kept);
    } else {
      this.failures.delete(key);
    }
  }

  /** A successful login clears that email's counter (api-spec section 2). */
  clear(email: string): void {
    this.failures.delete(LoginThrottle.key(email));
  }

  /** Test-only seam. */
  reset(clock: Clock = () => Date.now()): void {
    this.failures.clear();
    this.now = clock;
  }
}

export const loginThrottle = new LoginThrottle();
