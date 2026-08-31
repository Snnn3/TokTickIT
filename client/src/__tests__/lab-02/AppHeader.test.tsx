import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppHeader } from "../../components/AppHeader";
import { RequesterProvider, useRequester } from "../../context/RequesterContext";

const mockUser = {
  id: 1,
  name: "Anucha Wongchai",
  email: "anucha.wongchai@example.com",
};

describe("AppHeader Component (Issue #24, FR-02, FR-03, FR-14)", () => {
  it("renders TokTickIT brand, nav links, and active state correctly", () => {
    const onTabChange = vi.fn();
    render(
      <RequesterProvider>
        <AppHeader activeTab="my-tickets" onTabChange={onTabChange} />
      </RequesterProvider>
    );

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    const myTicketsBtn = screen.getByRole("button", { name: /My Tickets/i });
    const createTicketBtn = screen.getByRole("button", { name: /Create Ticket/i });

    expect(myTicketsBtn).toHaveClass("active");
    expect(createTicketBtn).not.toHaveClass("active");

    fireEvent.click(createTicketBtn);
    expect(onTabChange).toHaveBeenCalledWith("create-ticket");
  });

  it("displays requester chip and invokes clearRequester on Change Requester button", () => {
    function Wrapper() {
      const { selectRequester, selectedRequester } = useRequester();
      
      return (
        <div>
          <button type="button" onClick={() => selectRequester(mockUser)} data-testid="login-helper">
            Log In
          </button>
          <AppHeader activeTab="my-tickets" onTabChange={() => {}} />
          <div data-testid="status-indicator">
            {selectedRequester ? selectedRequester.name : "logged-out"}
          </div>
        </div>
      );
    }

    render(
      <RequesterProvider>
        <Wrapper />
      </RequesterProvider>
    );

    // Trigger requester selection
    fireEvent.click(screen.getByTestId("login-helper"));

    expect(screen.getByTestId("requester-chip")).toHaveTextContent("Signed in as Anucha Wongchai (dev)");

    const changeBtn = screen.getByTestId("change-requester-btn");
    fireEvent.click(changeBtn);

    expect(screen.getByTestId("status-indicator")).toHaveTextContent("logged-out");
  });
});
