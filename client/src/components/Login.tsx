import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLE_LANDING } from "../types/auth";

interface LoginProps {
  /** Where to go on success; the caller resolves the role landing route. */
  onSignedIn: (destination: string) => void;
}

/**
 * Sign-in screen [FR-16, AC-01, AC-02, ui-spec section 3].
 *
 * The one thing to preserve if this file is ever refactored: every failed
 * attempt renders the same banner. A wrong password, an unknown email, a
 * deactivated account and a throttled response are one message, so the form
 * cannot be used to find out which accounts exist.
 */
export function Login({ onSignedIn }: LoginProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBanner(null);

    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = "Email is required";
    }
    if (!password.trim()) {
      errors.password = "Password is required";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);

    if (!result.ok) {
      setBanner(result.message);
      return;
    }

    onSignedIn(
      result.user.mustChangePassword
        ? "/change-password"
        : ROLE_LANDING[result.user.role]
    );
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center py-5 px-3"
      style={{ minHeight: "100vh", background: "var(--zg-page-bg)" }}
    >
      <div className="zg-auth-card" data-testid="login-card">
        <h1 className="h4 mb-1" style={{ color: "var(--zg-primary)" }}>
          TokTickIT
        </h1>
        <p className="text-muted mb-4">Sign in to continue</p>

        {banner && (
          <div
            className="alert alert-danger py-2"
            role="alert"
            aria-live="polite"
            data-testid="login-error"
          >
            {banner}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">
              Email <span className="text-danger">*</span>
            </label>
            <input
              autoComplete="username"
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              disabled={busy}
              id="login-email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            {fieldErrors.email && (
              <div className="invalid-feedback d-block">
                {fieldErrors.email}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="login-password">
              Password <span className="text-danger">*</span>
            </label>
            <div className="input-group">
              <input
                autoComplete="current-password"
                className={`form-control ${
                  fieldErrors.password ? "is-invalid" : ""
                }`}
                disabled={busy}
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="btn btn-outline-secondary"
                disabled={busy}
                onClick={() => setShowPassword((previous) => !previous)}
                type="button"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <div className="invalid-feedback d-block">
                {fieldErrors.password}
              </div>
            )}
          </div>

          <button
            className="btn btn-zen-primary w-100"
            disabled={busy}
            type="submit"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
