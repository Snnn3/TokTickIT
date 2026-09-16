import { useState, useEffect, useCallback, useRef } from "react";
import type {
  InternalNote,
  PublicComment,
  StaffAssignee,
  StaffTicketDetail as StaffTicket,
  TicketStatus,
} from "../types/ticket";
import { useAuth } from "../context/AuthContext";
import { useReferenceData } from "../hooks/useReferenceData";
import { useConfirmDialogFocus } from "../hooks/useConfirmDialogFocus";
import { legalStatusTargets, needsStatusConfirm } from "../utils/transitions";
import { formatDateTime, formatDateOnly } from "../utils/format";
import {
  ZenItPriorityBadge,
  ZenPriorityBadge,
  ZenStatusBadge,
} from "./ZenBadge";
import { AttachmentSection } from "./AttachmentSection";
import type { AttachmentRemovalUpdate } from "./AttachmentSection";
import type { AttachmentMetadata } from "../types/ticket";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const COMMENT_MAX_LENGTH = 2000;
const NOTE_MAX_LENGTH = 2000;

/**
 * Staff Ticket Detail [FR-23, FR-24, FR-25, FR-28, ui-spec section 7].
 *
 * Grouped read-only info, one operational card (owner select with a Claim
 * shortcut, IT Priority select, status select restricted to the legal targets
 * with a client-only confirm for Closed/Cancelled, and a Resolution Summary
 * that becomes required and focused when Resolved is chosen), plus the public
 * discussion in white and the private notes in amber with a lock and an
 * INTERNAL marker so the two are unmistakable. There is deliberately no
 * Service Actions surface anywhere in this component: that feature is out of
 * scope this sprint.
 *
 * When the viewer filed the ticket themselves the server answers with a
 * selfService marker and no notes; the operational card is then replaced by
 * an explanation and the notes card is absent, so the queue's Open action
 * never dead-ends while every mutation stays refused server-side [BR-25].
 */
