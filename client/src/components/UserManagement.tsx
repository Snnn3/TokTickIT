import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { RoleBadge } from "./AppHeader";
import { ROLE_LABELS } from "../types/auth";
import type { AdminUser, Role } from "../types/auth";
import {
  isPasswordCompliant,
  PASSWORD_RULES,
  unmetPasswordRules,
} from "../utils/password";
import { useConfirmDialogFocus } from "../hooks/useConfirmDialogFocus";

type DialogKind = "create" | "edit" | "reset" | null;

type UserForm = {
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  password: string;
};

const ROLE_OPTIONS: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  role: "REQUESTER",
  isActive: true,
  password: "",
};

function formForUser(user: AdminUser): UserForm {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    password: "",
  };
}

function isStaffRole(role: Role): boolean {
  return role === "IT_STAFF" || role === "ADMINISTRATOR";
}

function willCascade(user: AdminUser, form: UserForm): boolean {
  return (
    (user.isActive && !form.isActive) ||
    (isStaffRole(user.role) && form.role === "REQUESTER")
  );
}

function validateName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Name is required";
  if (trimmed.length > 120) return "Name must not exceed 120 characters";
  return null;
}

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required";
  if (trimmed.length > 255 || !EMAIL_PATTERN.test(trimmed)) {
    return "Email must be a valid email address";
  }
  return null;
}

