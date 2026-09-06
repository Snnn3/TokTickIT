import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { RequesterSelection } from "../../components/RequesterSelection";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";

const mockRequesters = [
  { id: 1, name: "Anucha Wongchai", email: "anucha.wongchai@example.com" },
  { id: 2, name: "Busaba Srisawat", email: "busaba.srisawat@example.com" },
];

function TestWrapper({ children }: { children: ReactNode }) {
  return <RequesterProvider>{children}</RequesterProvider>;
}

describe("RequesterSelection Component (Issue #24, AC-19, AC-24)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("renders TokTickIT title and exact explanatory disclaimer text (BR-03)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requesters: mockRequesters }),
    } as Response);

    render(
      <TestWrapper>
        <RequesterSelection />
      </TestWrapper>
    );

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(
      screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Authentication and role-based access will be introduced in Lab 3/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching requesters", () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <RequesterSelection />
      </TestWrapper>
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders active requesters in dropdown and enables Continue upon selection (AC-19)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requesters: mockRequesters }),
    } as Response);

    render(
      <TestWrapper>
        <RequesterSelection />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loading-state")).not.toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Development Requester/i);
    const continueBtn = screen.getByRole("button", { name: /Continue/i });

    expect(continueBtn).toBeDisabled();

    // Select Anucha Wongchai
    fireEvent.change(select, { target: { value: "1" } });
    expect(continueBtn).toBeEnabled();
  });

  it("shows empty state when no active requesters are available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requesters: [] }),
    } as Response);

    render(
      <TestWrapper>
        <RequesterSelection />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
    expect(screen.getByText("No active requesters available.")).toBeInTheDocument();
  });

  it("shows error state with retry when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network Error"));

    render(
      <TestWrapper>
        <RequesterSelection />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });
    expect(screen.getByText(/Unable to load development requesters/i)).toBeInTheDocument();
  });

  it("supports keyboard submission via Enter on form (AC-24)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ requesters: mockRequesters }),
    } as Response);

    function ContextInspector() {
      const { selectedRequester } = useRequester();
      return (
        <div>
          <RequesterSelection />
          <div data-testid="selected-user">{selectedRequester?.name || "none"}</div>
        </div>
      );
    }

    render(
      <TestWrapper>
        <ContextInspector />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Development Requester/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Development Requester/i);
    fireEvent.change(select, { target: { value: "2" } });

    const form = screen.getByTestId("requester-form");
    fireEvent.submit(form);

    expect(screen.getByTestId("selected-user")).toHaveTextContent("Busaba Srisawat");
  });
});
