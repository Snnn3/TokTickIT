import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

/**
 * Adapted from Lab 2 under BR-28. The Lab 2 version asserted that the app shows
 * a development-requester selection screen first and the shell afterwards. The
 * selector is gone, so the same question is now asked of the session: without
 * one the app shows Login, with one it shows the authenticated shell.
 */

function renderAt(route: string, harness = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthHarnessProvider harness={harness}>
        <AppRoutes />
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

describe("App Root and Route Guard (Issue #24 adapted for Lab 3, FR-18, FR-19)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [],
        systems: [],
        tickets: [],
        total: 0,
      }),
    } as Response);
  });

  it("sends an unauthenticated visitor to the login screen", async () => {
    renderAt("/tickets", { user: null });

    await waitFor(() => {
      expect(screen.getByTestId("login-card")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("identity-chip")).not.toBeInTheDocument();
  });

  it("renders the authenticated shell with the identity chip and the requester navigation", async () => {
    renderAt("/tickets");

    await waitFor(() => {
      expect(screen.getByTestId("identity-chip")).toHaveTextContent(
        "Signed in as Anucha Wongchai"
      );
    });
    expect(
      screen.getByRole("link", { name: "My Tickets" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create Ticket" })
    ).toBeInTheDocument();
    // The Lab 2 development affordances are gone, not merely hidden.
    expect(
      screen.queryByTestId("change-requester-btn")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Development Requester/i)
    ).not.toBeInTheDocument();
  });

  it("holds a user carrying an initial password on the change-password gate", async () => {
    renderAt("/tickets", { user: testUser({ mustChangePassword: true }) });

    await waitFor(() => {
      expect(screen.getByTestId("change-password-card")).toBeInTheDocument();
    });
    // No navigation is offered, because there is nowhere they may go yet.
    expect(screen.queryByTestId("identity-chip")).not.toBeInTheDocument();
  });

  it("waits rather than redirecting while the session probe is still in flight", () => {
    renderAt("/tickets", { user: null, loading: true });

    expect(screen.getByTestId("auth-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("login-card")).not.toBeInTheDocument();
  });

  it("renders a not-found panel for an address that matches no screen", async () => {
    renderAt("/no-such-screen");

    await waitFor(() => {
      expect(screen.getByTestId("not-found-panel")).toBeInTheDocument();
    });
  });
});
