import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { AuthContext } from "../context/auth-context";
import type { AuthContextType, AuthUser, Role } from "../types/auth";

/**
 * Test harness for anything that reads the authenticated identity.
 *
 * It supplies the context directly rather than mounting the real AuthProvider,
 * because the provider probes `/api/auth/me` on mount. A component test that
 * only wants to know "what does this render for an Administrator" should not
 * have to stub an unrelated request, and a test asserting how many times its
 * own endpoint was called should not have to subtract one.
 */

export function testUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: "Anucha Wongchai",
    email: "anucha.wongchai@example.com",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    ...overrides,
  };
}

export function userWithRole(role: Role): AuthUser {
  const names: Record<Role, string> = {
    REQUESTER: "Anucha Wongchai",
    IT_STAFF: "Kittipong Saelim",
    ADMINISTRATOR: "Apinya Ratchada",
  };
  return testUser({ role, name: names[role] });
}

export type AuthHarness = {
  user?: AuthUser | null;
  loading?: boolean;
  signIn?: AuthContextType["signIn"];
  signOut?: AuthContextType["signOut"];
  applyUser?: AuthContextType["applyUser"];
};

export function AuthHarnessProvider({
  children,
  harness = {},
}: {
  children: ReactNode;
  harness?: AuthHarness;
}) {
  const value: AuthContextType = {
    user: harness.user === undefined ? testUser() : harness.user,
    loading: harness.loading ?? false,
    signIn: harness.signIn ?? vi.fn(),
    signOut: harness.signOut ?? vi.fn(async () => {}),
    applyUser: harness.applyUser ?? vi.fn(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Wraps a tree in both a router and the auth context, which most screens need. */
export function withAuthRouter(
  ui: ReactElement,
  options: { harness?: AuthHarness; route?: string } = {}
) {
  return (
    <MemoryRouter initialEntries={[options.route ?? "/"]}>
      <AuthHarnessProvider harness={options.harness}>{ui}</AuthHarnessProvider>
    </MemoryRouter>
  );
}
