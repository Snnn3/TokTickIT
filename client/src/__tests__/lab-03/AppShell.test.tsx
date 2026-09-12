import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App";
import { AuthHarnessProvider, userWithRole } from "../../test/authHarness";
import { ROLE_LANDING } from "../../types/auth";
import type { Role } from "../../types/auth";

/**
 * C-08 from tests.md (AC-25, AC-27, FR-19, FR-27).
 *
 * Two things are asserted together here, because separately either one is
 * misleading. First, each role sees only its permitted destinations. Second, an
 * address the navigation hides is still reachable by hand and renders a
 * forbidden panel -- which is the point: hiding a control is not authorization,
 * and the server refuses the underlying request independently.
 */

function renderAt(route: string, role: Role) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthHarnessProvider harness={{ user: userWithRole(role) }}>
        <AppRoutes />
      </AuthHarnessProvider>
    </MemoryRouter>
  );
}

const navLabels = () =>
  screen.getAllByRole("link").map((link) => link.textContent);

describe("C-08 shell navigation and route guards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [],
        systems: [],
        tickets: [],
        total: 0,
        totalPages: 0,
      }),
    } as Response);
  });

  it("shows a Requester only the requester destinations", async () => {
    renderAt("/tickets", "REQUESTER");

    await waitFor(() => {
      expect(screen.getByTestId("identity-chip")).toBeInTheDocument();
    });
    expect(navLabels()).toEqual(["My Tickets", "Create Ticket"]);
    expect(screen.queryByRole("link", { name: "Ticket Queue" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
  });

  it("adds the queue for IT Staff but not user management", async () => {
    renderAt("/tickets", "IT_STAFF");

    await waitFor(() => {
      expect(screen.getByTestId("identity-chip")).toBeInTheDocument();
    });
    expect(navLabels()).toEqual([
      "My Tickets",
      "Create Ticket",
      "Ticket Queue",
    ]);
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
  });

  it("gives an Administrator every destination, queue included (D2)", async () => {
    renderAt("/tickets", "ADMINISTRATOR");

    await waitFor(() => {
      expect(screen.getByTestId("identity-chip")).toBeInTheDocument();
    });
    expect(navLabels()).toEqual([
      "My Tickets",
      "Create Ticket",
      "Ticket Queue",
      "Users",
    ]);
  });

  it("offers Create Ticket to every role (FR-27, AC-25)", async () => {
    for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as Role[]) {
      const view = renderAt("/tickets", role);
      await waitFor(() => {
        expect(
          screen.getByRole("link", { name: "Create Ticket" })
        ).toBeInTheDocument();
      });
      view.unmount();
    }
  });

  it("shows the signed-in name and role in the shell", async () => {
    renderAt("/tickets", "ADMINISTRATOR");

    await waitFor(() => {
      const chip = screen.getByTestId("identity-chip");
      expect(chip).toHaveTextContent("Signed in as Apinya Ratchada");
      expect(chip).toHaveTextContent("Administrator");
    });
  });

  it("renders a forbidden panel when a Requester hand-types a staff address", async () => {
    renderAt("/staff/queue", "REQUESTER");

    await waitFor(() => {
      expect(screen.getByTestId("forbidden-panel")).toBeInTheDocument();
    });
    // An explanation with a way back, not a blank page and not a pretend 404.
    expect(screen.getByTestId("forbidden-panel")).toHaveTextContent(
      /do not have access/i
    );
    expect(screen.queryByTestId("pending-slice-panel")).toBeNull();
  });

  it("renders a forbidden panel when IT Staff hand-type the administrator address", async () => {
    renderAt("/admin/users", "IT_STAFF");

    await waitFor(() => {
      expect(screen.getByTestId("forbidden-panel")).toBeInTheDocument();
    });
  });

  it("lets a permitted role through the same guard", async () => {
    renderAt("/staff/queue", "IT_STAFF");

    await waitFor(() => {
      expect(screen.getByTestId("pending-slice-panel")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("forbidden-panel")).toBeNull();
  });

  it("keeps the shell visible behind a forbidden panel, so the user can navigate away", async () => {
    renderAt("/admin/users", "REQUESTER");

    await waitFor(() => {
      expect(screen.getByTestId("forbidden-panel")).toBeInTheDocument();
    });
    expect(screen.getByTestId("identity-chip")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "My Tickets" })
    ).toBeInTheDocument();
  });

  it("lands each role on its own destination from the root address", async () => {
    const cases: [Role, string][] = [
      ["REQUESTER", "identity-chip"],
      ["IT_STAFF", "pending-slice-panel"],
      ["ADMINISTRATOR", "pending-slice-panel"],
    ];

    for (const [role, marker] of cases) {
      const view = renderAt("/", role);
      await waitFor(() => {
        expect(screen.getByTestId(marker)).toBeInTheDocument();
      });
      view.unmount();
    }

    // The landing table itself is the contract the routes above implement.
    expect(ROLE_LANDING).toEqual({
      REQUESTER: "/tickets",
      IT_STAFF: "/staff/queue",
      ADMINISTRATOR: "/admin/users",
    });
  });

  it("rejects a non-numeric ticket address with the not-found panel", async () => {
    renderAt("/tickets/not-a-number", "REQUESTER");

    await waitFor(() => {
      expect(screen.getByTestId("not-found-panel")).toBeInTheDocument();
    });
  });
});
