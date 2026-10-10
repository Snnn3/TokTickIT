import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../App";
import { AuthContext } from "../../context/auth-context";
import { testUser } from "../../test/authHarness";
import type { AuthContextType, AuthUser } from "../../types/auth";

const emptyDashboard = {
  asOf: "2026-10-09T00:00:00.000Z",
  windowDays: 7,
  metrics: {
    openTickets: 0,
    unassignedTickets: 0,
    myOwnedTickets: 0,
    myActiveActions: 0,
  },
  groupings: {
    ticketsByStatus: [
      { status: "NEW", count: 0 },
      { status: "OPEN", count: 0 },
      { status: "IN_PROGRESS", count: 0 },
      { status: "WAITING_FOR_REQUESTER", count: 0 },
      { status: "RESOLVED", count: 0 },
      { status: "CLOSED", count: 0 },
      { status: "REOPENED", count: 0 },
      { status: "CANCELLED", count: 0 },
    ],
  },
  lists: { recentTickets: [], myRecentActions: [] },
};

function TestSessionProvider({ children }: { children: React.ReactNode }) {
  const staff = testUser({ role: "IT_STAFF" });
  const [user, setUser] = useState<AuthUser | null>(staff);
  const value: AuthContextType = {
    user,
    loading: false,
    signIn: async () => {
      setUser(staff);
      return { ok: true, user: staff };
    },
    signOut: async () => ({ ok: true }),
    expireSession: () => setUser(null),
    applyUser: setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="current-location">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  );
}

function protectedResponse(status: number, payload: unknown) {
  return Response.json(payload, { status });
}

describe("expired Staff dashboard and action-list sessions", () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([
    {
      destination: "/dashboard/staff?status=OPEN",
      endpoint: "/api/dashboard/staff",
      result: "staff-dashboard-failure",
    },
    {
      destination: "/staff/actions?page=2&pageSize=5#action-list",
      endpoint: "/api/staff/actions?",
      result: "",
    },
  ])(
    "continues from $destination through login after AUTH_REQUIRED",
    async ({ destination, endpoint, result }) => {
      let attempts = 0;
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
        const url = String(input);
        if (url.startsWith(endpoint)) {
          attempts += 1;
          if (attempts === 1) {
            return protectedResponse(401, {
              error: { code: "AUTH_REQUIRED", message: "Session expired" },
            });
          }
          return protectedResponse(500, {
            error: { code: "UNAVAILABLE", message: "Try again" },
          });
        }
        if (url === "/api/dashboard/staff")
          return protectedResponse(200, emptyDashboard);
        return protectedResponse(200, { categories: [], systems: [] });
      });

      render(
        <MemoryRouter initialEntries={[destination]}>
          <TestSessionProvider>
            <AppRoutes />
            <LocationProbe />
          </TestSessionProvider>
        </MemoryRouter>
      );

      expect(await screen.findByTestId("login-card")).toBeInTheDocument();
      expect(screen.getByTestId("current-location")).toHaveTextContent(
        "/login"
      );
      fireEvent.change(screen.getByLabelText("Email *"), {
        target: { value: "staff@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Password *"), {
        target: { value: "password" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

      await waitFor(() => {
        expect(screen.getByTestId("current-location")).toHaveTextContent(
          destination
        );
      });
      if (result) expect(await screen.findByTestId(result)).toBeInTheDocument();
      expect(attempts).toBeGreaterThanOrEqual(2);
    }
  );
});
