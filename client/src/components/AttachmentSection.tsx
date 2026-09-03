import { useState, useRef, useEffect } from "react";
import type { AttachmentMetadata } from "../types/ticket";
import { formatDateTime, formatFileSize } from "../utils/format";
import { validateFile, MAX_ATTACHMENTS } from "../utils/validation";

export interface AttachmentRemovalUpdate {
  attachmentId: number;
  removedReason: string;
  removedAt: string;
}

interface StagedFile {
  id: string;
  filename: string;
  sizeBytes: number;
  status: "uploading" | "invalid";
  errorMessage?: string;
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
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [downloadErrors, setDownloadErrors] = useState<Record<number, string>>({});

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
  const isLimitReached = activeAttachments.length >= MAX_ATTACHMENTS;
  const isUploading = stagedFiles.some((f) => f.status === "uploading");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempId = `staged-${Date.now()}-${Math.random()}`;

    // 1. Centralized client-side validation [AC-07, AC-08]
    const validationError = validateFile(file);
    if (validationError) {
      setStagedFiles((prev) => [
        ...prev,
        {
          id: tempId,
          filename: file.name,
          sizeBytes: file.size,
          status: "invalid",
          errorMessage: validationError,
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Active count check [AC-09]
    if (isLimitReached) {
      setStagedFiles((prev) => [
        ...prev,
        {
          id: tempId,
          filename: file.name,
          sizeBytes: file.size,
          status: "invalid",
          errorMessage: "Maximum 5 active attachments allowed per ticket.",
        },
      ]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Add in uploading state
    setStagedFiles((prev) => [
      ...prev,
      {
        id: tempId,
        filename: file.name,
        sizeBytes: file.size,
        status: "uploading",
      },
    ]);

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
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, status: "invalid", errorMessage: data?.error?.message || "Failed to upload attachment." }
              : f,
          ),
        );
      } else {
        const uploadedAtt: AttachmentMetadata = data.id ? data : data.attachment;
        if (uploadedAtt) {
          setFileList((prev) => [...prev, uploadedAtt]);
          setStagedFiles((prev) => prev.filter((f) => f.id !== tempId));
          if (onAttachmentAdded) onAttachmentAdded(uploadedAtt);
        }
      }
    } catch {
      setStagedFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? { ...f, status: "invalid", errorMessage: "Network error while uploading attachment." }
            : f,
        ),
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const dismissStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDownload = async (attachment: AttachmentMetadata) => {
    if (attachment.removedAt) return; // Blocked for removed items [AC-11]

    setDownloadErrors((prev) => {
      const copy = { ...prev };
      delete copy[attachment.id];
      return copy;
    });

    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`, {
        headers: {
          "X-Requester-Id": String(requesterId),
        },
      });

      if (res.status === 410) {
        setDownloadErrors((prev) => ({
          ...prev,
          [attachment.id]: "This attachment has been removed and cannot be downloaded.",
        }));
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadErrors((prev) => ({
          ...prev,
          [attachment.id]: data?.error?.message || "Download failed. Please try again.",
        }));
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
      setDownloadErrors((prev) => ({
        ...prev,
        [attachment.id]: "Network error downloading attachment.",
      }));
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

  const hasItems = fileList.length > 0 || stagedFiles.length > 0;

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
            disabled={isLimitReached || isUploading}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add attachment"
            data-testid="add-attachment-button"
          >
            {isUploading ? (
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

      {/* Attachments List with All 5 States [ui-spec §9, §12] */}
      {!hasItems ? (
        <p className="text-muted small mb-0 fst-italic">No attachments on this ticket.</p>
      ) : (
        <div className="list-group list-group-flush border-top">
          {/* Staged files in uploading or invalid state */}
          {stagedFiles.map((staged) => (
            <div
              key={staged.id}
              className="list-group-item px-0 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
              data-testid={`staged-attachment-row-${staged.id}`}
            >
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-medium small text-zen-body">{staged.filename}</span>
                  {staged.status === "uploading" ? (
                    <span className="badge badge-zen-medium d-flex align-items-center gap-1" data-testid="uploading-badge">
                      <span className="spinner-border spinner-border-sm" style={{ width: "10px", height: "10px" }} role="status" aria-hidden="true" />
                      Uploading
                    </span>
                  ) : (
                    <span className="badge badge-zen-error" data-testid="invalid-badge">
                      Invalid
                    </span>
                  )}
                </div>

                <div className="text-muted small mt-1">
                  <span>{formatFileSize(staged.sizeBytes)}</span>
                </div>

                {staged.errorMessage && (
                  <div
                    className="small text-danger mt-1"
                    role="alert"
                    aria-live="polite"
                    data-testid="staged-error-message"
                  >
                    {staged.errorMessage}
                  </div>
                )}
              </div>

              <div>
                {staged.status === "invalid" && (
                  <button
                    type="button"
                    className="btn btn-zen-secondary btn-sm"
                    onClick={() => dismissStagedFile(staged.id)}
                    aria-label={`Dismiss ${staged.filename}`}
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Persisted attachment items */}
          {fileList.map((att) => {
            const isRemoved = Boolean(att.removedAt);
            const downloadErr = downloadErrors[att.id];

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

                  {/* Removal reason caption using Zen tokens [ui-spec §1, §9] */}
                  {isRemoved && att.removedReason && (
                    <div
                      className="small text-zen-muted mt-1 zg-readonly-panel p-2 rounded"
                      data-testid={`removed-reason-${att.id}`}
                    >
                      <strong className="text-zen-body">Reason:</strong> {att.removedReason}
                      {att.removedAt && (
                        <span className="text-muted ms-1">({formatDateTime(att.removedAt)})</span>
                      )}
                    </div>
                  )}

                  {/* Unavailable state inline error with retry button [ui-spec §9, §10] */}
                  {downloadErr && (
                    <div
                      className="small text-danger mt-1 d-flex align-items-center gap-2"
                      role="alert"
                      aria-live="polite"
                      data-testid={`unavailable-state-${att.id}`}
                    >
                      <span>{downloadErr}</span>
                      <button
                        type="button"
                        className="btn btn-zen-secondary btn-sm py-0 px-2"
                        onClick={() => handleDownload(att)}
                        aria-label={`Retry download ${att.filename}`}
                      >
                        Retry
                      </button>
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

      {/* Remove Confirmation Dialog / Modal [AC-12, BR-17, ui-spec §10] */}
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
                <h3 className="modal-title h5 text-zen-primary fw-bold">Remove Attachment</h3>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemoveModal}
                  aria-label="Close"
                  title="Close"
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
                      <span
                        className="text-danger small"
                        role="alert"
                        aria-live="polite"
                        data-testid="removal-reason-error"
                      >
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
                  className="btn btn-zen-destructive btn-sm d-flex align-items-center gap-1"
                  disabled={isRemoving || !removeReason.trim()}
                  onClick={handleConfirmRemove}
                  aria-busy={isRemoving}
                  data-testid="confirm-remove-button"
                >
                  {isRemoving ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      <span>Removing...</span>
                    </>
                  ) : (
                    <span>Remove Attachment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
