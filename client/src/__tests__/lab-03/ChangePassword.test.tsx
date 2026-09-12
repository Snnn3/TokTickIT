import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePassword } from "../../components/ChangePassword";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";
import { PASSWORD_RULES } from "../../utils/password";

/**
 * C-02 from tests.md (AC-03, AC-19).
 *
 * The checklist and the disabled Save button are graded screenshot evidence, so
 * they are asserted rule by rule rather than as one "form is valid" check.
 */

function renderGate(harness: Record<string, unknown> = {}) {
  const onChanged = vi.fn();
  render(
    <AuthHarnessProvider
      harness={{ user: testUser({ mustChangePassword: true }), ...harness }}
    >
      <ChangePassword destination="/tickets" onChanged={onChanged} />
    </AuthHarnessProvider>
  );
  return { onChanged };
}

const newPassword = () => screen.getByLabelText(/^New password/i);
const confirmPassword = () => screen.getByLabelText(/^Confirm new password/i);
const saveButton = () => screen.getByRole("button", { name: /Save new/i });

describe("C-02 Change Password gate", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("explains that the change is mandatory on a first login", () => {
    renderGate();

    expect(screen.getByTestId("change-password-card")).toBeInTheDocument();
    expect(
      screen.getByText(/You must change your password to continue/i)
    ).toBeInTheDocument();
  });

  it("omits the current-password field on a first login and shows it afterwards", () => {
    const { unmount } = render(
      <AuthHarnessProvider
        harness={{ user: testUser({ mustChangePassword: true }) }}
      >
        <ChangePassword destination="/tickets" onChanged={vi.fn()} />
      </AuthHarnessProvider>
    );
    expect(
      screen.queryByLabelText(/Current password/i)
    ).not.toBeInTheDocument();
    unmount();

    render(
      <AuthHarnessProvider
        harness={{ user: testUser({ mustChangePassword: false }) }}
      >
        <ChangePassword destination="/tickets" onChanged={vi.fn()} />
      </AuthHarnessProvider>
    );
    expect(screen.getByLabelText(/Current password/i)).toBeInTheDocument();
  });

  it("renders all four checklist rules as unmet before anything is typed", () => {
    renderGate();

    expect(screen.getByTestId("password-checklist")).toBeInTheDocument();
    for (const rule of PASSWORD_RULES) {
      const item = screen.getByTestId(`password-rule-${rule.id}`);
      expect(item).toHaveAttribute("data-met", "false");
      expect(item).toHaveTextContent(rule.label);
      // Met and unmet are announced as text, not only as a colour.
      expect(item).toHaveTextContent(/not met/i);
    }
  });

  it("ticks each rule as it is satisfied while the user types", () => {
    renderGate();

    // Lower case only: one rule met.
    fireEvent.change(newPassword(), { target: { value: "password" } });
    expect(screen.getByTestId("password-rule-length")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByTestId("password-rule-letterCase")).toHaveAttribute(
      "data-met",
      "false"
    );

    fireEvent.change(newPassword(), { target: { value: "Password" } });
    expect(screen.getByTestId("password-rule-letterCase")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByTestId("password-rule-digit")).toHaveAttribute(
      "data-met",
      "false"
    );

    fireEvent.change(newPassword(), { target: { value: "Password1" } });
    expect(screen.getByTestId("password-rule-digit")).toHaveAttribute(
      "data-met",
      "true"
    );
    expect(screen.getByTestId("password-rule-special")).toHaveAttribute(
      "data-met",
      "false"
    );

    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    for (const rule of PASSWORD_RULES) {
      expect(screen.getByTestId(`password-rule-${rule.id}`)).toHaveAttribute(
        "data-met",
        "true"
      );
    }
  });

  it("shows a seven-character password as failing the length rule", () => {
    renderGate();
    fireEvent.change(newPassword(), { target: { value: "Ab3!def" } });

    expect(screen.getByTestId("password-rule-length")).toHaveAttribute(
      "data-met",
      "false"
    );
    expect(saveButton()).toBeDisabled();
  });

  it("keeps Save disabled until every rule and the confirmation pass", () => {
    renderGate();
    expect(saveButton()).toBeDisabled();

    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    // Rules pass, confirmation is still empty.
    expect(saveButton()).toBeDisabled();

    fireEvent.change(confirmPassword(), { target: { value: "Password1" } });
    expect(saveButton()).toBeDisabled();
    expect(
      screen.getByText(/Confirmation does not match/i)
    ).toBeInTheDocument();

    fireEvent.change(confirmPassword(), { target: { value: "Password1!" } });
    expect(saveButton()).toBeEnabled();
  });

  it("keeps Save disabled without the current password once past a first login", () => {
    render(
      <AuthHarnessProvider
        harness={{ user: testUser({ mustChangePassword: false }) }}
      >
        <ChangePassword destination="/tickets" onChanged={vi.fn()} />
      </AuthHarnessProvider>
    );

    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    fireEvent.change(confirmPassword(), { target: { value: "Password1!" } });
    expect(saveButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Current password/i), {
      target: { value: "ChangeMe!2026" },
    });
    expect(saveButton()).toBeEnabled();
  });

  it("continues into the app and clears the gate flag on success", async () => {
    const applyUser = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ changed: true, mustChangePassword: false }),
    } as Response);

    const { onChanged } = renderGate({ applyUser });

    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    fireEvent.change(confirmPassword(), { target: { value: "Password1!" } });
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(onChanged).toHaveBeenCalledWith("/tickets");
    });
    expect(applyUser).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: false })
    );
  });

  it("omits the current password from the request on a first login", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ changed: true, mustChangePassword: false }),
    } as Response);

    renderGate();
    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    fireEvent.change(confirmPassword(), { target: { value: "Password1!" } });
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    const body = JSON.parse(
      String((fetchSpy.mock.calls[0][1] as RequestInit).body)
    );
    expect(body).toEqual({
      newPassword: "Password1!",
      confirmPassword: "Password1!",
    });
  });

  it("surfaces the server's unmet rules rather than a generic message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: "VALIDATION_FAILED",
          message: "The new password does not meet the requirements",
          details: [
            {
              field: "newPassword",
              issue: "Password must contain a special character",
            },
          ],
        },
      }),
    } as Response);

    renderGate();
    fireEvent.change(newPassword(), { target: { value: "Password1!" } });
    fireEvent.change(confirmPassword(), { target: { value: "Password1!" } });
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(screen.getByTestId("change-password-error")).toHaveTextContent(
        /special character/i
      );
    });
  });

  it("always offers a sign-out, so the gate is never a trap", () => {
    const signOut = vi.fn(async () => {});
    renderGate({ signOut });

    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
