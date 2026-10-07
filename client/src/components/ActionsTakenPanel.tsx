import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import type { CreateActionPayload, UpdateActionPayload } from "../api/actions";
import {
  createTicketAction,
  getActionAssignees,
  getTicketActionHistory,
  getTicketActions,
  updateTicketAction,
} from "../api/actions";
import { useConfirmDialogFocus } from "../hooks/useConfirmDialogFocus";
import {
  ACTION_STATUS_LABELS,
  isActionStatus,
  parseActionAssignees,
  parseActionEvents,
  parseActionListResponse,
  parseActionWriteResponse,
  type ActionAssignee,
  type ActionEvent,
  type ActionSnapshot,
  type ActionStatus,
  type ActionTaken,
} from "../types/action";
import type { TicketStatus } from "../types/ticket";

interface ActionsTakenPanelProps {
  ticketId: number;
  ticketVersion: number;
  ticketStatus: TicketStatus;
  canManage: boolean;
  performerName?: string;
  disabledReason?: string;
  onTicketVersionChange?: (version: number, updatedAt?: string) => void;
  onRefreshTicket?: () => void;
}

interface ActionFormValues {
  title: string;
  details: string;
  result: string;
  assigneeId: string;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

interface PendingCreateRequest {
  idempotencyKey: string;
  payload: CreateActionPayload;
}

interface ActionHistoryState {
  loading: boolean;
  events: ActionEvent[];
  error: string | null;
}

type Confirmation = "cancel-action" | "discard-conflict" | null;

const EMPTY_FORM: ActionFormValues = {
  title: "",
  details: "",
  result: "",
  assigneeId: "",
  status: "PLANNED",
  followUpRequired: false,
  followUpNote: "",
  attachmentNotes: "",
};

const INACTIVE_TICKET_STATUSES = new Set<TicketStatus>([
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
]);
const TERMINAL_ACTION_STATUSES = new Set<ActionStatus>([
  "COMPLETED",
  "CANCELLED",
]);
const ACTION_TRANSITIONS: Record<ActionStatus, readonly ActionStatus[]> = {
  PLANNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const HISTORY_FIELDS: Array<{
  key: keyof ActionSnapshot;
  label: string;
}> = [
  { key: "title", label: "Title" },
  { key: "details", label: "Action Description" },
  { key: "result", label: "Result" },
  { key: "assigneeId", label: "Assignee ID" },
  { key: "status", label: "Status" },
  { key: "followUpRequired", label: "Follow-up required" },
  { key: "followUpNote", label: "Follow-up note" },
  { key: "attachmentNotes", label: "Attachment notes" },
];

const FOLLOW_UP_NOTE_REQUIRED_MESSAGE =
  "A follow-up note is required when follow-up is enabled.";
const ACTION_RESULT_REQUIRED_MESSAGE =
  "Enter a result before completing this action.";
const EMPTY_API_FIELDS: Record<string, string> = {};

function formatBangkokDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function sortActions(actions: ActionTaken[]): ActionTaken[] {
  return [...actions].sort((left, right) => {
    const timeDifference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return timeDifference || left.id - right.id;
  });
}

function makeIdempotencyKey(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function getActionTransitions(status: ActionStatus): ActionStatus[] {
  return [status, ...ACTION_TRANSITIONS[status]];
}

function textValue(value: string | null): string {
  return value?.trim() ? value : "Not provided";
}

function historyValue(key: keyof ActionSnapshot, value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (key === "status" && typeof value === "string") {
    return isActionStatus(value) ? ACTION_STATUS_LABELS[value] : value;
  }
  if (key === "followUpRequired") return value ? "Yes" : "No";
  if (key === "assigneeId" && typeof value === "number") {
    return "Staff user #" + value;
  }
  return String(value);
}

function changedFields(event: ActionEvent) {
  if (!event.before) return [];
  return HISTORY_FIELDS.flatMap(({ key, label }) => {
    const before = event.before?.[key];
    const after = event.after[key];
    if (before === after) return [];
    return [
      {
        label,
        before: historyValue(key, before),
        after: historyValue(key, after),
      },
    ];
  });
}

function validateForm(values: ActionFormValues, editing: boolean) {
  const errors: Record<string, string> = {};
  const title = values.title.trim();
  const details = values.details.trim();
  const result = values.result.trim();
  const followUpNote = values.followUpNote.trim();
  const attachmentNotes = values.attachmentNotes.trim();

  if (!title || title.length > 120) {
    errors.title = "Enter a title between 1 and 120 characters.";
  }
  if (!details || details.length > 2000) {
    errors.details =
      "Enter an action description between 1 and 2000 characters.";
  }
  if (values.followUpRequired && !followUpNote) {
    errors.followUpNote = FOLLOW_UP_NOTE_REQUIRED_MESSAGE;
  } else if (followUpNote.length > 2000) {
    errors.followUpNote = "Follow-up note must not exceed 2000 characters.";
  }
  if (attachmentNotes.length > 2000) {
    errors.attachmentNotes =
      "Attachment notes must not exceed 2000 characters.";
  }
  if (editing && values.status === "COMPLETED" && !result) {
    errors.result = ACTION_RESULT_REQUIRED_MESSAGE;
  } else if (result.length > 2000) {
    errors.result = "Result must not exceed 2000 characters.";
  }
  return errors;
}

function apiErrorDetails(data: unknown) {
  if (!isRecord(data) || !isRecord(data.error)) {
    return { code: "", fields: EMPTY_API_FIELDS };
  }
  const error = data.error;
  const details = error?.details;
  const rawFields =
    isRecord(details) && isRecord(details.fields) ? details.fields : {};
  const fields: Record<string, string> = {};
  for (const [name, message] of Object.entries(rawFields)) {
    if (typeof message === "string") fields[name] = message;
  }
  return {
    code: typeof error?.code === "string" ? error.code : "",
    fields,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeActionError(code: string): string {
  switch (code) {
    case "FOLLOW_UP_NOTE_REQUIRED":
      return "Add a follow-up note or turn off Follow-up required.";
    case "ACTION_RESULT_REQUIRED":
      return "Enter a meaningful result before completing this action.";
    case "ASSIGNEE_NOT_ELIGIBLE":
      return "That staff member is no longer eligible. Choose an active IT Staff assignee.";
    case "TICKET_NOT_ACTIVE":
      return "This Ticket is no longer active. Its Actions Taken cannot be changed.";
    case "SELF_SERVICE_FORBIDDEN":
      return "Staff changes are not allowed on a Ticket you requested.";
    case "IDEMPOTENCY_CONFLICT":
      return "This create request key was already used with different details. Review the form before trying again.";
    case "INVALID_ACTION_TRANSITION":
      return "That action status change is not allowed. Review the current status and try again.";
    default:
      return "Unable to save this action. Your form entries have been kept.";
  }
}

export function ActionsTakenPanel({
  ticketId,
  ticketVersion,
  ticketStatus,
  canManage,
  performerName,
  disabledReason,
  onTicketVersionChange,
  onRefreshTicket,
}: ActionsTakenPanelProps) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [currentTicketVersion, setCurrentTicketVersion] =
    useState(ticketVersion);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<ActionAssignee[]>([]);
  const [assigneesLoaded, setAssigneesLoaded] = useState(false);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<ActionFormValues>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingCreateRequest, setPendingCreateRequest] =
    useState<PendingCreateRequest | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [conflictAction, setConflictAction] = useState<ActionTaken | null>(
    null
  );
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(
    null
  );
  const [historyByAction, setHistoryByAction] = useState<
    Record<number, ActionHistoryState>
  >({});

  const panelRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const confirmationWasOpenRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const dialogConfirmRef = useRef<HTMLButtonElement>(null);

  const editorOpen = creating || editingActionId !== null;
  const editingAction =
    editingActionId === null
      ? null
      : (actions.find((action) => action.id === editingActionId) ?? null);
  const ticketIsActive = !INACTIVE_TICKET_STATUSES.has(ticketStatus);
  const writesAllowed = canManage && ticketIsActive;
  const terminalMessage =
    "Actions are read-only while this Ticket is " +
    ticketStatus.replaceAll("_", " ") +
    ". Reopen it before making action changes.";
  const writeDisabledMessage =
    disabledReason ?? (!ticketIsActive && canManage ? terminalMessage : null);

  const closeConfirmation = useCallback(() => {
    if (!saving) setConfirmation(null);
  }, [saving]);

  useConfirmDialogFocus({
    open: confirmation !== null,
    busy: saving,
    dialogRef,
    initialFocusRef: dialogConfirmRef,
    onRequestClose: closeConfirmation,
  });

  useEffect(() => {
    setCurrentTicketVersion(ticketVersion);
  }, [ticketVersion]);

  useEffect(() => {
    if (confirmation !== null) {
      confirmationWasOpenRef.current = true;
      return;
    }
    if (!confirmationWasOpenRef.current) return;
    confirmationWasOpenRef.current = false;
    const trigger = confirmationTriggerRef.current;
    if (trigger?.isConnected && !trigger.hasAttribute("disabled")) {
      trigger.focus();
    }
    confirmationTriggerRef.current = null;
  }, [confirmation]);

  useEffect(() => {
    if (editorOpen) {
      const timer = window.setTimeout(() => titleRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
    if (returnFocusRef.current) {
      if (returnFocusRef.current.isConnected) {
        returnFocusRef.current.focus();
      } else {
        panelRef.current?.focus();
      }
      returnFocusRef.current = null;
    }
  }, [editorOpen, editingActionId]);

  const loadActions = useCallback(async (): Promise<ActionTaken[] | null> => {
    setLoading(true);
    setForbidden(false);
    setNotFound(false);
    setFailure(null);
    try {
      const response = await getTicketActions(ticketId);
      if (response.status === 403) {
        setForbidden(true);
        return null;
      }
      if (response.status === 404) {
        setNotFound(true);
        return null;
      }
      if (!response.ok) {
        setFailure("Unable to load Actions Taken. Retry to try again.");
        return null;
      }

      const data: unknown = await response.json();
      const actionList = parseActionListResponse(data);
      if (!actionList) {
        setFailure("The server returned an unexpected Actions Taken response.");
        return null;
      }
      const loaded = sortActions(actionList.actions);
      setActions(loaded);
      setCurrentTicketVersion(actionList.ticketVersion);
      onTicketVersionChange?.(actionList.ticketVersion);
      return loaded;
    } catch {
      setFailure(
        "Unable to load Actions Taken. Check your connection and retry."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [onTicketVersionChange, ticketId]);

  useEffect(() => {
    void loadActions();
  }, [loadActions]);

  async function loadAssignees(force = false) {
    if ((!force && assigneesLoaded) || assigneesLoading) return;
    setAssigneesLoading(true);
    setAssigneesError(null);
    try {
      const response = await getActionAssignees();
      if (!response.ok) {
        setAssigneesError(
          "Active IT Staff could not be loaded. Retry, or leave this action unassigned."
        );
        return;
      }
      const data: unknown = await response.json();
      const activeAssignees = parseActionAssignees(data);
      if (!activeAssignees) {
        setAssigneesError(
          "Active IT Staff could not be loaded. Retry, or leave this action unassigned."
        );
        return;
      }
      setAssignees(activeAssignees);
      setAssigneesLoaded(true);
    } catch {
      setAssigneesError(
        "Active IT Staff could not be loaded. Retry, or leave this action unassigned."
      );
    } finally {
      setAssigneesLoading(false);
    }
  }

  function beginCreate(event: MouseEvent<HTMLButtonElement>) {
    returnFocusRef.current = event.currentTarget;
    setCreating(true);
    setEditingActionId(null);
    setFormValues({ ...EMPTY_FORM });
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);
    setPendingCreateRequest(null);
    setConflictMessage(null);
    setConflictAction(null);
    void loadAssignees();
  }

  function beginEdit(
    action: ActionTaken,
    event: MouseEvent<HTMLButtonElement>
  ) {
    returnFocusRef.current = event.currentTarget;
    setCreating(false);
    setEditingActionId(action.id);
    setFormValues({
      title: action.title,
      details: action.details,
      result: action.result ?? "",
      assigneeId: action.assignee ? String(action.assignee.id) : "",
      status: action.status,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote ?? "",
      attachmentNotes: action.attachmentNotes ?? "",
    });
    setFieldErrors({});
    setFormError(null);
    setSuccess(null);
    setPendingCreateRequest(null);
    setConflictMessage(null);
    setConflictAction(null);
    void loadAssignees();
  }

  function closeEditor() {
    setConfirmation(null);
    setCreating(false);
    setEditingActionId(null);
    setFormValues({ ...EMPTY_FORM });
    setFieldErrors({});
    setFormError(null);
    setConflictMessage(null);
    setConflictAction(null);
    setPendingCreateRequest(null);
  }

  function requestEditorClose(event: MouseEvent<HTMLButtonElement>) {
    if (pendingCreateRequest) return;
    if (conflictMessage) {
      confirmationTriggerRef.current = event.currentTarget;
      setConfirmation("discard-conflict");
      return;
    }
    closeEditor();
  }

  function changeForm<K extends keyof ActionFormValues>(
    field: K,
    value: ActionFormValues[K]
  ) {
    setFormValues((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  async function refreshForConflict() {
    setConflictMessage(
      "This Ticket or action changed elsewhere. Review the latest saved values and explicitly save again; nothing was resubmitted."
    );
    const latestActions = await loadActions();
    if (editingActionId !== null) {
      setConflictAction(
        latestActions?.find((action) => action.id === editingActionId) ?? null
      );
    }
  }

  async function saveEditor(confirmedCancellation = false) {
    if (!editorOpen || saving) return;
    const errors = validateForm(formValues, !creating);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError(null);
      return;
    }

    if (
      !creating &&
      editingAction &&
      formValues.status === "CANCELLED" &&
      editingAction.status !== "CANCELLED" &&
      !confirmedCancellation
    ) {
      setConfirmation("cancel-action");
      return;
    }
    if (!creating && !editingAction) {
      setFormError(
        "This action is no longer available. Reload the action list."
      );
      if (confirmedCancellation) setConfirmation(null);
      return;
    }

    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    const isCreateRetry = creating && pendingCreateRequest !== null;
    let createRequest: PendingCreateRequest | null = null;

    try {
      let response: Response;
      if (creating) {
        const payload: CreateActionPayload = {
          title: formValues.title.trim(),
          details: formValues.details.trim(),
          assigneeId: formValues.assigneeId
            ? Number(formValues.assigneeId)
            : null,
          followUpRequired: formValues.followUpRequired,
          followUpNote: formValues.followUpNote.trim() || null,
          attachmentNotes: formValues.attachmentNotes.trim() || null,
          expectedTicketVersion: currentTicketVersion,
        };
        createRequest = pendingCreateRequest ?? {
          idempotencyKey: makeIdempotencyKey(),
          payload,
        };
        response = await createTicketAction(
          ticketId,
          createRequest.idempotencyKey,
          createRequest.payload
        );
      } else {
        const action = editingAction!;
        const payload: UpdateActionPayload = {
          expectedVersion: action.version,
          expectedTicketVersion: currentTicketVersion,
          title: formValues.title.trim(),
          details: formValues.details.trim(),
          result: formValues.result.trim() || null,
          assigneeId: formValues.assigneeId
            ? Number(formValues.assigneeId)
            : null,
          followUpRequired: formValues.followUpRequired,
          followUpNote: formValues.followUpNote.trim() || null,
          attachmentNotes: formValues.attachmentNotes.trim() || null,
          status: formValues.status,
        };
        response = await updateTicketAction(ticketId, action.id, payload);
      }

      const data: unknown = await response.json().catch((): unknown => ({}));
      if (!response.ok) {
        if (creating && response.status >= 500 && createRequest) {
          setPendingCreateRequest(createRequest);
          setFormError(
            "The server could not confirm the save. Retry sends the exact same request; your entries are locked until the result is confirmed."
          );
          return;
        }
        if (creating) setPendingCreateRequest(null);
        const details = apiErrorDetails(data);
        if (response.status === 409 && details.code === "STALE_WRITE") {
          await refreshForConflict();
          return;
        }
        const serverFieldErrors = { ...details.fields };
        if (details.code === "FOLLOW_UP_NOTE_REQUIRED") {
          serverFieldErrors.followUpNote = FOLLOW_UP_NOTE_REQUIRED_MESSAGE;
        }
        if (details.code === "ACTION_RESULT_REQUIRED") {
          serverFieldErrors.result = ACTION_RESULT_REQUIRED_MESSAGE;
        }
        if (details.code === "ASSIGNEE_NOT_ELIGIBLE") {
          serverFieldErrors.assigneeId =
            "That assignee is no longer active IT Staff. Choose another assignee or Unassigned.";
          void loadAssignees(true);
        }
        setFieldErrors(serverFieldErrors);
        setFormError(safeActionError(details.code));
        return;
      }

      const writeResult = parseActionWriteResponse(data);
      if (!writeResult) {
        if (creating && createRequest) {
          setPendingCreateRequest(createRequest);
          setFormError(
            "The save response could not be confirmed. Retry uses the exact same request; your entries are locked until the result is confirmed."
          );
        } else {
          setFormError(
            "The server returned an unexpected response. Review the refreshed action before trying again."
          );
          await refreshForConflict();
        }
        return;
      }
      const savedAction = writeResult.action;
      setPendingCreateRequest(null);
      setActions((previous) =>
        sortActions(
          creating
            ? [...previous, savedAction]
            : previous.map((action) =>
                action.id === savedAction.id ? savedAction : action
              )
        )
      );
      setCurrentTicketVersion(writeResult.ticketVersion);
      onTicketVersionChange?.(writeResult.ticketVersion, savedAction.updatedAt);
      if (isCreateRetry) {
        await loadActions();
        onRefreshTicket?.();
      }
      setHistoryByAction((previous) => {
        const next = { ...previous };
        delete next[savedAction.id];
        return next;
      });
      setExpandedHistoryId(null);
      setSuccess(
        creating
          ? "Action added."
          : savedAction.status === "COMPLETED"
            ? "Action completed."
            : savedAction.status === "CANCELLED"
              ? "Action cancelled."
              : "Action updated."
      );
      closeEditor();
    } catch {
      if (creating && createRequest) {
        setPendingCreateRequest(createRequest);
        setFormError(
          "The save result is unknown. Retry sends the exact same request; your entries are locked until the result is confirmed."
        );
      } else {
        setFormError(
          "The save result could not be confirmed. Your entries are kept; review the refreshed action before trying again."
        );
        await refreshForConflict();
      }
    } finally {
      setSaving(false);
      if (confirmedCancellation) setConfirmation(null);
    }
  }

  function handleEditorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirmationTriggerRef.current = saveButtonRef.current;
    void saveEditor();
  }

  async function loadHistory(actionId: number) {
    setHistoryByAction((previous) => ({
      ...previous,
      [actionId]: { loading: true, events: [], error: null },
    }));
    try {
      const response = await getTicketActionHistory(ticketId, actionId);
      if (response.status === 403) {
        setHistoryByAction((previous) => ({
          ...previous,
          [actionId]: {
            loading: false,
            events: [],
            error: "You do not have permission to view this action history.",
          },
        }));
        return;
      }
      if (response.status === 404) {
        setHistoryByAction((previous) => ({
          ...previous,
          [actionId]: {
            loading: false,
            events: [],
            error: "This action history could not be found.",
          },
        }));
        return;
      }
      if (!response.ok) throw new Error("history request failed");
      const data: unknown = await response.json();
      const events = parseActionEvents(data);
      if (!events) throw new Error("unexpected history response");
      setHistoryByAction((previous) => ({
        ...previous,
        [actionId]: {
          loading: false,
          events,
          error: null,
        },
      }));
    } catch {
      setHistoryByAction((previous) => ({
        ...previous,
        [actionId]: {
          loading: false,
          events: [],
          error: "Unable to load action history. Retry to try again.",
        },
      }));
    }
  }

  async function toggleHistory(actionId: number) {
    if (expandedHistoryId === actionId) {
      setExpandedHistoryId(null);
      return;
    }
    setExpandedHistoryId(actionId);
    if (historyByAction[actionId] && !historyByAction[actionId].error) return;
    await loadHistory(actionId);
  }

  function handleConfirmation() {
    const currentConfirmation = confirmation;
    if (currentConfirmation === "cancel-action") {
      void saveEditor(true);
    } else if (currentConfirmation === "discard-conflict") {
      closeEditor();
    }
  }

  const showMutationControls =
    writesAllowed && !loading && !forbidden && !notFound && !failure;

  return (
    <section
      ref={panelRef}
      className="zg-card p-4 mb-4"
      aria-labelledby="actions-taken-heading"
      data-testid="actions-taken-panel"
      tabIndex={-1}
    >
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
        <h2
          className="h5 fw-bold text-zen-primary mb-0"
          id="actions-taken-heading"
        >
          Actions Taken
          {!loading && !failure && !forbidden && !notFound
            ? " (" + actions.length + ")"
            : ""}
        </h2>
        {showMutationControls && (
          <button
            type="button"
            className="btn btn-zen-primary btn-sm align-self-start align-self-sm-auto"
            onClick={beginCreate}
            data-testid="action-add-btn"
          >
            Add Action
          </button>
        )}
      </div>

      {loading && (
        <div data-testid="actions-loading" aria-label="Loading Actions Taken">
          <p className="small text-muted mb-2" role="status">
            Loading Actions Taken…
          </p>
          <div className="zg-skeleton-line mb-2" style={{ width: "90%" }} />
          <div className="zg-skeleton-line" style={{ width: "65%" }} />
        </div>
      )}
      {forbidden && (
        <div
          className="alert alert-warning small mb-0"
          role="alert"
          data-testid="actions-forbidden"
        >
          You do not have permission to view Actions Taken for this Ticket.
        </div>
      )}
      {notFound && (
        <div
          className="alert alert-warning small mb-0"
          role="alert"
          data-testid="actions-not-found"
        >
          This Ticket or its Actions Taken could not be found.
        </div>
      )}
      {failure && (
        <div
          className="alert alert-danger small mb-0"
          role="alert"
          data-testid="actions-failure"
        >
          <span>{failure}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={() => void loadActions()}
          >
            Retry
          </button>
        </div>
      )}
      {!loading &&
        !failure &&
        !forbidden &&
        !notFound &&
        actions.length === 0 && (
          <div data-testid="actions-empty">
            <p className="text-muted small mb-2">
              No Actions Taken have been recorded.
            </p>
            {showMutationControls && (
              <p className="small mb-0">
                Add an action to record work completed for this Ticket.
              </p>
            )}
          </div>
        )}

      {!loading &&
        !failure &&
        !forbidden &&
        !notFound &&
        actions.length > 0 && (
          <ul
            className="list-unstyled d-flex flex-column gap-3 mb-0"
            data-testid="actions-list"
          >
            {actions.map((action) => {
              const historyState = historyByAction[action.id];
              const historyExpanded = expandedHistoryId === action.id;
              const canEditAction =
                writesAllowed && !TERMINAL_ACTION_STATUSES.has(action.status);
              return (
                <li key={action.id}>
                  <article
                    className="zg-readonly-panel p-3"
                    data-testid="action-item"
                    aria-label={"Action Taken: " + action.title}
                  >
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-2 mb-3">
                      <h3 className="h6 fw-semibold mb-0 text-zen-primary">
                        {action.title}
                      </h3>
                      <span
                        className="badge bg-light text-dark border"
                        data-testid="action-status"
                      >
                        {ACTION_STATUS_LABELS[action.status]}
                      </span>
                    </div>
                    <dl className="row g-2 small mb-0">
                      <div className="col-12">
                        <dt className="text-muted">Action Description</dt>
                        <dd
                          className="mb-0 text-zen-body"
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {action.details}
                        </dd>
                      </div>
                      <div className="col-12">
                        <dt className="text-muted">Result</dt>
                        <dd
                          className="mb-0 text-zen-body"
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {textValue(action.result)}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Performed by</dt>
                        <dd className="mb-0 text-zen-body">
                          {action.performedBy?.name ?? "Unknown"}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Assignee</dt>
                        <dd className="mb-0 text-zen-body">
                          {action.assignee?.name ?? "Unassigned"}
                          {action.assignee && !action.assignee.isActive && (
                            <span className="badge bg-secondary ms-2">
                              Inactive
                            </span>
                          )}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">
                          Action create date/time (Bangkok)
                        </dt>
                        <dd className="mb-0 text-zen-body">
                          {formatBangkokDateTime(action.createdAt)}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Last updated (Bangkok)</dt>
                        <dd className="mb-0 text-zen-body">
                          {formatBangkokDateTime(action.updatedAt)}
                        </dd>
                      </div>
                      {action.completedAt && (
                        <div className="col-12 col-md-6">
                          <dt className="text-muted">Completed (Bangkok)</dt>
                          <dd className="mb-0 text-zen-body">
                            {formatBangkokDateTime(action.completedAt)}
                          </dd>
                        </div>
                      )}
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Follow-up required</dt>
                        <dd className="mb-0 text-zen-body">
                          {action.followUpRequired ? "Yes" : "No"}
                        </dd>
                      </div>
                      <div className="col-12">
                        <dt className="text-muted">Follow-up note</dt>
                        <dd
                          className="mb-0 text-zen-body"
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {textValue(action.followUpNote)}
                        </dd>
                      </div>
                      <div className="col-12">
                        <dt className="text-muted">Attachment notes</dt>
                        <dd
                          className="mb-0 text-zen-body"
                          style={{
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {textValue(action.attachmentNotes)}
                        </dd>
                      </div>
                    </dl>

                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {canEditAction && (
                        <button
                          type="button"
                          className="btn btn-zen-secondary btn-sm"
                          aria-label={"Edit " + action.title}
                          onClick={(event) => beginEdit(action, event)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-zen-secondary btn-sm"
                        aria-expanded={historyExpanded}
                        aria-controls={"action-history-" + action.id}
                        onClick={() => void toggleHistory(action.id)}
                      >
                        {historyExpanded
                          ? "Hide history for " + action.title
                          : "View history for " + action.title}
                      </button>
                    </div>

                    {historyExpanded && (
                      <div
                        className="border-top mt-3 pt-3"
                        id={"action-history-" + action.id}
                        data-testid="action-history"
                        aria-label={"History for " + action.title}
                      >
                        <h4 className="small fw-semibold mb-2">
                          Action history
                        </h4>
                        {historyState?.loading && (
                          <p className="small text-muted mb-0" role="status">
                            Loading action history…
                          </p>
                        )}
                        {historyState?.error && (
                          <div
                            className="alert alert-danger small mb-0"
                            role="alert"
                          >
                            {historyState.error}
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger ms-2"
                              onClick={() => void loadHistory(action.id)}
                            >
                              Retry
                            </button>
                          </div>
                        )}
                        {historyState &&
                          !historyState.loading &&
                          !historyState.error &&
                          historyState.events.length === 0 && (
                            <p className="small text-muted mb-0">
                              No action history is available.
                            </p>
                          )}
                        {historyState &&
                          !historyState.loading &&
                          historyState.events.length > 0 && (
                            <ol className="list-unstyled d-flex flex-column gap-2 mb-0">
                              {historyState.events.map((event) => (
                                <li
                                  key={event.id}
                                  className="border rounded bg-white p-2"
                                  data-testid="action-history-event"
                                >
                                  <div className="d-flex flex-column flex-sm-row justify-content-between gap-1">
                                    <span className="fw-semibold">
                                      {event.actor?.name ?? "Unknown"} ·{" "}
                                      {event.type.replaceAll("_", " ")}
                                    </span>
                                    <time
                                      className="text-muted"
                                      dateTime={event.occurredAt}
                                    >
                                      {formatBangkokDateTime(event.occurredAt)}
                                    </time>
                                  </div>
                                  {event.before ? (
                                    <ul className="small mb-0 mt-2">
                                      {changedFields(event).map((change) => (
                                        <li key={change.label}>
                                          {change.label}: {change.before} →{" "}
                                          {change.after}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <ul className="small mb-0 mt-2">
                                      {HISTORY_FIELDS.map(({ key, label }) => (
                                        <li key={key}>
                                          {label}:{" "}
                                          {historyValue(key, event.after[key])}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}

      {writeDisabledMessage && (
        <div className="alert alert-info small mt-3 mb-0" role="status">
          {writeDisabledMessage}
        </div>
      )}
      {success && (
        <div
          className="alert alert-success small mt-3 mb-0"
          role="status"
          data-testid="action-success"
        >
          {success}
        </div>
      )}

      {editorOpen && (
        <form
          className="border rounded p-3 mt-3"
          onSubmit={handleEditorSubmit}
          noValidate
          data-testid="action-editor"
          aria-label={creating ? "Add Action Taken" : "Edit Action Taken"}
        >
          <h3 className="h6 fw-semibold mb-3">
            {creating ? "Add Action Taken" : "Edit Action Taken"}
          </h3>
          {conflictMessage && (
            <div
              className="alert alert-warning small"
              role="status"
              data-testid="action-conflict"
            >
              <p className="mb-2">{conflictMessage}</p>
              {creating ? (
                <p className="mb-0">
                  Latest action list and Ticket version are loaded. Review the
                  list, then explicitly save this form again.
                </p>
              ) : conflictAction ? (
                <dl className="row g-1 mb-0">
                  <dt className="col-12">Latest saved title</dt>
                  <dd className="col-12">{conflictAction.title}</dd>
                  <dt className="col-12">Latest saved description</dt>
                  <dd
                    className="col-12"
                    style={{
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {conflictAction.details}
                  </dd>
                  <dt className="col-12">Latest saved result</dt>
                  <dd className="col-12">{textValue(conflictAction.result)}</dd>
                  <dt className="col-12">Latest saved status</dt>
                  <dd className="col-12">
                    {ACTION_STATUS_LABELS[conflictAction.status]}
                  </dd>
                  <dt className="col-12">Latest saved follow-up note</dt>
                  <dd className="col-12">
                    {textValue(conflictAction.followUpNote)}
                  </dd>
                  <dt className="col-12">Latest saved attachment notes</dt>
                  <dd className="col-12">
                    {textValue(conflictAction.attachmentNotes)}
                  </dd>
                </dl>
              ) : (
                <p className="mb-0">
                  The action is no longer in the latest list. Your unsaved form
                  is preserved, but it cannot be submitted.
                </p>
              )}
            </div>
          )}
          {formError && (
            <div
              className="alert alert-danger small"
              role={Object.keys(fieldErrors).length > 0 ? "status" : "alert"}
              data-testid="action-form-error"
            >
              {formError}
            </div>
          )}
          {Object.keys(fieldErrors).length > 0 && (
            <div
              className="alert alert-danger small"
              role="alert"
              data-testid="action-validation-summary"
            >
              Correct the highlighted fields before saving.
            </div>
          )}

          {creating && (
            <p className="small text-muted" data-testid="action-performed-by">
              Performed by: {performerName ?? "Signed-in staff account"} (set by
              server)
            </p>
          )}
          {creating && (
            <p className="small text-muted">
              New actions start as Planned. The creation time is assigned by the
              server.
            </p>
          )}

          <div className="mb-3">
            <label
              htmlFor="action-title"
              className="form-label small fw-semibold"
            >
              Action title
            </label>
            <input
              id="action-title"
              ref={titleRef}
              className="form-control"
              maxLength={120}
              value={formValues.title}
              disabled={saving || pendingCreateRequest !== null}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={
                fieldErrors.title ? "action-title-error" : undefined
              }
              onChange={(event) => changeForm("title", event.target.value)}
            />
            {fieldErrors.title && (
              <div id="action-title-error" className="text-danger small mt-1">
                {fieldErrors.title}
              </div>
            )}
            <div className="form-text">
              {formValues.title.length}/120 characters
            </div>
          </div>

          <div className="mb-3">
            <label
              htmlFor="action-description"
              className="form-label small fw-semibold"
            >
              Action description
            </label>
            <textarea
              id="action-description"
              className="form-control"
              rows={3}
              maxLength={2000}
              value={formValues.details}
              disabled={saving || pendingCreateRequest !== null}
              aria-invalid={Boolean(fieldErrors.details)}
              aria-describedby={
                fieldErrors.details ? "action-description-error" : undefined
              }
              onChange={(event) => changeForm("details", event.target.value)}
            />
            {fieldErrors.details && (
              <div
                id="action-description-error"
                className="text-danger small mt-1"
              >
                {fieldErrors.details}
              </div>
            )}
            <div className="form-text">
              {formValues.details.length}/2000 characters
            </div>
          </div>

          {!creating && (
            <div className="mb-3">
              <label
                htmlFor="action-result"
                className="form-label small fw-semibold"
              >
                Action result
              </label>
              <textarea
                id="action-result"
                className="form-control"
                rows={3}
                maxLength={2000}
                value={formValues.result}
                disabled={saving}
                aria-invalid={Boolean(fieldErrors.result)}
                aria-describedby={
                  fieldErrors.result ? "action-result-error" : undefined
                }
                onChange={(event) => changeForm("result", event.target.value)}
              />
              {fieldErrors.result && (
                <div
                  id="action-result-error"
                  className="text-danger small mt-1"
                >
                  {fieldErrors.result}
                </div>
              )}
              <div className="form-text">
                {formValues.result.length}/2000 characters. Required to complete
                an action.
              </div>
            </div>
          )}

          <div className="mb-3">
            <label
              htmlFor="action-assignee"
              className="form-label small fw-semibold"
            >
              Action assignee
            </label>
            <select
              id="action-assignee"
              className="form-select"
              value={formValues.assigneeId}
              disabled={
                saving || pendingCreateRequest !== null || assigneesLoading
              }
              aria-invalid={Boolean(fieldErrors.assigneeId)}
              aria-describedby={
                fieldErrors.assigneeId ? "action-assignee-error" : undefined
              }
              onChange={(event) => changeForm("assigneeId", event.target.value)}
            >
              <option value="">Unassigned</option>
              {assignees.map((assignee) => (
                <option key={assignee.id} value={String(assignee.id)}>
                  {assignee.name}
                </option>
              ))}
              {editingAction?.assignee &&
                !assignees.some(
                  (assignee) => assignee.id === editingAction.assignee?.id
                ) && (
                  <option value={String(editingAction.assignee.id)}>
                    {editingAction.assignee.name}
                    {editingAction.assignee.isActive ? "" : " (inactive)"}
                  </option>
                )}
            </select>
            {fieldErrors.assigneeId && (
              <div
                id="action-assignee-error"
                className="text-danger small mt-1"
              >
                {fieldErrors.assigneeId}
              </div>
            )}
            {assigneesLoading && (
              <div className="form-text" role="status">
                Loading active IT Staff…
              </div>
            )}
            {assigneesError && (
              <div className="alert alert-warning small mt-2 mb-0" role="alert">
                {assigneesError}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary ms-2"
                  onClick={() => {
                    setAssigneesLoaded(false);
                    void loadAssignees(true);
                  }}
                >
                  Retry staff list
                </button>
              </div>
            )}
          </div>

          {!creating && (
            <div className="mb-3">
              <label
                htmlFor="action-status"
                className="form-label small fw-semibold"
              >
                Action status
              </label>
              <select
                id="action-status"
                className="form-select"
                value={formValues.status}
                disabled={saving}
                onChange={(event) => {
                  const status = event.target.value;
                  if (isActionStatus(status)) changeForm("status", status);
                }}
              >
                {getActionTransitions(editingAction?.status ?? "PLANNED").map(
                  (status) => (
                    <option key={status} value={status}>
                      {ACTION_STATUS_LABELS[status]}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="form-check mb-3">
            <input
              id="action-follow-up-required"
              type="checkbox"
              className="form-check-input"
              checked={formValues.followUpRequired}
              disabled={saving || pendingCreateRequest !== null}
              onChange={(event) =>
                changeForm("followUpRequired", event.target.checked)
              }
            />
            <label
              htmlFor="action-follow-up-required"
              className="form-check-label small fw-semibold"
            >
              Follow-up required
            </label>
          </div>

          {(formValues.followUpRequired ||
            formValues.followUpNote.length > 0) && (
            <div className="mb-3">
              <label
                htmlFor="action-follow-up-note"
                className="form-label small fw-semibold"
              >
                Follow-up note
              </label>
              <textarea
                id="action-follow-up-note"
                className="form-control"
                rows={2}
                maxLength={2000}
                value={formValues.followUpNote}
                disabled={saving || pendingCreateRequest !== null}
                aria-required={formValues.followUpRequired}
                aria-invalid={Boolean(fieldErrors.followUpNote)}
                aria-describedby={
                  fieldErrors.followUpNote
                    ? "action-follow-up-note-error"
                    : undefined
                }
                onChange={(event) =>
                  changeForm("followUpNote", event.target.value)
                }
              />
              {fieldErrors.followUpNote && (
                <div
                  id="action-follow-up-note-error"
                  className="text-danger small mt-1"
                >
                  {fieldErrors.followUpNote}
                </div>
              )}
              {!formValues.followUpRequired && (
                <div className="form-text">
                  Follow-up is optional. Keep this note to retain it, or clear
                  it to remove it.
                </div>
              )}
              <div className="form-text">
                {formValues.followUpNote.length}/2000 characters
              </div>
            </div>
          )}

          <div className="mb-3">
            <label
              htmlFor="action-attachment-notes"
              className="form-label small fw-semibold"
            >
              Attachment notes
            </label>
            <textarea
              id="action-attachment-notes"
              className="form-control"
              rows={2}
              maxLength={2000}
              value={formValues.attachmentNotes}
              disabled={saving || pendingCreateRequest !== null}
              aria-invalid={Boolean(fieldErrors.attachmentNotes)}
              aria-describedby={
                fieldErrors.attachmentNotes
                  ? "action-attachment-notes-error"
                  : undefined
              }
              onChange={(event) =>
                changeForm("attachmentNotes", event.target.value)
              }
            />
            {fieldErrors.attachmentNotes && (
              <div
                id="action-attachment-notes-error"
                className="text-danger small mt-1"
              >
                {fieldErrors.attachmentNotes}
              </div>
            )}
            <div className="form-text">
              Reference existing Ticket attachments; this does not upload a
              file.
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2">
            <button
              type="submit"
              ref={saveButtonRef}
              className="btn btn-zen-primary btn-sm"
              onClick={(event) => {
                confirmationTriggerRef.current = event.currentTarget;
              }}
              disabled={
                saving ||
                !writesAllowed ||
                (conflictMessage !== null &&
                  editingActionId !== null &&
                  conflictAction === null)
              }
            >
              {saving
                ? "Saving…"
                : pendingCreateRequest
                  ? "Retry same create"
                  : creating
                    ? "Save Action"
                    : "Save Action"}
            </button>
            <button
              type="button"
              className="btn btn-zen-secondary btn-sm"
              disabled={saving || pendingCreateRequest !== null}
              onClick={requestEditorClose}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {confirmation && (
        <div
          className="zg-dialog-backdrop"
          data-testid="action-dialog-backdrop"
        >
          <div
            className="zg-card zg-dialog p-3"
            role="alertdialog"
            aria-modal="true"
            aria-label={
              confirmation === "cancel-action"
                ? "Confirm action cancellation"
                : "Confirm discarding conflict draft"
            }
            tabIndex={-1}
            ref={dialogRef}
            data-testid="action-confirmation"
          >
            <p className="small mb-3">
              {confirmation === "cancel-action"
                ? "Cancel this action? This is a terminal status; it cannot be edited afterward."
                : "Discard your unsaved action changes and the conflict draft?"}
            </p>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                disabled={saving}
                ref={dialogConfirmRef}
                onClick={handleConfirmation}
              >
                {saving
                  ? "Saving…"
                  : confirmation === "cancel-action"
                    ? "Yes, cancel action"
                    : "Discard changes"}
              </button>
              <button
                type="button"
                className="btn btn-zen-secondary btn-sm"
                disabled={saving}
                onClick={closeConfirmation}
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
