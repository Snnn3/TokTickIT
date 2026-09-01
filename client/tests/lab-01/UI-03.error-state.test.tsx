import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CheckSystem from "../../src/components/CheckSystem";

describe("Check System - API failure", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("displays a useful error message when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network Error")));

    const user = userEvent.setup();
    render(<CheckSystem />);

    await user.click(screen.getByRole("button", { name: "Check System" }));
    expect(
      await screen.findByText(/Unable to connect to TokTickIT API/),
    ).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });
});