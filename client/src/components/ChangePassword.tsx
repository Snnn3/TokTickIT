import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { PASSWORD_RULES, isPasswordCompliant } from "../utils/password";

interface ChangePasswordProps {
  onChanged: (destination: string) => void;
  /** Where to continue once the password is saved: the role landing route. */
  destination: string;
}

/**
 * The mandatory change-password gate [FR-17, AC-03, AC-19, ui-spec section 4].
 *
 * The checklist updates as the user types and Save stays disabled until every
 * rule and the confirmation pass, so the form cannot be submitted into a
 * rejection the screen already knew about. The server validates independently
 * regardless; this is guidance, not enforcement.
 */
export function ChangePassword({
  onChanged,
  destination,
}: ChangePasswordProps) {
  const { user, signOut, applyUser } = useAuth();
  const firstLogin = user?.mustChangePassword ?? false;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rulesPass = isPasswordCompliant(newPassword);
  const confirmationMatches =
    confirmPassword.length > 0 && confirmPassword === newPassword;
  const currentSupplied = firstLogin || currentPassword.trim().length > 0;
  const canSubmit =
    rulesPass && confirmationMatches && currentSupplied && !busy;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setBanner(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(firstLogin ? {} : { currentPassword }),
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = Array.isArray(data?.error?.details)
          ? data.error.details
              .map((item: { issue: string }) => item.issue)
              .join(" ")
          : "";
        setBanner(
          detail ||
            data?.error?.message ||
            "The password could not be changed. Please try again."
        );
        return;
      }

      if (user) {
        applyUser({ ...user, mustChangePassword: false });
      }
      onChanged(destination);
    } catch {
      setBanner(
        "Unable to reach the server. Please check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center py-5 px-3"
      style={{ minHeight: "100vh", background: "var(--zg-page-bg)" }}
    >
      <div className="zg-auth-card" data-testid="change-password-card">
        <h1 className="h4 mb-1" style={{ color: "var(--zg-primary)" }}>
          Change your password
        </h1>
        <p className="text-muted mb-4">
          {firstLogin
            ? "You must change your password to continue."
            : "Choose a new password for your account."}
        </p>

        {banner && (
          <div
            className="alert alert-danger py-2"
            role="alert"
            aria-live="polite"
            data-testid="change-password-error"
          >
            {banner}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit}>
          {!firstLogin && (
            <div className="mb-3">
              <label className="form-label" htmlFor="current-password">
                Current password <span className="text-danger">*</span>
              </label>
              <input
                autoComplete="current-password"
                className="form-control"
                disabled={busy}
                id="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </div>
          )}

          <div className="mb-3">
            <label className="form-label" htmlFor="new-password">
              New password <span className="text-danger">*</span>
            </label>
            <input
              autoComplete="new-password"
              className="form-control"
              disabled={busy}
              id="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              value={newPassword}
            />
          </div>

          <ul
            aria-live="polite"
            className="zg-password-checklist"
            data-testid="password-checklist"
          >
            {PASSWORD_RULES.map((rule) => {
              const met = rule.isMet(newPassword);
              return (
                <li
                  className={met ? "is-met" : "is-unmet"}
                  data-met={met ? "true" : "false"}
                  data-testid={`password-rule-${rule.id}`}
                  key={rule.id}
                >
                  <span aria-hidden="true" className="zg-checklist-icon">
                    {met ? "✓" : "○"}
                  </span>
                  {rule.label}
                  <span className="visually-hidden">
                    {met ? " (met)" : " (not met)"}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mb-4">
            <label className="form-label" htmlFor="confirm-password">
              Confirm new password <span className="text-danger">*</span>
            </label>
            <input
              autoComplete="new-password"
              className="form-control"
              disabled={busy}
              id="confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              value={confirmPassword}
            />
            {confirmPassword.length > 0 && !confirmationMatches && (
              <div className="invalid-feedback d-block">
                Confirmation does not match the new password
              </div>
            )}
          </div>

          <button
            className="btn btn-zen-primary w-100"
            disabled={!canSubmit}
            type="submit"
          >
            {busy ? "Saving..." : "Save new password"}
          </button>
        </form>

        {/* Always available, so a user who cannot meet the rules right now is
            never trapped on this screen with no way out. */}
        <button
          className="btn btn-link w-100 mt-3"
          disabled={busy}
          onClick={() => signOut()}
          type="button"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
