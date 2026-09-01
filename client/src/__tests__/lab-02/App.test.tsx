import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../../App";

const mockRequesters = [
  { id: 1, name: "Anucha Wongchai", email: "anucha.wongchai@example.com" },
];

describe("App Root & Route Guard (Issue #24, AC-02, C-09)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders RequesterSelection when no requester is selected, then shows App Shell upon selection", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requesters: mockRequesters }),
    } as Response);

    render(<App />);

    // First renders selection screen
    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/Development Requester/i)).toBeInTheDocument();
    });

    // Select requester and continue
    fireEvent.change(screen.getByLabelText(/Development Requester/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Now renders App shell
    expect(screen.getByTestId("requester-chip")).toHaveTextContent("Signed in as Anucha Wongchai (dev)");
    expect(screen.getByRole("button", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
  });
});
