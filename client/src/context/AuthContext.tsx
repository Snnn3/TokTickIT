import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser, SignInResult } from "../types/auth";
import { AuthContext } from "./auth-context";

export { useAuth } from "./useAuth";

/**
 * Authentication state for the whole client [FR-18].
 *
 * There is no token in state and none in storage. The session is an http-only
 * cookie the browser attaches to every same-origin request through the Vite
 * proxy, so this provider holds only the answer to "who is signed in", which it
 * gets by asking the server.
 */

/**
 * One banner for every sign-in failure [BR-01, BR-21, ui-spec section 3]. A
 * wrong password, an unknown email, a deactivated account and a throttled
 * response must be indistinguishable on screen, so the client never renders the
 * server's message for these -- it renders this one.
 */
export const SIGN_IN_FAILURE_MESSAGE =
  "Email or password is incorrect. Please try again.";

export const SIGN_IN_UNAVAILABLE_MESSAGE =
  "Unable to reach the server. Please check your connection and try again.";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // The current-user probe is what makes a deep link work on a cold load: the
  // cookie is already in the browser, so the app can find out who it belongs to
  // before deciding whether to render the route or redirect to the login screen.
  useEffect(() => {
    let cancelled = false;

    const probe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (cancelled) {
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      } catch {
        // No session, or the API is unreachable. Either way the app is signed
        // out; the login screen reports a connection problem if one persists.
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    probe();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          return { ok: false, message: SIGN_IN_FAILURE_MESSAGE };
        }

        const data = await res.json();
        setUser(data.user);
        return { ok: true, user: data.user as AuthUser };
      } catch {
        return { ok: false, message: SIGN_IN_UNAVAILABLE_MESSAGE };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      // No body, and therefore no content type: the server exempts body-less
      // requests from the JSON check precisely so this call is possible.
      const res = await fetch("/api/auth/logout", { method: "POST" });
      // Only a confirmed revocation clears local state (AC-06, FR-30). The
      // server answers 204 on every path where the session is known to be
      // dead -- including an expired session -- and 500 WITHOUT clearing its
      // cookie when the tokenVersion bump failed. Clearing here on a 500
      // would report that still-live session as signed out, so the caller
      // stays signed in and retries instead.
      if (!res.ok) {
        return { ok: false as const };
      }
    } catch {
      // Unreachable server: the session may still be live, so staying on the
      // authenticated screen (with a retry available) beats stranding the user
      // on the login form while their cookie still works.
      return { ok: false as const };
    }
    setUser(null);
    return { ok: true as const };
  }, []);

  const applyUser = useCallback((next: AuthUser) => {
    setUser(next);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, applyUser }}>
      {children}
    </AuthContext.Provider>
  );
}
