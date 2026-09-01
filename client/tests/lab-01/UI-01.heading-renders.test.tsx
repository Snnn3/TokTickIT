import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CheckSystem from "../../src/components/CheckSystem";

describe("CheckSystem", () => {
  it("renders the TokTickIT heading", () => {
    render(<CheckSystem />);
    expect(
      screen.getByRole("heading", { name: "TokTickIT IT Service Desk" }),
    ).toBeInTheDocument();
  });
});
