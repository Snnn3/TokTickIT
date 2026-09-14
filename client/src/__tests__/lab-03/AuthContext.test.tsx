import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { testUser } from "../../test/authHarness";

/**
 * Sign-out revocation contract (AC-06, FR-30, BR-20).
 *
 * The server answers 500 WITHOUT clearing its cookie when the tokenVersion
 * bump fails, because the presented session is still live. The provider must
 * therefore clear its local user only on a confirmed (2xx) revocation and
 * keep the session -- reporting `{ok:false}` -- on any failure, so the retry
 * the server kept possible is actually reachable.
 */

const signedInUser = testUser({ id: 7, name: "Kittipong Saelim" });

function Probe() {
  const { user, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="auth-state">
        {loading ? "loading" : (user?.name ?? "signed-out")}
      </span>
      <button
        data-testid="sign-out-btn"
        onClick={() =>
          signOut().then((result) => {
            const marker = document.querySelector(
              "[data-testid='sign-out-result']"
            );
            if (marker) {
              marker.textContent = result.ok ? "ok" : "failed";
            }
          })
        }
        type="button"
      >
        Sign out
      </button>
      <span data-testid="sign-out-result">pending</span>
    </div>
  );
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthProvider signOut (AC-06, FR-30)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the local user and reports ok on a confirmed (204) sign-out", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: signedInUser }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "Kittipong Saelim"
      );
    });

    fireEvent.click(screen.getByTestId("sign-out-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("sign-out-result")).toHaveTextContent("ok");
    });
    expect(screen.getByTestId("auth-state")).toHaveTextContent("signed-out");
  });

  it("keeps the user signed in and reports failure when revocation fails (500)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: signedInUser }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "UNEXPECTED",
            message: "Failed to complete the sign-out",
          },
        }),
      } as Response);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "Kittipong Saelim"
      );
    });

    fireEvent.click(screen.getByTestId("sign-out-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("sign-out-result")).toHaveTextContent("failed");
    });
    // Still signed in: the cookie the server refused to kill is still valid,
    // so the user can retry instead of being stranded on the login form.
    expect(screen.getByTestId("auth-state")).toHaveTextContent(
      "Kittipong Saelim"
    );
  });

  it("keeps the user signed in when the server is unreachable", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: signedInUser }),
      } as Response)
      .mockRejectedValueOnce(new Error("network down"));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        "Kittipong Saelim"
      );
    });

    fireEvent.click(screen.getByTestId("sign-out-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("sign-out-result")).toHaveTextContent("failed");
    });
    expect(screen.getByTestId("auth-state")).toHaveTextContent(
      "Kittipong Saelim"
    );
  });
});