export function StaffTicketDetail({
  ticketId,
  onBack,
}: StaffTicketDetailProps) {
  const { user } = useAuth();
  const { categories, systems } = useReferenceData();

  const [ticket, setTicket] = useState<StaffTicket | null>(null);
  const [selfService, setSelfService] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const [assignees, setAssignees] = useState<StaffAssignee[]>([]);

  const [comments, setComments] = useState<PublicComment[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);

  const [ownerBusy, setOwnerBusy] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [ownerSuccess, setOwnerSuccess] = useState(false);

  const [priorityBusy, setPriorityBusy] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [prioritySuccess, setPrioritySuccess] = useState(false);

  const [pendingStatus, setPendingStatus] = useState<TicketStatus | "">("");
  const [statusConfirm, setStatusConfirm] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusValidationError, setStatusValidationError] = useState<
    string | null
  >(null);
  const [statusSuccess, setStatusSuccess] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");

  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const statusDialogRef = useRef<HTMLDivElement>(null);
  const statusConfirmBtnRef = useRef<HTMLButtonElement>(null);

  const closeStatusDialog = useCallback(() => {
    if (!statusBusy) {
      setStatusConfirm(false);
    }
  }, [statusBusy]);

  useConfirmDialogFocus({
    open: statusConfirm,
    busy: statusBusy,
    dialogRef: statusDialogRef,
    initialFocusRef: statusConfirmBtnRef,
    onRequestClose: closeStatusDialog,
  });

  // The summary becomes required and focused the moment Resolved is chosen.
  useEffect(() => {
    if (pendingStatus === "RESOLVED") {
      summaryRef.current?.focus();
    }
  }, [pendingStatus]);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    setNotFound(false);
    setFailure(null);

    try {
      const [detailRes, assigneeRes] = await Promise.all([
        fetch(`/api/staff/tickets/${ticketId}`),
        fetch("/api/staff/assignees"),
      ]);

      if (detailRes.status === 403) {
        setForbidden(true);
        return;
      }
      if (detailRes.status === 404) {
        setNotFound(true);
        return;
      }
      if (!detailRes.ok) {
        const data = await detailRes.json().catch(() => ({}));
        setFailure(data?.error?.message || "Failed to load ticket detail.");
        return;
      }

      const data = await detailRes.json();
      setTicket(data.ticket);
      setSelfService(data.selfService === true);
      setComments(data.ticket?.publicComments ?? []);
      // A self-filed ticket carries no notes key at all; anything else
      // carries the array (possibly empty) [BR-04, BR-25].
      setNotes(data.ticket?.internalNotes ?? []);
      setSummaryDraft(data.ticket?.resolutionSummary ?? "");
      setPendingStatus("");
      setStatusSuccess(false);
      setStatusError(null);
      setStatusValidationError(null);

      if (assigneeRes.ok) {
        const assigneeData = await assigneeRes.json().catch(() => ({}));
        setAssignees(assigneeData.assignees ?? []);
      }
    } catch {
      setFailure("Network error. Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAttachmentAdded = (newAttachment: AttachmentMetadata) => {
    setTicket((prev) => {
      if (!prev) return prev;
      return { ...prev, attachments: [...prev.attachments, newAttachment] };
    });
  };

  const handleAttachmentRemoved = (update: AttachmentRemovalUpdate) => {
    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: prev.attachments.map((att) =>
          att.id === update.attachmentId
            ? {
                ...att,
                removedReason: update.removedReason,
                removedAt: update.removedAt,
              }
            : att
        ),
      };
    });
  };

  async function patchOwner(ownerId: number | null) {
    setOwnerBusy(true);
    setOwnerError(null);
    setOwnerSuccess(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOwnerError(data?.error?.message || "Failed to update the owner.");
        return;
      }
      const data = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              owner: data.owner,
              status: data.status ?? prev.status,
            }
          : prev
      );
      setOwnerSuccess(true);
    } catch {
      setOwnerError("Network error. Unable to update the owner.");
    } finally {
      setOwnerBusy(false);
    }
  }

  async function patchPriority(itPriority: string) {
    setPriorityBusy(true);
    setPriorityError(null);
    setPrioritySuccess(false);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Requested Priority is never sent: it is immutable after creation
        // and no body key can change it [BR-11].
        body: JSON.stringify({ itPriority }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPriorityError(
          data?.error?.message || "Failed to update the IT priority."
        );
        return;
      }
      const data = await res.json();
      setTicket((prev) =>
        prev ? { ...prev, itPriority: data.itPriority } : prev
      );
      setPrioritySuccess(true);
    } catch {
      setPriorityError("Network error. Unable to update the IT priority.");
    } finally {
      setPriorityBusy(false);
    }
  }

  async function patchStatus(target: TicketStatus, summary?: string) {
    setStatusBusy(true);
    setStatusError(null);
    setStatusValidationError(null);
    setStatusSuccess(false);
    try {
      // Confirmation for Closed/Cancelled lives in the dialog above; the
      // server takes no confirm flag, so none is sent here by construction.
      const payload: { status: TicketStatus; resolutionSummary?: string } =
        target === "RESOLVED" && summary !== undefined
          ? { status: target, resolutionSummary: summary }
          : { status: target };
      const res = await fetch(`/api/staff/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // An illegal transition surfaces the server reason, never a generic
        // error, so staff learn what the workflow permits.
        setStatusError(data?.error?.message || "Failed to update the status.");
        return;
      }
      const data = await res.json();
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: data.status,
              resolutionSummary:
                data.resolutionSummary ?? prev.resolutionSummary,
              appearsResolvedAt: null,
            }
          : prev
      );
      if (data.status === "REOPENED") {
        setSummaryDraft("");
      } else if (data.resolutionSummary !== undefined) {
        setSummaryDraft(data.resolutionSummary ?? "");
      }
      setPendingStatus("");
      setStatusConfirm(false);
      setStatusSuccess(true);
    } catch {
      setStatusError("Network error. Unable to update the status.");
    } finally {
      setStatusBusy(false);
    }
  }

  function handleStatusSave() {
    if (!pendingStatus) {
      setStatusValidationError("Choose a new status first.");
      return;
    }
    if (pendingStatus === "RESOLVED") {
      const trimmed = summaryDraft.trim();
      if (!trimmed) {
        setStatusValidationError(
          "A resolution summary is required to resolve this ticket."
        );
        summaryRef.current?.focus();
        return;
      }
      if (trimmed.length > 2000) {
        setStatusValidationError(
          "Resolution summary must not exceed 2000 characters."
        );
        return;
      }
      void patchStatus(pendingStatus, trimmed);
      return;
    }
    if (needsStatusConfirm(pendingStatus)) {
      setStatusConfirm(true);
      return;
    }
    void patchStatus(pendingStatus);
  }

  async function handleCommentPost() {
    const trimmed = commentDraft.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setCommentError(
        `Comment must not exceed ${COMMENT_MAX_LENGTH} characters.`
      );
      return;
    }
    setCommentBusy(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCommentError(data?.error?.message || "Failed to post comment.");
        return;
      }
      const created: PublicComment = await res.json();
      setComments((prev) => [...prev, created]);
      setCommentDraft("");
    } catch {
      setCommentError("Network error. Unable to post the comment.");
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleNotePost() {
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      setNoteError("Note cannot be empty.");
      return;
    }
    if (trimmed.length > NOTE_MAX_LENGTH) {
      setNoteError(`Note must not exceed ${NOTE_MAX_LENGTH} characters.`);
      return;
    }
    setNoteBusy(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNoteError(data?.error?.message || "Failed to post note.");
        return;
      }
      const created: InternalNote = await res.json();
      setNotes((prev) => [...prev, created]);
      setNoteDraft("");
    } catch {
      setNoteError("Network error. Unable to post the note.");
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="my-2" data-testid="staff-detail-loading">
        <div className="zg-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="zg-skeleton-line" style={{ width: "200px" }} />
            <div className="zg-skeleton-line" style={{ width: "120px" }} />
          </div>
          <div className="zg-skeleton-line mb-2" style={{ width: "70%" }} />
          <div className="zg-skeleton-line" style={{ width: "40%" }} />
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="my-2" data-testid="staff-detail-forbidden">
        <div className="zg-card p-4 text-center py-5">
          <div className="h5 fw-semibold mb-2 text-zen-primary">
            You do not have access to this ticket
          </div>
          <p className="text-muted small mb-3">
            Your role does not have access to this screen. The server refuses
            the request as well, whatever the browser shows.
          </p>
          <button
            type="button"
            className="btn btn-zen-secondary btn-sm"
            onClick={onBack}
          >
            Back to queue
          </button>
        </div>
      </div>
    );
  }

  if (notFound || !ticket) {
    if (notFound || (!loading && !failure)) {
      return (
        <div className="my-2" data-testid="staff-detail-error">
          <div className="zg-card p-4 text-center py-5">
            <div className="alert alert-danger mb-4 text-start">
              Ticket not found. It may have been deleted or the ID is incorrect.
            </div>
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={onBack}
            >
              Back to queue
            </button>
          </div>
        </div>
      );
    }
  }

  if (failure) {
    return (
      <div className="my-2" data-testid="staff-detail-failure">
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          role="alert"
        >
          <span>{failure}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => fetchDetail()}
          >
            Retry
          </button>
        </div>
        <button
          type="button"
          className="btn btn-zen-secondary btn-sm"
          onClick={onBack}
        >
          Back to queue
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="my-2" data-testid="staff-detail-error">
        <div className="zg-card p-4 text-center py-5">
          <div className="alert alert-danger mb-4 text-start">
            Ticket not found.
          </div>
          <button
            type="button"
            className="btn btn-zen-primary"
            onClick={onBack}
          >
            Back to queue
          </button>
        </div>
      </div>
    );
  }

  const categoryDisplayName =
    categories.find((c) => c.id === ticket.categoryId)?.name || "Unknown";
  const systemDisplayName =
    systems.find((s) => s.id === ticket.systemId)?.name || "Unknown";
  const legalTargets = legalStatusTargets(ticket.status);

  return (
    <div className="my-2" data-testid="staff-detail-view">
      <div className="zg-card p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-zen-secondary btn-sm"
              onClick={onBack}
              aria-label="Back to Ticket Queue"
            >
              <span>←</span>
              <span>Back to Queue</span>
            </button>
            <h1
              className="h4 fw-bold mb-0 text-zen-primary"
              data-testid="staff-detail-number"
            >
              {ticket.number}
            </h1>
          </div>
          <ZenStatusBadge status={ticket.status} />
        </div>

        <div className="row g-3 mb-3">
          <div className="col-12 col-md-6">
            <div
              className="zg-readonly-panel p-3 h-100"
              data-testid="system-group"
            >
              <h2
                className="small text-muted text-uppercase fw-bold mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
              >
                System
              </h2>
              <div className="row g-2 small">
                <div className="col-6 text-muted">Ticket Number:</div>
                <div className="col-6 fw-semibold text-zen-primary">
                  {ticket.number}
                </div>
                <div className="col-6 text-muted">Ticket Date:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {formatDateOnly(ticket.ticketDate)}
                </div>
                <div className="col-6 text-muted">Status:</div>
                <div className="col-6">
                  <ZenStatusBadge status={ticket.status} />
                </div>
                <div className="col-6 text-muted">Requester:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {ticket.requester?.name || "Unknown"}
                </div>
                <div className="col-6 text-muted">Owner:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {ticket.owner ? ticket.owner.name : "Unassigned"}
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div
              className="zg-readonly-panel p-3 h-100"
              data-testid="classification-group"
            >
              <h2
                className="small text-muted text-uppercase fw-bold mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
              >
                Classification
              </h2>
              <div className="row g-2 small">
                <div className="col-6 text-muted">Category:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {categoryDisplayName}
                </div>
                <div className="col-6 text-muted">Related System:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {systemDisplayName}
                </div>
                <div className="col-6 text-muted">Requested Priority:</div>
                <div className="col-6" data-testid="requested-priority-badge">
                  <ZenPriorityBadge priority={ticket.requestedPriority} />
                </div>
                <div className="col-6 text-muted">IT Priority:</div>
                <div className="col-6">
                  <ZenItPriorityBadge priority={ticket.itPriority} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="zg-readonly-panel p-3 mb-3"
          data-testid="description-group"
        >
          <h2
            className="small text-muted text-uppercase fw-bold mb-2"
            style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
          >
            Description
          </h2>
          <div
            className="text-zen-body small"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {ticket.description}
          </div>
        </div>

        {ticket.appearsResolvedAt && (
          <div
            className="alert alert-warning d-flex align-items-center gap-2 mb-3"
            data-testid="appears-resolved-banner"
            role="status"
          >
            <span className="badge badge-zen-appears-resolved">
              REQUESTER SAYS FIXED
            </span>
            <span className="small">
              The requester marked this as appears resolved — verify before
              closing.
            </span>
          </div>
        )}
      </div>

      {selfService ? (
        <div className="zg-card p-4 mb-4" data-testid="self-service-panel">
          <h2 className="h5 fw-bold text-zen-primary mb-2">
            Handled by another staff member
          </h2>
          <p className="text-muted small mb-0">
            You filed this ticket, so it must be handled by another staff
            member. Operational controls are hidden here; use the requester
            screens to follow or discuss it.
          </p>
        </div>
      ) : (
        <div className="zg-card p-4 mb-4" data-testid="operational-card">
          <h2 className="h5 fw-bold text-zen-primary mb-3">
            Operational controls
          </h2>

          <div className="mb-3">
            <label
              htmlFor="staff-owner-select"
              className="form-label small fw-semibold"
            >
              Ticket owner
            </label>
            <div className="d-flex gap-2 align-items-start">
              <select
                id="staff-owner-select"
                aria-label="Ticket owner"
                className="form-select"
                value={ticket.owner?.id ?? ""}
                disabled={ownerBusy}
                onChange={(e) => {
                  const value = e.target.value;
                  void patchOwner(value === "" ? null : Number(value));
                }}
                data-testid="owner-select"
              >
                <option value="">Unassigned</option>
                {assignees.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-zen-secondary btn-sm text-nowrap"
                disabled={ownerBusy || user?.id == null}
                onClick={() => {
                  if (user) void patchOwner(user.id);
                }}
                data-testid="claim-btn"
              >
                {ownerBusy ? "Claiming…" : "Claim"}
              </button>
            </div>
            {ownerError && (
              <div
                className="alert alert-danger small mt-2 mb-0"
                data-testid="owner-error"
                role="alert"
              >
                {ownerError}
              </div>
            )}
            {ownerSuccess && (
              <div
                className="alert alert-success small mt-2 mb-0"
                data-testid="owner-success"
                role="status"
              >
                Owner updated.
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="staff-it-priority-select"
              className="form-label small fw-semibold"
            >
              IT priority
            </label>
            <select
              id="staff-it-priority-select"
              aria-label="IT priority"
              className="form-select"
              value={ticket.itPriority}
              disabled={priorityBusy}
              onChange={(e) => void patchPriority(e.target.value)}
              data-testid="priority-select"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
            {priorityError && (
              <div
                className="alert alert-danger small mt-2 mb-0"
                data-testid="priority-error"
                role="alert"
              >
                {priorityError}
              </div>
            )}
            {prioritySuccess && (
              <div
                className="alert alert-success small mt-2 mb-0"
                data-testid="priority-success"
                role="status"
              >
                IT priority updated.
              </div>
            )}
          </div>

          <div className="mb-3">
            <label
              htmlFor="staff-status-select"
              className="form-label small fw-semibold"
            >
              New status
            </label>
            <select
              id="staff-status-select"
              aria-label="New status"
              className="form-select"
              value={pendingStatus}
              disabled={statusBusy}
              onChange={(e) => {
                const value = e.target.value as TicketStatus | "";
                setPendingStatus(value);
                setStatusError(null);
                setStatusValidationError(null);
                setStatusSuccess(false);
                if (value !== "" && needsStatusConfirm(value)) {
                  setStatusConfirm(true);
                }
              }}
              data-testid="status-select"
            >
              <option value="">Select new status</option>
              {legalTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label
              htmlFor="staff-resolution-summary"
              className="form-label small fw-semibold"
            >
              Resolution summary{" "}
              {pendingStatus === "RESOLVED" && (
                <span className="text-danger" aria-hidden="true">
                  *
                </span>
              )}
            </label>
            <textarea
              id="staff-resolution-summary"
              ref={summaryRef}
              className="form-control"
              rows={3}
              maxLength={2000}
              value={summaryDraft}
              disabled={statusBusy}
              onChange={(e) => setSummaryDraft(e.target.value)}
              placeholder="Explain what was done to resolve this ticket…"
              data-testid="resolution-summary-input"
              aria-required={pendingStatus === "RESOLVED"}
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {summaryDraft.length}/2000 characters
              </span>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                disabled={statusBusy || !pendingStatus}
                onClick={handleStatusSave}
                data-testid="status-save-btn"
              >
                {statusBusy ? "Saving…" : "Save status"}
              </button>
            </div>
            {statusValidationError && (
              <div
                className="alert alert-danger small mt-2 mb-0"
                data-testid="status-validation-error"
                role="alert"
              >
                {statusValidationError}
              </div>
            )}
            {statusError && (
              <div
                className="alert alert-danger small mt-2 mb-0"
                data-testid="status-error"
                role="alert"
              >
                {statusError}
              </div>
            )}
            {statusSuccess && (
              <div
                className="alert alert-success small mt-2 mb-0"
                data-testid="status-success"
                role="status"
              >
                Status updated.
              </div>
            )}
          </div>

          {statusConfirm && pendingStatus && (
            <div
              className="zg-card p-3 border"
              data-testid="status-confirm"
              role="dialog"
              aria-label={`Confirm ${pendingStatus}`}
              tabIndex={-1}
              ref={statusDialogRef}
            >
              <p className="small mb-3">
                {pendingStatus === "CLOSED"
                  ? "Close this ticket? The requester will no longer be able to reopen it."
                  : "Cancel this ticket? This ends the workflow for this request."}
              </p>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-zen-primary btn-sm"
                  disabled={statusBusy}
                  onClick={() => void patchStatus(pendingStatus)}
                  data-testid="status-confirm-btn"
                  ref={statusConfirmBtnRef}
                >
                  {statusBusy
                    ? "Saving…"
                    : pendingStatus === "CLOSED"
                      ? "Yes, close it"
                      : "Yes, cancel it"}
                </button>
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm"
                  disabled={statusBusy}
                  onClick={closeStatusDialog}
                  data-testid="status-cancel-btn"
                >
                  Keep working
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="zg-card p-4 mb-4" data-testid="comments-section">
        <h2 className="h5 fw-bold text-zen-primary mb-3">Public Comments</h2>
        {comments.length === 0 ? (
          <p className="text-muted small mb-3" data-testid="comments-empty">
            No comments yet. Start the discussion with the requester below.
          </p>
        ) : (
          <ul
            className="list-unstyled d-flex flex-column gap-2 mb-3"
            data-testid="comment-list"
          >
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="zg-comment-card p-3 border rounded bg-white"
                data-testid="comment-item"
              >
                <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                  <span className="fw-semibold small text-zen-body">
                    {comment.author?.name || "Unknown"}
                  </span>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>
                <div
                  className="small text-zen-body"
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {comment.body}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!selfService && (
          <>
            <label
              htmlFor="staff-comment-composer"
              className="form-label small fw-semibold"
            >
              Add a public comment
            </label>
            <textarea
              id="staff-comment-composer"
              className="form-control"
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              value={commentDraft}
              disabled={commentBusy}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Discuss publicly with the requester…"
              data-testid="comment-composer"
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {commentDraft.length}/{COMMENT_MAX_LENGTH} characters
              </span>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                disabled={commentBusy}
                onClick={() => void handleCommentPost()}
                data-testid="comment-post-btn"
              >
                {commentBusy ? "Posting…" : "Post comment"}
              </button>
            </div>
          </>
        )}
        {selfService && (
          <>
            <label
              htmlFor="staff-comment-composer"
              className="form-label small fw-semibold"
            >
              Add a public comment
            </label>
            <textarea
              id="staff-comment-composer"
              className="form-control"
              rows={3}
              maxLength={COMMENT_MAX_LENGTH}
              value={commentDraft}
              disabled={commentBusy}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Discuss publicly with IT Staff…"
              data-testid="comment-composer"
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                {commentDraft.length}/{COMMENT_MAX_LENGTH} characters
              </span>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                disabled={commentBusy}
                onClick={() => void handleCommentPost()}
                data-testid="comment-post-btn"
              >
                {commentBusy ? "Posting…" : "Post comment"}
              </button>
            </div>
          </>
        )}
        {commentError && (
          <div
            className="alert alert-danger small mt-2 mb-0"
            data-testid="comment-error"
            role="alert"
          >
            {commentError}
          </div>
        )}
      </div>

      {!selfService && (
        <div
          className="zg-card zg-note-card p-4 mb-4"
          data-testid="internal-notes"
        >
          <h2 className="h5 fw-bold text-zen-primary mb-1">
            <span aria-hidden="true">🔒</span> Internal Notes{" "}
            <span className="badge badge-zen-internal">INTERNAL</span>
          </h2>
          <p className="small text-muted mb-3">
            <span aria-hidden="true">🔒</span> INTERNAL — Staff only. Private —
            never shown to the Requester.
          </p>
          {notes.length === 0 ? (
            <p className="text-muted small mb-3" data-testid="notes-empty">
              No internal notes yet. Keep operational context here.
            </p>
          ) : (
            <ul
              className="list-unstyled d-flex flex-column gap-2 mb-3"
              data-testid="note-list"
            >
              {notes.map((note) => (
                <li
                  key={note.id}
                  className="zg-note-item p-3 border rounded"
                  data-testid="note-item"
                >
                  <div className="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                    <span className="fw-semibold small text-zen-body">
                      {note.author?.name || "Unknown"}
                    </span>
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {formatDateTime(note.createdAt)}
                    </span>
                  </div>
                  <div
                    className="small text-zen-body"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {note.body}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <label
            htmlFor="staff-note-composer"
            className="form-label small fw-semibold"
          >
            Add an internal note
          </label>
          <textarea
            id="staff-note-composer"
            className="form-control"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={noteDraft}
            disabled={noteBusy}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Keep private operational context here…"
            data-testid="note-composer"
          />
          <div className="d-flex justify-content-between align-items-center mt-2">
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              {noteDraft.length}/{NOTE_MAX_LENGTH} characters
            </span>
            <button
              type="button"
              className="btn btn-zen-primary btn-sm"
              disabled={noteBusy}
              onClick={() => void handleNotePost()}
              data-testid="note-post-btn"
            >
              {noteBusy ? "Posting…" : "Post note"}
            </button>
          </div>
          {noteError && (
            <div
              className="alert alert-danger small mt-2 mb-0"
              data-testid="note-error"
              role="alert"
            >
              {noteError}
            </div>
          )}
        </div>
      )}

      <div className="zg-card p-4 mb-4" data-testid="attachments-card">
        <AttachmentSection
          ticketId={ticket.id}
          attachments={ticket.attachments}
          onAttachmentAdded={handleAttachmentAdded}
          onAttachmentRemoved={handleAttachmentRemoved}
        />
      </div>

      <div
        className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-2 text-muted small border-top"
        data-testid="staff-detail-meta-footer"
      >
        <span>Created: {formatDateTime(ticket.createdAt)}</span>
        <span>Last Updated: {formatDateTime(ticket.updatedAt)}</span>
      </div>
    </div>
  );
}
