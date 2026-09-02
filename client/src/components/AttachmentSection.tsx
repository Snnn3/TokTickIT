import { useState, useRef, useEffect } from "react";
import type { AttachmentMetadata } from "../types/ticket";
import { formatDateTime, formatFileSize } from "../utils/format";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface AttachmentRemovalUpdate {
  attachmentId: number;
  removedReason: string;
  removedAt: string;
}

interface AttachmentSectionProps {
  ticketId: number;
  attachments: AttachmentMetadata[];
  requesterId: number;
  onAttachmentAdded?: (attachment: AttachmentMetadata) => void;
  onAttachmentRemoved?: (update: AttachmentRemovalUpdate) => void;
}

export function AttachmentSection({
  ticketId,
  attachments,
  requesterId,
  onAttachmentAdded,
  onAttachmentRemoved,
}: AttachmentSectionProps) {
  const [fileList, setFileList] = useState<AttachmentMetadata[]>(attachments);
  const [uploading, setUploading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<{ id: number; message: string } | null>(null);

  // Modal / Dialog state for soft removal
  const [removingAttachment, setRemovingAttachment] = useState<AttachmentMetadata | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removeReasonError, setRemoveReasonError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setFileList(attachments);
  }, [attachments]);

  // Focus trap & Escape listener for modal [ui-spec §10]
  useEffect(() => {
    if (!removingAttachment) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRemoveModal();
      } else if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    setTimeout(() => reasonInputRef.current?.focus(), 50);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [removingAttachment]);

  const activeAttachments = fileList.filter((a) => !a.removedAt);
  const activeCount = activeAttachments.length;
  const isLimitReached = activeCount >= 5;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setClientError(null);

    // 1. Client-side extension validation [AC-07]
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setClientError(`Unsupported file type for "${file.name}". Allowed formats: JPG, PNG, WEBP, PDF.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Client-side size validation [AC-08]
    if (file.size > MAX_FILE_SIZE) {
      setClientError(`File "${file.name}" exceeds the maximum allowed size of 5 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Active count check [AC-09]
    if (activeCount >= 5) {
      setClientError("Maximum 5 active attachments allowed per ticket.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Upload attachment
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: {
          "X-Requester-Id": String(requesterId),
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setClientError(data?.error?.message || "Failed to upload attachment.");
      } else if (data.attachment) {
        setFileList((prev) => [...prev, data.attachment]);
        if (onAttachmentAdded) onAttachmentAdded(data.attachment);
      }
    } catch {
      setClientError("Network error while uploading attachment.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (attachment: AttachmentMetadata) => {
    if (attachment.removedAt) return; // Blocked for removed items [AC-11]

    setDownloadError(null);

    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`, {
        headers: {
          "X-Requester-Id": String(requesterId),
        },
      });

      if (res.status === 410) {
        setDownloadError({ id: attachment.id, message: "This attachment has been removed and cannot be downloaded." });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError({ id: attachment.id, message: data?.error?.message || "Failed to download attachment." });
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError({ id: attachment.id, message: "Network error downloading attachment. Click to retry." });
    }
  };

  const openRemoveModal = (attachment: AttachmentMetadata) => {
    setRemovingAttachment(attachment);
    setRemoveReason("");
    setRemoveReasonError(null);
  };

  const closeRemoveModal = () => {
    setRemovingAttachment(null);
    setRemoveReason("");
    setRemoveReasonError(null);
    setIsRemoving(false);
  };

  const handleConfirmRemove = async () => {
    if (!removingAttachment) return;

    const trimmedReason = removeReason.trim();
    if (!trimmedReason || trimmedReason.length < 1) {
      setRemoveReasonError("Removal reason is required.");
      return;
    }

    if (trimmedReason.length > 300) {
      setRemoveReasonError("Reason must not exceed 300 characters.");
      return;
    }

    setIsRemoving(true);
    setRemoveReasonError(null);

    try {
      const res = await fetch(`/api/attachments/${removingAttachment.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Requester-Id": String(requesterId),
        },
        body: JSON.stringify({ reason: trimmedReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        setRemoveReasonError(data?.error?.message || "Failed to remove attachment.");
      } else {
        const removedAt = data.removedAt || new Date().toISOString();
        setFileList((prev) =>
          prev.map((item) =>
            item.id === removingAttachment.id
              ? { ...item, removedAt, removedReason: trimmedReason }
              : item,
          ),
        );
        if (onAttachmentRemoved) {
          onAttachmentRemoved({
            attachmentId: removingAttachment.id,
            removedReason: trimmedReason,
            removedAt,
          });
        }
        closeRemoveModal();
      }
    } catch {
      setRemoveReasonError("Network error while removing attachment.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="zg-card p-4 mt-4" data-testid="attachment-section">
      {/* Header with Title and Add Button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h5 fw-bold mb-0 text-zen-primary">Attachments</h2>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="d-none"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileSelect}
            data-testid="add-attachment-input"
          />
          <button
            type="button"
            className="btn btn-zen-secondary btn-sm d-flex align-items-center gap-1"
            disabled={isLimitReached || uploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add attachment"
            data-testid="add-attachment-button"
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>+</span>
                <span>Add attachment</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Client validation error banner */}
      {clientError && (
        <div className="alert alert-danger py-2 small mb-3" role="alert" data-testid="attachment-error-banner">
          {clientError}
        </div>
      )}

      {/* Download error alert */}
      {downloadError && (
        <div className="alert alert-warning py-2 small mb-3 d-flex justify-content-between align-items-center" role="alert">
          <span>{downloadError.message}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark"
            onClick={() => {
              const target = fileList.find((a) => a.id === downloadError.id);
              if (target) handleDownload(target);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Attachments List */}
      {fileList.length === 0 ? (
        <p className="text-muted small mb-0 fst-italic">No attachments on this ticket.</p>
      ) : (
        <div className="list-group list-group-flush border-top">
          {fileList.map((att) => {
            const isRemoved = Boolean(att.removedAt);

            return (
              <div
                key={att.id}
                className="list-group-item px-0 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
                data-testid={`attachment-row-${att.id}`}
              >
                {/* File info */}
                <div>
                  <div className="d-flex align-items-center gap-2">
                    {isRemoved ? (
                      <>
                        <span className="text-decoration-line-through text-muted small fw-medium">
                          {att.filename}
                        </span>
                        <span className="badge badge-zen-removed" data-testid={`removed-badge-${att.id}`}>
                          Removed
                        </span>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-link p-0 text-decoration-none fw-medium text-zen-primary small text-start"
                        onClick={() => handleDownload(att)}
                        title={`Download ${att.filename}`}
                      >
                        {att.filename}
                      </button>
                    )}
                  </div>

                  <div className="text-muted small mt-1">
                    <span>{formatFileSize(att.sizeBytes)}</span>
                    <span className="mx-1">•</span>
                    <span>Uploaded {formatDateTime(att.uploadedAt)}</span>
                  </div>

                  {/* Removal reason caption [AC-11, AC-12] */}
                  {isRemoved && att.removedReason && (
                    <div
                      className="small text-danger mt-1 bg-light p-1 rounded border-start border-danger border-2"
                      data-testid={`removed-reason-${att.id}`}
                    >
                      <strong>Reason:</strong> {att.removedReason}
                      {att.removedAt && (
                        <span className="text-muted ms-1">({formatDateTime(att.removedAt)})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-zen-secondary btn-sm d-flex align-items-center gap-1"
                    disabled={isRemoved}
                    onClick={() => handleDownload(att)}
                    aria-label={`Download ${att.filename}`}
                    data-testid={`download-button-${att.id}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-zen-destructive btn-sm"
                    disabled={isRemoved}
                    onClick={() => openRemoveModal(att)}
                    aria-label={`Remove ${att.filename}`}
                    data-testid={`remove-button-${att.id}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Remove Confirmation Dialog / Modal [AC-12, BR-17] */}
      {removingAttachment && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          data-testid="remove-attachment-dialog"
        >
          <div className="modal-dialog modal-dialog-centered" ref={modalRef}>
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title h5 text-danger fw-bold">Remove Attachment</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemoveModal}
                  aria-label="Close"
                />
              </div>

              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Are you sure you want to remove <strong>{removingAttachment.filename}</strong>? Once removed, the file bytes cannot be downloaded again, but the metadata and your reason will remain visible for audit compliance.
                </p>

                <div className="mb-2">
                  <label htmlFor="removal-reason-input" className="form-label small fw-semibold">
                    Removal Reason <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="removal-reason-input"
                    ref={reasonInputRef}
                    className={`form-control form-control-sm ${removeReasonError ? "is-invalid" : ""}`}
                    rows={3}
                    maxLength={300}
                    placeholder="Enter reason for removing this attachment (e.g. Obsolete document, sensitive data uploaded by mistake)..."
                    value={removeReason}
                    onChange={(e) => {
                      setRemoveReason(e.target.value);
                      if (removeReasonError) setRemoveReasonError(null);
                    }}
                    data-testid="removal-reason-input"
                  />
                  <div className="d-flex justify-content-between mt-1">
                    {removeReasonError ? (
                      <span className="text-danger small" data-testid="removal-reason-error">
                        {removeReasonError}
                      </span>
                    ) : (
                      <span className="text-muted small">Max 300 characters</span>
                    )}
                    <span className="text-muted small">{removeReason.length}/300</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm"
                  onClick={closeRemoveModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-zen-destructive btn-sm"
                  disabled={isRemoving || !removeReason.trim()}
                  onClick={handleConfirmRemove}
                  data-testid="confirm-remove-button"
                >
                  {isRemoving ? "Removing..." : "Remove Attachment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
