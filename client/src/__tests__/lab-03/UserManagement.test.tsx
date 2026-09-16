import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserManagement } from "../../components/UserManagement";
import { userWithRole, withAuthRouter } from "../../test/authHarness";
import type { AdminUser } from "../../types/auth";

const PASSWORD = "Str0ng!Pass";

const USERS: AdminUser[] = [
  {
    id: 1,
    name: "Apinya Ratchada",
    email: "apinya.ratchada@example.com",
    role: "ADMINISTRATOR",
    isActive: true,
    ownedOpenTicketCount: 0,
  },
  {
    id: 2,
    name: "Kittipong Saelim",
    email: "kittipong.saelim@example.com",
    role: "IT_STAFF",
    isActive: true,
    ownedOpenTicketCount: 3,
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderUsers() {
  return render(
    withAuthRouter(<UserManagement />, {
      harness: { user: userWithRole("ADMINISTRATOR") },
    })
  );
}

describe("UserManagement (C-06, AC-13..AC-16, AC-21)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the user table and sends search and role filters to the API", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => jsonResponse({ users: USERS }));

    renderUsers();

    await waitFor(() => {
      expect(screen.getByTestId("user-row-2")).toBeInTheDocument();
    });
    expect(screen.getByRole("columnheader", { name: "Open tickets" })).toBeInTheDocument();
    expect(screen.getByTestId("user-row-2")).toHaveTextContent("3");
    expect(screen.getByTestId("user-row-2")).toHaveTextContent("IT Staff");
    expect(
      screen.getByRole("button", { name: "Reset password for Kittipong Saelim" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search name or email" }), {
      target: { value: "kittipong" },
    });
    await waitFor(() => {
      expect(String(fetchSpy.mock.calls.at(-1)?.[0])).toContain("search=kittipong");
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by role" }), {
      target: { value: "IT_STAFF" },
    });
    await waitFor(() => {
      const lastUrl = String(fetchSpy.mock.calls.at(-1)?.[0]);
      expect(lastUrl).toContain("search=kittipong");
      expect(lastUrl).toContain("role=IT_STAFF");
    });
  });

  it("creates a user with a live-compliant password and reloads the list", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if ((init?.method ?? "GET") === "POST" && url === "/api/admin/users") {
          return jsonResponse({
            user: {
              id: 3,
              name: "New Requester",
              email: "new.requester@example.com",
              role: "REQUESTER",
              isActive: true,
              mustChangePassword: true,
            },
          }, 201);
        }
        return jsonResponse({ users: USERS });
      });

    renderUsers();
    await waitFor(() => expect(screen.getByTestId("user-row-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: " New Requester " },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: " New.Requester@Example.COM " },
    });
    fireEvent.change(within(dialog).getByLabelText("Initial password"), {
      target: { value: PASSWORD },
    });

    expect(screen.getByTestId("password-rule-length")).toHaveTextContent("met");
    expect(screen.getByTestId("password-rule-letterCase")).toHaveTextContent("met");
    expect(screen.getByTestId("password-rule-digit")).toHaveTextContent("met");
    expect(screen.getByTestId("password-rule-special")).toHaveTextContent("met");
    expect(screen.getByTestId("password-rule-maxBytes")).toHaveTextContent("met");

    fireEvent.click(within(dialog).getByRole("button", { name: "Create user" }));

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        ([input, init]) => String(input) === "/api/admin/users" && init?.method === "POST"
      );
      expect(postCall).toBeDefined();
      expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
        name: "New Requester",
        email: "new.requester@example.com",
        role: "REQUESTER",
        isActive: true,
        initialPassword: PASSWORD,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("users-success")).toHaveTextContent(
        "must change their password at next login"
      );
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("maps server password and duplicate-email errors to inline fields", async () => {
    let postAttempt = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if ((init?.method ?? "GET") === "POST") {
        postAttempt += 1;
        if (postAttempt === 1) {
          return jsonResponse(
            {
              error: {
                code: "VALIDATION_FAILED",
                message: "Validation failed",
                details: [
                  {
                    field: "initialPassword",
                    issue: "Password must contain an uppercase letter",
                  },
                ],
              },
            },
            400
          );
        }
        return jsonResponse(
          {
            error: { code: "EMAIL_TAKEN", message: "Email is already in use" },
          },
          409
        );
      }
      return jsonResponse({ users: USERS });
    });

    renderUsers();
    await waitFor(() =>
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));

    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "New Requester" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "new.requester@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Initial password"), {
      target: { value: PASSWORD },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create user" })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Password must contain an uppercase letter")
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Initial password")).toHaveClass(
        "is-invalid"
      );
    });
    expect(screen.getByLabelText("Initial password")).toHaveAttribute(
      "aria-describedby",
      "user-password-error"
    );

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "New Requester" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "new.requester@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Initial password"), {
      target: { value: PASSWORD },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create user" })
    );

    await waitFor(() => {
      expect(
        within(screen.getByRole("dialog")).getByText(
          "Email is already in use",
          {
            selector: ".invalid-feedback",
          }
        )
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toHaveClass("is-invalid");
    });
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      "user-email-error"
    );
  });

  it("disables every dialog control while a save is pending", async () => {
    const pendingPost = deferred<Response>();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if ((init?.method ?? "GET") === "POST") return pendingPost.promise;
      return jsonResponse({ users: USERS });
    });

    renderUsers();
    await waitFor(() =>
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), {
      target: { value: "New Requester" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "new.requester@example.com" },
    });
    fireEvent.change(within(dialog).getByLabelText("Initial password"), {
      target: { value: PASSWORD },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create user" })
    );

    await waitFor(() => {
      expect(within(dialog).getByLabelText("Name")).toBeDisabled();
    });
    expect(within(dialog).getByLabelText("Name")).toBeRequired();
    expect(within(dialog).getByLabelText("Email")).toBeDisabled();
    expect(within(dialog).getByLabelText("Email")).toBeRequired();
    expect(within(dialog).getByLabelText("Role")).toBeDisabled();
    expect(within(dialog).getByLabelText("Active account")).toBeDisabled();
    expect(within(dialog).getByLabelText("Initial password")).toBeDisabled();
    expect(within(dialog).getByLabelText("Initial password")).toBeRequired();
    expect(
      within(dialog).getByRole("button", { name: "Close dialog" })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Saving..." })
    ).toBeDisabled();

    pendingPost.resolve(
      jsonResponse(
        {
          user: {
            ...USERS[0],
            id: 3,
            name: "New Requester",
            email: "new.requester@example.com",
            role: "REQUESTER",
            mustChangePassword: true,
          },
        },
        201
      )
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("confirms a deactivation cascade and reports released tickets", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_input, init) => {
        if ((init?.method ?? "GET") === "PATCH") {
          return jsonResponse({
            user: { ...USERS[1], isActive: false },
            unassignedTicketCount: 3,
          });
        }
        return jsonResponse({ users: USERS });
      });

    renderUsers();
    await waitFor(() => expect(screen.getByTestId("user-row-2")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Kittipong Saelim" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Active account"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(screen.getByTestId("deactivation-confirmation")).toHaveTextContent(
      "currently owns 3 open tickets"
    );
    expect(
      fetchSpy.mock.calls.some(([, init]) => init?.method === "PATCH")
    ).toBe(false);

    fireEvent.click(
      within(screen.getByTestId("deactivation-confirmation")).getByRole("button", {
        name: "Confirm change",
      })
    );

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([, init]) => init?.method === "PATCH")
      ).toBe(true);
    });
    const patchCall = fetchSpy.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      isActive: false,
    });
    await waitFor(() => {
      expect(screen.getByTestId("users-success")).toHaveTextContent(
        "3 tickets were returned to the unassigned pool"
      );
    });
  });

  it("keeps reset password as a separate action and explains the next-login change", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (
          (init?.method ?? "GET") === "POST" &&
          url.endsWith("/reset-password")
        ) {
          return jsonResponse({ reset: true, mustChangePassword: true });
        }
        return jsonResponse({ users: USERS });
      });

    renderUsers();
    await waitFor(() => expect(screen.getByTestId("user-row-2")).toBeInTheDocument());
    fireEvent.click(
      screen.getByRole("button", { name: "Reset password for Kittipong Saelim" })
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("must choose a new password at next login");
    fireEvent.change(within(dialog).getByLabelText("New password"), {
      target: { value: PASSWORD },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reset password" }));

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        ([input, init]) => String(input).endsWith("/reset-password") && init?.method === "POST"
      );
      expect(postCall).toBeDefined();
      expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
        newPassword: PASSWORD,
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("users-success")).toHaveTextContent(
        "must change it at next login"
      );
    });
  });

  it("contains focus in an open dialog and closes it with Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ users: USERS })
    );

    renderUsers();
    await waitFor(() => expect(screen.getByTestId("user-row-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Edit Apinya Ratchada" }));

    const dialog = screen.getByRole("dialog");
    const focusable = within(dialog).getAllByRole("button");
    const firstButton = focusable[0];
    const lastButton = focusable.at(-1);
    expect(firstButton).toBeDefined();
    expect(lastButton).toBeDefined();

    lastButton?.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(firstButton);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("distinguishes forbidden and failed list loads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: { message: "You do not have access" } }, 403)
    );
    renderUsers();
    await waitFor(() => expect(screen.getByTestId("users-forbidden")).toBeInTheDocument());
    expect(screen.getByTestId("create-user-btn")).toBeDisabled();

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: { message: "Service unavailable" } }, 500)
    );
    const view = renderUsers();
    await waitFor(() => expect(screen.getByTestId("users-failure")).toBeInTheDocument());
    expect(screen.getByTestId("users-failure")).toHaveTextContent("Service unavailable");
    view.unmount();
  });
});
