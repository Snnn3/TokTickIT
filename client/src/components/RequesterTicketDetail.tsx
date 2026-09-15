import { useState, useEffect, useCallback } from "react";
import type {
  TicketDetail,
  AttachmentMetadata,
  PublicComment,
} from "../types/ticket";
import { formatDateTime, formatDateOnly } from "../utils/format";
import { ZenPriorityBadge, ZenStatusBadge } from "./ZenBadge";
import { AttachmentSection } from "./AttachmentSection";
import type { AttachmentRemovalUpdate } from "./AttachmentSection";
import { useReferenceData } from "../hooks/useReferenceData";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const COMMENT_MAX_LENGTH = 2000;

export function RequesterTicketDetail({
  ticketId,
  onBack,
}: RequesterTicketDetailProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lab 3 requester additions [FR-21, FR-25, FR-28]: the public discussion
  // seeded from the detail payload, the appears-resolved signal state, and
  // the two confirmed actions. Internal Notes are never fetched and never
  // rendered here -- this component has no notes state at all [BR-04].
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [appearsResolvedAt, setAppearsResolvedAt] = useState<string | null>(
    null
  );
  const [signalConfirm, setSignalConfirm] = useState(false);
  const [signalBusy, setSignalBusy] = useState(false);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [signalSuccess, setSignalSuccess] = useState(false);
  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [reopenSuccess, setReopenSuccess] = useState(false);

  const { categories, systems } = useReferenceData();

  const fetchTicketDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`);

      if (res.status === 404) {
        setError(
          "Ticket not found. It may have been deleted or the ID is incorrect."
        );
        return;
      }

      if (res.status === 403) {
        setError(
          "Access denied. You do not have permission to view this ticket."
        );
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || "Failed to load ticket detail.");
        return;
      }

      const data = await res.json();
      setTicket(data.ticket);
      setComments(data.ticket?.publicComments ?? []);
      setAppearsResolvedAt(data.ticket?.appearsResolvedAt ?? null);
    } catch {
      setError("Network error. Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  const handleAttachmentAdded = (newAttachment: AttachmentMetadata) => {
    setTicket((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        attachments: [...prev.attachments, newAttachment],
      };
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

  const handleCommentPost = async () => {
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
  };

  const handleSignalConfirm = async () => {
    setSignalBusy(true);
    setSignalError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/appears-resolved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSignalError(
          data?.error?.message || "Failed to mark as appears resolved."
        );
        return;
      }
      const data = await res.json();
      setAppearsResolvedAt(data.appearsResolvedAt);
      setSignalConfirm(false);
      setSignalSuccess(true);
    } catch {
      setSignalError("Network error. Unable to mark as appears resolved.");
    } finally {
      setSignalBusy(false);
    }
  };

  const handleReopenConfirm = async () => {
    setReopenBusy(true);
    setReopenError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReopenError(data?.error?.message || "Failed to reopen the ticket.");
        return;
      }
      // Reopening clears the signal and the summary server-side [BR-26];
      // mirror that locally so the actions and panels follow at once.
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: "REOPENED",
              appearsResolvedAt: null,
              resolutionSummary: null,
            }
          : prev
      );
      setAppearsResolvedAt(null);
      setReopenConfirm(false);
      setReopenSuccess(true);
    } catch {
      setReopenError("Network error. Unable to reopen the ticket.");
    } finally {
      setReopenBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="my-2" data-testid="ticket-detail-loading">
        <div className="zg-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div
              className="skeleton-placeholder"
              style={{ width: "200px", height: "32px" }}
            />
            <div
              className="skeleton-placeholder"
              style={{ width: "120px", height: "32px" }}
            />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light rounded border">
                <div
                  className="skeleton-placeholder mb-2"
                  style={{ width: "40%", height: "16px" }}
                />
                <div
                  className="skeleton-placeholder"
                  style={{ width: "80%", height: "24px" }}
                />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light rounded border">
                <div
                  className="skeleton-placeholder mb-2"
                  style={{ width: "40%", height: "16px" }}
                />
                <div
                  className="skeleton-placeholder"
                  style={{ width: "80%", height: "24px" }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-light rounded border mb-4">
            <div
              className="skeleton-placeholder mb-2"
              style={{ width: "25%", height: "16px" }}
            />
            <div
              className="skeleton-placeholder mb-2"
              style={{ width: "100%", height: "20px" }}
            />
            <div
              className="skeleton-placeholder"
              style={{ width: "70%", height: "20px" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="my-2" data-testid="ticket-detail-error">
        <div className="zg-card p-4 text-center py-5">
          <div className="alert alert-danger mb-4 text-start">
            {error || "Ticket not found"}
          </div>
          <button
            type="button"
            className="btn btn-zen-primary"
            onClick={onBack}
            data-testid="back-to-tickets-error-btn"
          >
            ← Back to My Tickets
          </button>
        </div>
      </div>
    );
  }

  const categoryDisplayName =
    categories.find((c) => c.id === ticket.categoryId)?.name || "Unknown";

  const systemDisplayName =
    systems.find((s) => s.id === ticket.systemId)?.name || "Unknown";

  const requesterDisplayName = ticket.requester?.name || "Unknown";

  // The signal action stays available until signalled; the terminal states
  // refuse it server-side, so they do not offer it [BR-05, D3]. Reopen is
  // offered on Resolved alone [BR-13, D4].
  const showSignalAction =
    !appearsResolvedAt &&
    ticket.status !== "CLOSED" &&
    ticket.status !== "CANCELLED";
  const showReopenAction = ticket.status === "RESOLVED";

  return (
    <div className="my-2" data-testid="ticket-detail-view">
      {/* Main Ticket Detail Card */}
      <div className="zg-card p-4 mb-4">
        {/* Top Navigation Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-zen-secondary btn-sm d-flex align-items-center gap-1"
              onClick={onBack}
              aria-label="Back to My Tickets"
              data-testid="back-to-tickets-btn"
            >
              <span>←</span>
              <span>Back to My Tickets</span>
            </button>
            <h1
              className="h4 fw-bold mb-0 text-zen-primary"
              data-testid="ticket-detail-number"
            >
              {ticket.number}
            </h1>
          </div>
        </div>

        {/* Read-only Ticket Info [ui-spec §9, AC-23, Tablet two-column §11] */}
        <div className="row g-3 mb-3">
          {/* System Group */}
          <div className="col-12 col-md-6">
            <div
              className="zg-readonly-panel p-3 h-100"
              data-testid="system-metadata-group"
            >
              <h2
                className="small text-muted text-uppercase fw-bold mb-3"
                style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
              >
                System Metadata
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

                <div className="col-6 text-muted">Requester:</div>
                <div className="col-6 fw-medium text-zen-body">
                  {requesterDisplayName}
                </div>

                <div className="col-6 text-muted">Status:</div>
                <div className="col-6">
                  <ZenStatusBadge status={ticket.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Classification Group */}
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
                <div className="col-6">
                  <ZenPriorityBadge priority={ticket.requestedPriority} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Group (Summary & Description) */}
        <div
          className="zg-readonly-panel p-3 mb-3"
          data-testid="ticket-details-group"
        >
          <h2
            className="small text-muted text-uppercase fw-bold mb-2"
            style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
          >
            Summary
          </h2>
          <div
            className="fw-semibold text-zen-primary mb-3"
            data-testid="ticket-detail-summary"
          >
            {ticket.summary}
          </div>

          <h2
            className="small text-muted text-uppercase fw-bold mb-2"
            style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
          >
            Description
          </h2>
          <div
            className="zg-readonly-panel p-3 text-zen-body small"
            style={{ whiteSpace: "pre-wrap", minHeight: "100px" }}
            data-testid="ticket-detail-description"
          >
            {ticket.description}
          </div>
        </div>

        {/* Appears-resolved banner, once signalled [ui-spec section 5, D3] */}
        {appearsResolvedAt && (
          <div
            className="alert alert-warning d-flex align-items-center gap-2 mb-3"
            data-testid="appears-resolved-banner"
            role="status"
          >
            <span
              className="badge badge-zen-appears-resolved"
              data-testid="appears-resolved-badge"
            >
              REQUESTER SAYS FIXED
            </span>
            <span className="small">
              You marked this as appears resolved — IT Staff will verify.
            </span>
          </div>
        )}

        {/* Read-only Resolution Summary when the ticket carries one [FR-28] */}
        {ticket.resolutionSummary && (
          <div
            className="zg-readonly-panel p-3 mb-3"
            data-testid="resolution-summary-panel"
          >
            <h2
              className="small text-muted text-uppercase fw-bold mb-2"
              style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}
            >
              Resolution Summary
            </h2>
            <div
              className="text-zen-body small"
              style={{ whiteSpace: "pre-wrap" }}
              data-testid="resolution-summary-body"
            >
              {ticket.resolutionSummary}
            </div>
          </div>
        )}

        {/* Requester actions [FR-21, ui-spec section 5]. The outcome banners
            live outside the gated action block on purpose: signalling hides
            its own button and reopening hides both, so a banner nested inside
            would unmount in the same commit that reports success. */}
        {signalSuccess && (
          <div
            className="alert alert-success small mb-3"
            data-testid="appears-resolved-success"
            role="status"
          >
            Marked as appears resolved — IT Staff will verify.
          </div>
        )}
        {signalError && (
          <div
            className="alert alert-danger small mb-3"
            data-testid="appears-resolved-error"
            role="alert"
          >
            {signalError}
          </div>
        )}
        {reopenSuccess && (
          <div
            className="alert alert-success small mb-3"
            data-testid="reopen-success"
            role="status"
          >
            Ticket reopened — IT Staff will take another look.
          </div>
        )}
        {reopenError && (
          <div
            className="alert alert-danger small mb-3"
            data-testid="reopen-error"
            role="alert"
          >
            {reopenError}
          </div>
        )}
        {(showSignalAction || showReopenAction) && (
          <div
            className="d-flex flex-column gap-2 mb-3"
            data-testid="requester-actions"
          >
            {showSignalAction &&
              (signalConfirm ? (
                <div
                  className="zg-card p-3 border"
                  data-testid="appears-resolved-confirm"
                  role="dialog"
                  aria-label="Confirm appears resolved"
                >
                  <p className="small mb-3">
                    Mark this ticket as appears resolved? Your ticket stays open
                    -- IT Staff verify the fix before anything closes.
                  </p>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-zen-primary btn-sm"
                      disabled={signalBusy}
                      onClick={handleSignalConfirm}
                      data-testid="appears-resolved-confirm-btn"
                    >
                      {signalBusy ? "Marking…" : "Yes, it looks fixed"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-zen-secondary btn-sm"
                      disabled={signalBusy}
                      onClick={() => setSignalConfirm(false)}
                      data-testid="appears-resolved-cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm align-self-start"
                  onClick={() => setSignalConfirm(true)}
                  data-testid="appears-resolved-btn"
                >
                  Mark as appears resolved
                </button>
              ))}
            {showReopenAction &&
              (reopenConfirm ? (
                <div
                  className="zg-card p-3 border"
                  data-testid="reopen-confirm"
                  role="dialog"
                  aria-label="Confirm reopen"
                >
                  <p className="small mb-3">
                    Reopen this resolved ticket? It returns to the queue for IT
                    Staff to work on again.
                  </p>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-zen-primary btn-sm"
                      disabled={reopenBusy}
                      onClick={handleReopenConfirm}
                      data-testid="reopen-confirm-btn"
                    >
                      {reopenBusy ? "Reopening…" : "Yes, reopen it"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-zen-secondary btn-sm"
                      disabled={reopenBusy}
                      onClick={() => setReopenConfirm(false)}
                      data-testid="reopen-cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm align-self-start"
                  onClick={() => setReopenConfirm(true)}
                  data-testid="reopen-btn"
                >
                  Reopen ticket
                </button>
              ))}
          </div>
        )}

        {/* Meta Footer [ui-spec §9, lines 122-123] */}
        <div
          className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-2 text-muted small border-top"
          data-testid="ticket-detail-meta-footer"
        >
          <span>Created: {formatDateTime(ticket.createdAt)}</span>
          <span>Last Updated: {formatDateTime(ticket.updatedAt)}</span>
        </div>
      </div>

      {/* Public Comments [FR-25, ui-spec section 5]. Rendered safely: React
          escapes the body and whitespace is preserved, never raw HTML
          [BR-14]. There is deliberately no Internal Notes section anywhere in
          this component -- a requester never sees one, whatever their role
          [BR-04]. */}
      <div className="zg-card p-4 mb-4" data-testid="comments-section">
        <h2 className="h5 fw-bold text-zen-primary mb-3">Public Comments</h2>
        {comments.length === 0 ? (
          <p className="text-muted small mb-3" data-testid="comments-empty">
            No comments yet. Start the discussion with IT Staff below.
          </p>
        ) : (
          <ul
            className="list-unstyled d-flex flex-column gap-2 mb-3"
            data-testid="comment-list"
          >
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="zg-comment-card p-3 border rounded"
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
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {comment.body}
                </div>
              </li>
            ))}
          </ul>
        )}
        <label
          htmlFor="comment-composer"
          className="form-label small fw-semibold"
        >
          Add a public comment
        </label>
        <textarea
          id="comment-composer"
          className="form-control"
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          value={commentDraft}
          disabled={commentBusy}
          onChange={(event) => setCommentDraft(event.target.value)}
          placeholder="Describe what changed, or ask IT Staff a question…"
          data-testid="comment-composer"
        />
        <div className="d-flex justify-content-between align-items-center mt-2">
          <span
            className="text-muted"
            style={{ fontSize: "0.75rem" }}
            data-testid="comment-counter"
          >
            {commentDraft.length}/{COMMENT_MAX_LENGTH} characters
          </span>
          <button
            type="button"
            className="btn btn-zen-primary btn-sm"
            disabled={commentBusy}
            onClick={handleCommentPost}
            data-testid="comment-post-btn"
          >
            {commentBusy ? "Posting…" : "Post comment"}
          </button>
        </div>
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

      {/* Attachment Section */}
      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        onAttachmentAdded={handleAttachmentAdded}
        onAttachmentRemoved={handleAttachmentRemoved}
      />
    </div>
  );
}
