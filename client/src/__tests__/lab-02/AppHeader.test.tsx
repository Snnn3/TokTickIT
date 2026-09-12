import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "../../components/AppHeader";
import { testUser, withAuthRouter } from "../../test/authHarness";

/**
 * Adapted from Lab 2 under BR-28. The subject survives -- this is still the
 * application shell header -- but the identity beneath it changed: the chip now
 * shows who is signed in rather than which development requester was picked,
 * and Change Requester became Logout. The nav assertions are the Lab 2 ones.
 */
describe("AppHeader Component (Issue #24 adapted for Lab 3, FR-18, FR-19)", () => {
  it("renders the brand, the requester navigation and the active state", () => {
    render(withAuthRouter(<AppHeader />, { route: "/tickets" }));

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();

    const myTickets = screen.getByRole("link", { name: "My Tickets" });
    const createTicket = screen.getByRole("link", { name: "Create Ticket" });

    expect(myTickets).toHaveClass("active");
    expect(createTicket).not.toHaveClass("active");
    expect(myTickets).toHaveAttribute("href", "/tickets");
    expect(createTicket).toHaveAttribute("href", "/tickets/new");
  });

  it("marks Create Ticket active when that is the current address", () => {
    render(withAuthRouter(<AppHeader />, { route: "/tickets/new" }));

    expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveClass(
      "active"
    );
    expect(screen.getByRole("link", { name: "My Tickets" })).not.toHaveClass(
      "active"
    );
  });

  it("shows the signed-in identity and its role rather than a development chip", () => {
    render(
      withAuthRouter(<AppHeader />, {
        harness: {
          user: testUser({ role: "IT_STAFF", name: "Kittipong Saelim" }),
        },
      })
    );

    const chip = screen.getByTestId("identity-chip");
    expect(chip).toHaveTextContent("Signed in as Kittipong Saelim");
    expect(chip).toHaveTextContent("IT Staff");
    expect(chip).not.toHaveTextContent("(dev)");
  });

  it("signs the user out from the Logout action", async () => {
    const signOut = vi.fn(async () => {});
    render(withAuthRouter(<AppHeader />, { harness: { signOut } }));

    fireEvent.click(screen.getByTestId("logout-btn"));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("change-requester-btn")
    ).not.toBeInTheDocument();
  });

  it("renders nothing at all when there is no session", () => {
    const { container } = render(
      withAuthRouter(<AppHeader />, { harness: { user: null } })
    );
    expect(container).toBeEmptyDOMElement();
  });
});
