import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppHeader } from "../components/AppHeader";
import { Forbidden } from "../components/ScreenPanel";
import { useAuth } from "../context/AuthContext";
import { ROLE_LANDING } from "../types/auth";
import type { Role } from "../types/auth";

/**
 * Route guards [FR-19, AC-27, ui-spec section 2].
 *
 * These are convenience only. Every check below is enforced again by the server
 * on every request, so a hand-typed URL still fails with 401 or 403 -- hiding a
 * control is not authorization, and a guard that was the only check would be a
 * hidden control.
 */

function Loading() {
  return (
    <output
      aria-live="polite"
      className="d-flex justify-content-center py-5"
      data-testid="auth-loading"
    >
      <span className="spinner-border" />
      <span className="visually-hidden">Loading</span>
    </output>
  );
}

/**
 * Signed in, past the change-password gate, inside the application shell.
 *
 * The gate is applied here rather than per-route so a screen added later cannot
 * forget it: while mustChangePassword is set, every address except
 * /change-password redirects to /change-password.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading />;
  }
  if (!user) {
    // `state` carries where they were headed, so signing in returns them there
    // rather than dumping them on a landing screen they did not ask for.
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }
  if (user.mustChangePassword) {
    return <Navigate replace to="/change-password" />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <AppHeader />
      <main
        className="container py-4 flex-grow-1"
        style={{ maxWidth: "1100px" }}
      >
        <Outlet />
      </main>
    </div>
  );
}

/** A permitted-but-wrong-role address renders an explanation, never a blank. */
export function RequireRole({
  allowed,
  children,
}: {
  allowed: Role[];
  children?: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate replace to="/login" />;
  }
  if (!allowed.includes(user.role)) {
    return <Forbidden backTo={ROLE_LANDING[user.role]} />;
  }
  return <>{children ?? <Outlet />}</>;
}

/**
 * Signed in but deliberately outside the shell: the change-password gate has no
 * navigation, because there is nowhere the user is allowed to go yet.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }
  if (!user) {
    return <Navigate replace to="/login" />;
  }
  return <>{children}</>;
}

/** An already-signed-in visitor to /login goes straight to their landing route. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }
  if (user) {
    return (
      <Navigate
        replace
        to={
          user.mustChangePassword ? "/change-password" : ROLE_LANDING[user.role]
        }
      />
    );
  }
  return <>{children}</>;
}