function validateUserForm(form: UserForm, passwordRequired: boolean) {
  const errors: Record<string, string> = {};
  const nameError = validateName(form.name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(form.email);
  if (emailError) errors.email = emailError;

  if (!ROLE_OPTIONS.includes(form.role)) {
    errors.role = "Role must be Requester, IT Staff, or Administrator";
  }

  if (passwordRequired && !isPasswordCompliant(form.password)) {
    errors.password = unmetPasswordRules(form.password)
      .map((rule) => rule.label)
      .join("; ");
  }

  return errors;
}

function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="zg-password-checklist" data-testid="password-checklist">
      {PASSWORD_RULES.map((rule) => {
        const isMet = rule.isMet(value);
        return (
          <li
            className={isMet ? "is-met" : "is-unmet"}
            data-testid={`password-rule-${rule.id}`}
            key={rule.id}
          >
            <span aria-hidden="true" className="zg-checklist-icon">
              {isMet ? "✓" : "○"}
            </span>
            <span>
              {rule.label} ({isMet ? "met" : "not met"})
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AccountStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`badge ${isActive ? "badge-zen-active" : "badge-zen-inactive"}`}
      data-testid="account-status-badge"
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return {
    code: typeof data?.error?.code === "string" ? data.error.code : undefined,
    message:
      data?.error?.message || "The server could not complete that action.",
    details: Array.isArray(data?.error?.details)
      ? (data.error.details as { field?: string; issue?: string }[])
      : [],
  };
}

/** Administrator User Management [FR-26, AC-13..AC-16, AC-21]. */
export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingCascade, setConfirmingCascade] = useState(false);
  const requestSequence = useRef(0);
  const userDialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setForbidden(false);
    setLoadError(null);

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (roleFilter) params.set("role", roleFilter);

    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (requestId !== requestSequence.current) return;

      if (response.status === 403) {
        setUsers([]);
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        const error = await responseError(response);
        setUsers([]);
        setLoadError(error.message);
        return;
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      if (requestId === requestSequence.current) {
        setUsers([]);
        setLoadError("Network error. Unable to connect to the server.");
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setSelectedUser(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setDialogError(null);
    setConfirmingCascade(false);
    setSuccessMessage(null);
    setDialog("create");
  };

  const openEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setForm(formForUser(user));
    setFormErrors({});
    setDialogError(null);
    setConfirmingCascade(false);
    setSuccessMessage(null);
    setDialog("edit");
  };

  const openReset = (user: AdminUser) => {
    setSelectedUser(user);
    setForm({ ...EMPTY_FORM, password: "" });
    setFormErrors({});
    setDialogError(null);
    setConfirmingCascade(false);
    setSuccessMessage(null);
    setDialog("reset");
  };

  const dismissDialog = useCallback(() => {
    setDialog(null);
    setSelectedUser(null);
    setFormErrors({});
    setDialogError(null);
    setConfirmingCascade(false);
  }, []);

  const closeDialog = useCallback(() => {
    if (!saving) dismissDialog();
  }, [dismissDialog, saving]);

  useConfirmDialogFocus({
    open: dialog !== null,
    busy: saving,
    dialogRef: userDialogRef,
    initialFocusRef,
    onRequestClose: closeDialog,
  });

  const applyApiError = async (response: Response) => {
    if (response.status === 403) {
      setDialog(null);
      setForbidden(true);
      return;
    }
    const error = await responseError(response);
    const nextErrors: Record<string, string> = {};
    for (const detail of error.details) {
      const field =
        detail.field === "initialPassword" || detail.field === "newPassword"
          ? "password"
          : detail.field;
      if (field && detail.issue) nextErrors[field] = detail.issue;
    }
    if (error.code === "EMAIL_TAKEN") nextErrors.email = error.message;
    setFormErrors(nextErrors);
    setDialogError(error.message);
  };

  const submitCreate = async () => {
    const errors = validateUserForm(form, true);
    setFormErrors(errors);
    setDialogError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          isActive: form.isActive,
          initialPassword: form.password,
        }),
      });
      if (!response.ok) {
        await applyApiError(response);
        return;
      }

      setSuccessMessage(
        "User created. They must change their password at next login."
      );
      dismissDialog();
      await fetchUsers();
    } catch {
      setDialogError("Network error. Unable to create the user.");
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (confirmed = false) => {
    if (!selectedUser) return;
    const errors = validateUserForm(form, false);
    setFormErrors(errors);
    setDialogError(null);
    if (Object.keys(errors).length > 0) return;

    if (
      !confirmed &&
      selectedUser.ownedOpenTicketCount > 0 &&
      willCascade(selectedUser, form)
    ) {
      setConfirmingCascade(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          isActive: form.isActive,
        }),
      });
      if (!response.ok) {
        await applyApiError(response);
        return;
      }

      const data = await response.json();
      const released = data.unassignedTicketCount;
      setSuccessMessage(
        typeof released === "number" && released > 0
          ? `User updated. ${released} ${released === 1 ? "ticket was" : "tickets were"} returned to the unassigned pool.`
          : "User updated."
      );
      dismissDialog();
      await fetchUsers();
    } catch {
      setDialogError("Network error. Unable to update the user.");
    } finally {
      setSaving(false);
    }
  };

  const submitReset = async () => {
    if (!selectedUser) return;
    const errors: Record<string, string> = {};
    if (!isPasswordCompliant(form.password)) {
      errors.password = unmetPasswordRules(form.password)
        .map((rule) => rule.label)
        .join("; ");
    }
    setFormErrors(errors);
    setDialogError(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/users/${selectedUser.id}/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: form.password }),
        }
      );
      if (!response.ok) {
        await applyApiError(response);
        return;
      }

      setSuccessMessage(
        "Password reset. This user must change it at next login."
      );
      dismissDialog();
      await fetchUsers();
    } catch {
      setDialogError("Network error. Unable to reset the password.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (dialog === "create") await submitCreate();
    if (dialog === "edit") await submitEdit();
    if (dialog === "reset") await submitReset();
  };

  const activeFilters = Boolean(search.trim() || roleFilter);

  return (
    <div className="my-2" data-testid="user-management-view">
      <div className="zg-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h4 fw-bold mb-1 text-zen-primary">
              User Management
            </h1>
            <p className="text-muted small mb-0">
              Manage accounts, roles, access and initial passwords.
            </p>
          </div>
          <button
            className="btn btn-zen-primary"
            data-testid="create-user-btn"
            disabled={loading || forbidden}
            onClick={openCreate}
            type="button"
          >
            Create user
          </button>
        </div>

        <div className="p-3 bg-light rounded border mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-8">
              <label className="visually-hidden" htmlFor="users-search">
                Search name or email
              </label>
              <input
                aria-label="Search name or email"
                className="form-control"
                id="users-search"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or email"
                type="search"
                value={search}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="visually-hidden" htmlFor="users-role-filter">
                Filter by role
              </label>
              <select
                aria-label="Filter by role"
                className="form-select"
                id="users-role-filter"
                onChange={(event) =>
                  setRoleFilter(event.target.value as Role | "")
                }
                value={roleFilter}
              >
                <option value="">All roles</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {successMessage && (
          <div
            className="alert alert-success"
            data-testid="users-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {loading && (
          <div className="zg-card p-4" data-testid="users-loading">
            <div className="zg-skeleton-line mb-3" style={{ width: "35%" }} />
            <div className="zg-skeleton-line mb-2" style={{ width: "90%" }} />
            <div className="zg-skeleton-line" style={{ width: "75%" }} />
          </div>
        )}

        {!loading && forbidden && (
          <div
            className="alert alert-danger"
            data-testid="users-forbidden"
            role="alert"
          >
            You do not have access to user management.
          </div>
        )}

        {!loading && !forbidden && loadError && (
          <div
            className="alert alert-danger d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2"
            data-testid="users-failure"
            role="alert"
          >
            <span>{loadError}</span>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => void fetchUsers()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !forbidden && !loadError && users.length === 0 && (
          <div
            className="zg-card p-4 text-center"
            data-testid={activeFilters ? "users-no-results" : "users-empty"}
          >
            <h2 className="h5 mb-2">
              {activeFilters ? "No matching users" : "No users yet"}
            </h2>
            <p className="text-muted small mb-0">
              {activeFilters
                ? "Try a different name, email or role filter."
                : "Create the first user to begin managing access."}
            </p>
          </div>
        )}

        {!loading && !forbidden && !loadError && users.length > 0 && (
          <div className="zg-user-table-wrap">
            <table
              className="table align-middle mb-0 zg-user-table"
              data-testid="users-table"
            >
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Open tickets</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr data-testid={`user-row-${user.id}`} key={user.id}>
                    <td data-label="Name">
                      <span className="fw-semibold text-zen-body">
                        {user.name}
                      </span>
                    </td>
                    <td data-label="Email" className="text-zen-body">
                      {user.email}
                    </td>
                    <td data-label="Role">
                      <RoleBadge role={user.role} />
                    </td>
                    <td data-label="Status">
                      <AccountStatusBadge isActive={user.isActive} />
                    </td>
                    <td data-label="Open tickets" className="text-zen-body">
                      {user.ownedOpenTicketCount}
                    </td>
                    <td data-label="Actions">
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          aria-label={`Edit ${user.name}`}
                          className="btn btn-zen-secondary btn-sm"
                          onClick={() => openEdit(user)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          aria-label={`Reset password for ${user.name}`}
                          className="btn btn-zen-tertiary btn-sm"
                          onClick={() => openReset(user)}
                          type="button"
                        >
                          Reset password
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div className="zg-dialog-backdrop" data-testid="user-dialog-backdrop">
          <div
            aria-labelledby="user-dialog-title"
            aria-modal="true"
            className="zg-card zg-dialog p-4"
            data-testid={`${dialog}-user-dialog`}
            ref={userDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <h2
                  className="h5 fw-bold text-zen-primary mb-1"
                  id="user-dialog-title"
                >
                  {dialog === "create"
                    ? "Create user"
                    : dialog === "edit"
                      ? `Edit ${selectedUser?.name ?? "user"}`
                      : `Reset password for ${selectedUser?.name ?? "user"}`}
                </h2>
                <p className="text-muted small mb-0">
                  {dialog === "reset"
                    ? "The user must choose a new password at next login."
                    : "Account details are validated again by the server."}
                </p>
              </div>
              <button
                aria-label="Close dialog"
                className="btn-close"
                disabled={saving}
                onClick={closeDialog}
                type="button"
              />
            </div>

            <form onSubmit={(event) => void handleSubmit(event)}>
              {dialog !== "reset" && (
                <>
                  <div className="mb-3">
                    <label
                      className="form-label fw-semibold"
                      htmlFor="user-name"
                    >
                      Name
                    </label>
                    <span aria-hidden="true" className="text-danger">
                      {" "}
                      *
                    </span>
                    <input
                      aria-describedby={
                        formErrors.name ? "user-name-error" : undefined
                      }
                      aria-required="true"
                      className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                      disabled={saving}
                      id="user-name"
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      ref={initialFocusRef}
                      required
                      value={form.name}
                    />
                    {formErrors.name && (
                      <div className="invalid-feedback" id="user-name-error">
                        {formErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label fw-semibold"
                      htmlFor="user-email"
                    >
                      Email
                    </label>
                    <span aria-hidden="true" className="text-danger">
                      {" "}
                      *
                    </span>
                    <input
                      aria-describedby={
                        formErrors.email ? "user-email-error" : undefined
                      }
                      aria-required="true"
                      className={`form-control ${formErrors.email ? "is-invalid" : ""}`}
                      disabled={saving}
                      id="user-email"
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      type="email"
                      required
                      value={form.email}
                    />
                    {formErrors.email && (
                      <div className="invalid-feedback" id="user-email-error">
                        {formErrors.email}
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label
                      className="form-label fw-semibold"
                      htmlFor="user-role"
                    >
                      Role
                    </label>
                    <span aria-hidden="true" className="text-danger">
                      {" "}
                      *
                    </span>
                    <select
                      aria-describedby={
                        formErrors.role ? "user-role-error" : undefined
                      }
                      aria-required="true"
                      className={`form-select ${formErrors.role ? "is-invalid" : ""}`}
                      disabled={saving}
                      id="user-role"
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          role: event.target.value as Role,
                        }))
                      }
                      value={form.role}
                      required
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    {formErrors.role && (
                      <div className="invalid-feedback" id="user-role-error">
                        {formErrors.role}
                      </div>
                    )}
                  </div>

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      disabled={saving}
                      id="user-active"
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          isActive: event.target.checked,
                        }))
                      }
                      type="checkbox"
                      checked={form.isActive}
                    />
                    <label className="form-check-label" htmlFor="user-active">
                      Active account
                    </label>
                  </div>
                </>
              )}

              {dialog !== "edit" && (
                <div className="mb-3">
                  <label
                    className="form-label fw-semibold"
                    htmlFor="user-password"
                  >
                    {dialog === "create" ? "Initial password" : "New password"}
                  </label>
                  <span aria-hidden="true" className="text-danger">
                    {" "}
                    *
                  </span>
                  <input
                    aria-describedby={
                      formErrors.password ? "user-password-error" : undefined
                    }
                    aria-required="true"
                    className={`form-control ${formErrors.password ? "is-invalid" : ""}`}
                    disabled={saving}
                    id="user-password"
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    type="password"
                    ref={initialFocusRef}
                    required
                    value={form.password}
                  />
                  {formErrors.password && (
                    <div className="invalid-feedback" id="user-password-error">
                      {formErrors.password}
                    </div>
                  )}
                  <PasswordChecklist value={form.password} />
                </div>
              )}

              {dialogError && (
                <div
                  className="alert alert-danger"
                  data-testid="user-dialog-error"
                  role="alert"
                >
                  {dialogError}
                </div>
              )}

              {confirmingCascade && selectedUser && (
                <div
                  aria-labelledby="cascade-confirm-title"
                  aria-modal="true"
                  className="zg-card zg-confirm-panel p-3 mb-3"
                  data-testid="deactivation-confirmation"
                  role="alertdialog"
                >
                  <h3 className="h6 fw-bold" id="cascade-confirm-title">
                    Confirm access change
                  </h3>
                  <p className="small mb-3">
                    {selectedUser.name} currently owns{" "}
                    <strong>{selectedUser.ownedOpenTicketCount}</strong> open
                    tickets. This change will return them to the unassigned pool
                    and end the user&apos;s active sessions.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      className="btn btn-zen-destructive btn-sm"
                      disabled={saving}
                      onClick={() => {
                        setConfirmingCascade(false);
                        void submitEdit(true);
                      }}
                      type="button"
                    >
                      Confirm change
                    </button>
                    <button
                      className="btn btn-zen-secondary btn-sm"
                      disabled={saving}
                      onClick={() => setConfirmingCascade(false)}
                      type="button"
                    >
                      Keep account
                    </button>
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-end gap-2">
                <button
                  className="btn btn-zen-secondary"
                  disabled={saving}
                  onClick={closeDialog}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="btn btn-zen-primary"
                  disabled={saving || confirmingCascade}
                  type="submit"
                >
                  {saving
                    ? "Saving..."
                    : dialog === "create"
                      ? "Create user"
                      : dialog === "edit"
                        ? "Save changes"
                        : "Reset password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
