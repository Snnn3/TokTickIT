import { useState, useEffect, useCallback } from "react";
import type { TicketDetail, AttachmentMetadata } from "../types/ticket";
import { formatDateTime, formatDateOnly } from "../utils/format";
import { ZenPriorityBadge, ZenStatusBadge } from "./ZenBadge";
import { AttachmentSection } from "./AttachmentSection";
import type { AttachmentRemovalUpdate } from "./AttachmentSection";

interface RequesterTicketDetailProps {
  ticketId: number;
  requesterId: number;
  onBack: () => void;
}

export function RequesterTicketDetail({
  ticketId,
  requesterId,
  onBack,
}: RequesterTicketDetailProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          "X-Requester-Id": String(requesterId),
        },
      });

      if (res.status === 404) {
        setError("Ticket not found. It may have been deleted or the ID is incorrect.");
        return;
      }

      if (res.status === 403) {
        setError("Access denied. You do not have permission to view this ticket.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || "Failed to load ticket detail.");
        return;
      }

      const data = await res.json();
      setTicket(data.ticket);
    } catch {
      setError("Network error. Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [ticketId, requesterId]);

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
            ? { ...att, removedReason: update.removedReason, removedAt: update.removedAt }
            : att,
        ),
      };
    });
  };

  if (loading) {
    return (
      <div className="my-2" data-testid="ticket-detail-loading">
        <div className="zg-card p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="skeleton-placeholder" style={{ width: "200px", height: "32px" }} />
            <div className="skeleton-placeholder" style={{ width: "120px", height: "32px" }} />
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light rounded border">
                <div className="skeleton-placeholder mb-2" style={{ width: "40%", height: "16px" }} />
                <div className="skeleton-placeholder" style={{ width: "80%", height: "24px" }} />
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="p-3 bg-light rounded border">
                <div className="skeleton-placeholder mb-2" style={{ width: "40%", height: "16px" }} />
                <div className="skeleton-placeholder" style={{ width: "80%", height: "24px" }} />
              </div>
            </div>
          </div>

          <div className="p-3 bg-light rounded border mb-4">
            <div className="skeleton-placeholder mb-2" style={{ width: "25%", height: "16px" }} />
            <div className="skeleton-placeholder mb-2" style={{ width: "100%", height: "20px" }} />
            <div className="skeleton-placeholder" style={{ width: "70%", height: "20px" }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="my-2" data-testid="ticket-detail-error">
        <div className="zg-card p-4 text-center py-5">
          <div className="alert alert-danger mb-4 text-start">{error || "Ticket not found"}</div>
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

  const requesterDisplayName = ticket.requester?.name || ticket.requesterName || "Unknown";
  const systemDisplayName = ticket.systemName || ticket.relatedSystemName || "Unknown";

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
            <h1 className="h4 fw-bold mb-0 text-zen-primary" data-testid="ticket-detail-number">
              {ticket.number}
            </h1>
          </div>
        </div>

        {/* Read-only Ticket Info [ui-spec §9, AC-23, Tablet two-column §11] */}
        <div className="row g-3 mb-3">
          {/* System Group */}
          <div className="col-12 col-md-6">
            <div className="zg-readonly-panel p-3 h-100" data-testid="system-metadata-group">
              <h2 className="small text-muted text-uppercase fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                System Metadata
              </h2>
              <div className="row g-2 small">
                <div className="col-6 text-muted">Ticket Number:</div>
                <div className="col-6 fw-semibold text-zen-primary">{ticket.number}</div>

                <div className="col-6 text-muted">Ticket Date:</div>
                <div className="col-6 fw-medium text-zen-body">{formatDateOnly(ticket.ticketDate)}</div>

                <div className="col-6 text-muted">Requester:</div>
                <div className="col-6 fw-medium text-zen-body">{requesterDisplayName}</div>

                <div className="col-6 text-muted">Status:</div>
                <div className="col-6">
                  <ZenStatusBadge status={ticket.status} />
                </div>
              </div>
            </div>
          </div>

          {/* Classification Group */}
          <div className="col-12 col-md-6">
            <div className="zg-readonly-panel p-3 h-100" data-testid="classification-group">
              <h2 className="small text-muted text-uppercase fw-bold mb-3" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                Classification
              </h2>
              <div className="row g-2 small">
                <div className="col-6 text-muted">Category:</div>
                <div className="col-6 fw-medium text-zen-body">{ticket.categoryName}</div>

                <div className="col-6 text-muted">Related System:</div>
                <div className="col-6 fw-medium text-zen-body">{systemDisplayName}</div>

                <div className="col-6 text-muted">Requested Priority:</div>
                <div className="col-6">
                  <ZenPriorityBadge priority={ticket.requestedPriority} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Group (Summary & Description) */}
        <div className="zg-readonly-panel p-3 mb-3" data-testid="ticket-details-group">
          <h2 className="small text-muted text-uppercase fw-bold mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
            Summary
          </h2>
          <div className="fw-semibold text-zen-primary mb-3" data-testid="ticket-detail-summary">
            {ticket.summary}
          </div>

          <h2 className="small text-muted text-uppercase fw-bold mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
            Description
          </h2>
          <div
            className="p-3 bg-white rounded border text-zen-body small"
            style={{ whiteSpace: "pre-wrap", minHeight: "100px", backgroundColor: "var(--zg-readonly-field)" }}
            data-testid="ticket-detail-description"
          >
            {ticket.description}
          </div>
        </div>

        {/* Meta Footer */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pt-2 text-muted small border-top">
          <span>Created: {formatDateTime(ticket.createdAt)}</span>
          <span>Last Updated: {formatDateTime(ticket.updatedAt)}</span>
        </div>
      </div>

      {/* Attachment Section */}
      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        requesterId={requesterId}
        onAttachmentAdded={handleAttachmentAdded}
        onAttachmentRemoved={handleAttachmentRemoved}
      />
    </div>
  );
}
