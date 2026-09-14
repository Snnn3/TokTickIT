import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "../../components/Login";
import {
  AuthProvider,
  SIGN_IN_FAILURE_MESSAGE,
} from "../../context/AuthContext";
import { AuthHarnessProvider, testUser } from "../../test/authHarness";

/**
 * C-01 from tests.md (AC-01, AC-02, AC-20).
 *
 * The assertion this file exists for is the last one: a 401 and a 429 render
 * the same banner. If that ever diverges the login screen becomes a way to
 * discover which accounts exist and which are locked out.
 */

function renderLogin(harness = {}) {
  const onSignedIn = vi.fn();
  render(
    <AuthHarnessProvider harness={harness}>
      <Login onSignedIn={onSignedIn} />
    </AuthHarnessProvider>
  );
  return { onSignedIn };
}

describe("C-01 Login screen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the email and password fields and a sign-in action", () => {
    renderLogin();

    expect(screen.getByTestId("login-card")).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign In/i })
    ).toBeInTheDocument();
  });

  it("shows inline errors and does not submit when either field is empty", () => {
    const signIn = vi.fn();
    renderLogin({ signIn });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("toggles password visibility from a labelled control", () => {
    renderLogin();

    const field = screen.getByLabelText(/^Password/i);
    expect(field).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("sends the user to their role landing route on success", async () => {
    const signIn = vi.fn(async () => ({
      ok: true as const,
      user: testUser({ role: "IT_STAFF" }),
    }));
    const { onSignedIn } = renderLogin({ signIn });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "kittipong.saelim@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Str0ng!Pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith("/staff/queue");
    });
  });

  it("sends a user carrying an initial password to the change-password gate", async () => {
    const signIn = vi.fn(async () => ({
      ok: true as const,
      user: testUser({ mustChangePassword: true }),
    }));
    const { onSignedIn } = renderLogin({ signIn });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "anucha.wongchai@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "ChangeMe!2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(onSignedIn).toHaveBeenCalledWith("/change-password");
    });
  });

  it("renders one identical safe banner for a 401 and for a 429 (AC-02, AC-20)", async () => {
    // Driven through the real provider, because the property under test is that
    // the provider maps both server answers onto the same client message.
    const banners: string[] = [];

    for (const status of [401, 429]) {
      vi.restoreAllMocks();
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status,
        json: async () => ({
          error: {
            code: status === 429 ? "TOO_MANY_ATTEMPTS" : "INVALID_CREDENTIALS",
            message: "Email or password is incorrect",
          },
        }),
      } as Response);

      const view = render(
        <AuthProvider>
          <Login onSignedIn={vi.fn()} />
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/Email/i), {
        target: { value: "someone@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^Password/i), {
        target: { value: "Wr0ng!Password" },
      });
      fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

      await waitFor(() => {
        expect(screen.getByTestId("login-error")).toBeInTheDocument();
      });
      banners.push(screen.getByTestId("login-error").textContent ?? "");
      view.unmount();
    }

    expect(banners[0]).toBe(SIGN_IN_FAILURE_MESSAGE);
    expect(banners[1]).toBe(banners[0]);
    // No hint about which case occurred, in either direction.
    expect(banners[0]).not.toMatch(
      /too many|locked|attempts|inactive|unknown/i
    );
  });

  it("reports a connection problem distinctly from a rejected credential", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(
      <AuthProvider>
        <Login onSignedIn={vi.fn()} />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "someone@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Str0ng!Pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toHaveTextContent(
        /Unable to reach the server/i
      );
    });
  });

  it("disables its controls while the attempt is in flight", async () => {
    let release: (value: { ok: false; message: string }) => void = () => {};
    const signIn = vi.fn(
      () =>
        new Promise<{ ok: false; message: string }>((resolve) => {
          release = resolve;
        })
    );
    renderLogin({ signIn });

    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "someone@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Str0ng!Pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Signing in/i })
      ).toBeDisabled();
    });

    release({ ok: false, message: SIGN_IN_FAILURE_MESSAGE });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeEnabled();
    });
  });
});
