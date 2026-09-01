import { useState, useEffect, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useRequester } from "../context/RequesterContext";
import {
  validateSummary,
  validateDescription,
  validateCategory,
  validateSystem,
  validatePriority,
  validateFile,
  MAX_ATTACHMENTS,
} from "../utils/validation";

interface Category {
  id: number;
  name: string;
}

interface RelatedSystem {
  id: number;
  name: string;
}

interface CreatedTicketResult {
  id: number;
  number: string;
  ticketDate: string;
  summary: string;
}

interface CreateTicketProps {
  onSuccessNavigate?: (ticketId: number) => void;
  onCancel?: () => void;
}

export function CreateTicket({ onSuccessNavigate, onCancel }: CreateTicketProps) {
  const { selectedRequester } = useRequester();

  // Form inputs
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [systemId, setSystemId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<CreatedTicketResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadReferenceData() {
      setLoadingRefs(true);
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch("/api/reference/categories"),
          fetch("/api/reference/systems"),
        ]);
        if (catRes.ok && sysRes.ok) {
          const catData = await catRes.json();
          const sysData = await sysRes.json();
          setCategories(catData.categories || []);
          setSystems(sysData.systems || []);
        }
      } catch {
        setApiError("Failed to load reference categories or systems.");
      } finally {
        setLoadingRefs(false);
      }
    }
    loadReferenceData();
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFileErrors([]);
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const newErrors: string[] = [];

    if (stagedFiles.length + filesArray.length > MAX_ATTACHMENTS) {
      newErrors.push(`You can only attach a maximum of ${MAX_ATTACHMENTS} files.`);
      setFileErrors(newErrors);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const validNewFiles: File[] = [];
    for (const file of filesArray) {
      const err = validateFile(file);
      if (err) {
        newErrors.push(err);
      } else {
        validNewFiles.push(file);
      }
    }

    if (newErrors.length > 0) {
      setFileErrors(newErrors);
    } else {
      setStagedFiles((prev) => [...prev, ...validNewFiles]);
    }

    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleResetForm = () => {
    setSuccessResult(null);
    setSummary("");
    setDescription("");
    setCategoryId("");
    setSystemId("");
    setRequestedPriority("");
    setStagedFiles([]);
    setErrors({});
    setFileErrors([]);
    setApiError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);

    // Client-side validations
    const newErrors: Record<string, string> = {};

    const summaryErr = validateSummary(summary);
    if (summaryErr) newErrors.summary = summaryErr;

    const descErr = validateDescription(description);
    if (descErr) newErrors.description = descErr;

    const catErr = validateCategory(categoryId);
    if (catErr) newErrors.categoryId = catErr;

    const sysErr = validateSystem(systemId);
    if (sysErr) newErrors.systemId = sysErr;

    const priorityErr = validatePriority(requestedPriority);
    if (priorityErr) newErrors.requestedPriority = priorityErr;

    for (const file of stagedFiles) {
      const fileErr = validateFile(file);
      if (fileErr) {
        newErrors.files = fileErr;
        break;
      }
    }
    if (stagedFiles.length > MAX_ATTACHMENTS) {
      newErrors.files = `Maximum ${MAX_ATTACHMENTS} attachments allowed`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setFileErrors([]);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("summary", summary.trim());
      formData.append("description", description.trim());
      formData.append("categoryId", categoryId);
      formData.append("systemId", systemId);
      formData.append("requestedPriority", requestedPriority);

      stagedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "X-Requester-Id": String(selectedRequester?.id || ""),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error?.details && Array.isArray(data.error.details)) {
          const fieldMap: Record<string, string> = {};
          data.error.details.forEach((d: { field: string; issue: string }) => {
            fieldMap[d.field] = d.issue;
          });
          setErrors(fieldMap);
        } else {
          setApiError(data?.error?.message || "Failed to create ticket. Please try again.");
        }
        return;
      }

      setSuccessResult({
        id: data.ticket.id,
        number: data.ticket.number,
        ticketDate: data.ticket.ticketDate,
        summary: data.ticket.summary,
      });
    } catch {
      setApiError("Network error. Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="my-2">
      {/* Success Banner / Card */}
      {successResult && (
        <div className="zg-card p-4 p-md-5 text-center mb-4" data-testid="success-panel">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{ width: "64px", height: "64px", backgroundColor: "var(--zg-pale)" }}
          >
            <span style={{ fontSize: "2rem", color: "var(--zg-primary)" }}>✓</span>
          </div>
          <h2 className="h3 fw-bold mb-2" style={{ color: "var(--zg-primary)" }}>
            Ticket Created Successfully!
          </h2>
          <p className="text-muted mb-4">
            Your support request has been registered in the system.
          </p>

          <div
            className="p-3 mb-4 rounded border text-start"
            style={{ backgroundColor: "var(--zg-pale)", borderColor: "rgba(0,107,60,0.2)" }}
          >
            <div className="row g-3 align-items-center">
              <div className="col-12 col-md-6 border-end-md">
                <div className="small text-muted mb-1">Official Ticket Number</div>
                <div className="h3 fw-bold mb-0" style={{ color: "var(--zg-primary)" }}>
                  {successResult.number}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-muted mb-1">Ticket Date</div>
                <div className="h6 fw-semibold mb-0" style={{ color: "var(--zg-text-primary)" }}>
                  {new Date(successResult.ticketDate).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-zen-primary"
              onClick={() => {
                if (onSuccessNavigate) {
                  onSuccessNavigate(successResult.id);
                }
              }}
            >
              View My Tickets
            </button>
            <button
              type="button"
              className="btn btn-zen-secondary"
              onClick={handleResetForm}
            >
              + Create Another Ticket
            </button>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="zg-card p-4">
        <div className="border-bottom pb-3 mb-4">
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)" }}>
            Create Support Ticket
          </h1>
          <p className="text-muted small mb-0">
            Describe the problem you are experiencing and classify your request.
          </p>
        </div>

        {apiError && (
          <div className="alert alert-danger mb-4" role="alert" data-testid="api-error-banner">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate data-testid="create-ticket-form">
          {/* 1. System Group (Read-only strip) */}
          <div className="mb-4 p-3 rounded border bg-light">
            <h2 className="h6 fw-semibold text-muted mb-3 text-uppercase" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              System Metadata (Read-Only)
            </h2>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label htmlFor="sys-ticket-number" className="form-label small fw-semibold mb-1">Ticket Number</label>
                <input
                  id="sys-ticket-number"
                  type="text"
                  className="form-control form-control-sm zg-readonly-field"
                  value={
                    successResult
                      ? successResult.number
                      : `TKT-${new Date().getFullYear()}-XXXXX`
                  }
                  readOnly
                />
              </div>
              <div className="col-12 col-md-4">
                <label htmlFor="sys-ticket-date" className="form-label small fw-semibold mb-1">Ticket Date</label>
                <input
                  id="sys-ticket-date"
                  type="text"
                  className="form-control form-control-sm zg-readonly-field"
                  value={
                    successResult
                      ? new Date(successResult.ticketDate).toLocaleString()
                      : `Today (${new Date().toLocaleDateString()})`
                  }
                  readOnly
                />
              </div>
              <div className="col-12 col-md-4">
                <label htmlFor="sys-requester" className="form-label small fw-semibold mb-1">Requester</label>
                <input
                  id="sys-requester"
                  type="text"
                  className="form-control form-control-sm zg-readonly-field"
                  value={selectedRequester ? `${selectedRequester.name} (${selectedRequester.email})` : "Not selected"}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* 2. Classification Group */}
          <div className="mb-4">
            <h2 className="h6 fw-semibold mb-3">Classification</h2>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label htmlFor="category-select" className="form-label small fw-semibold mb-1">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="category-select"
                  className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: "" }));
                  }}
                  disabled={submitting || loadingRefs || !!successResult}
                  required
                >
                  {loadingRefs ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    <>
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.categoryId && (
                  <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                    {errors.categoryId}
                  </div>
                )}
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="system-select" className="form-label small fw-semibold mb-1">
                  Related System <span className="text-danger">*</span>
                </label>
                <select
                  id="system-select"
                  className={`form-select ${errors.systemId ? "is-invalid" : ""}`}
                  value={systemId}
                  onChange={(e) => {
                    setSystemId(e.target.value);
                    if (errors.systemId) setErrors((prev) => ({ ...prev, systemId: "" }));
                  }}
                  disabled={submitting || loadingRefs || !!successResult}
                  required
                >
                  {loadingRefs ? (
                    <option value="">Loading related systems...</option>
                  ) : (
                    <>
                      <option value="">-- Select Related System --</option>
                      {systems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.systemId && (
                  <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                    {errors.systemId}
                  </div>
                )}
              </div>

              <div className="col-12 col-md-4">
                <label htmlFor="priority-select" className="form-label small fw-semibold mb-1">
                  Requested Priority <span className="text-danger">*</span>
                </label>
                <select
                  id="priority-select"
                  className={`form-select ${errors.requestedPriority ? "is-invalid" : ""}`}
                  value={requestedPriority}
                  onChange={(e) => {
                    setRequestedPriority(e.target.value);
                    if (errors.requestedPriority) setErrors((prev) => ({ ...prev, requestedPriority: "" }));
                  }}
                  disabled={submitting || loadingRefs || !!successResult}
                  required
                >
                  <option value="">-- Select Priority --</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
                {errors.requestedPriority && (
                  <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                    {errors.requestedPriority}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Details Group */}
          <div className="mb-4">
            <h2 className="h6 fw-semibold mb-3">Ticket Details</h2>
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="summary-input" className="form-label small fw-semibold mb-0">
                  Ticket Summary <span className="text-danger">*</span>
                </label>
                <span className={`small ${summary.length > 150 ? "text-danger fw-bold" : "text-muted"}`}>
                  {summary.length}/150
                </span>
              </div>
              <input
                id="summary-input"
                type="text"
                className={`form-control ${errors.summary ? "is-invalid" : ""}`}
                placeholder="Brief summary of the issue (e.g. Cannot connect to Wi-Fi in building 3)"
                value={summary}
                maxLength={160}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (errors.summary) setErrors((prev) => ({ ...prev, summary: "" }));
                }}
                disabled={submitting || !!successResult}
                required
              />
              {errors.summary && (
                <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                  {errors.summary}
                </div>
              )}
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label htmlFor="description-input" className="form-label small fw-semibold mb-0">
                  Description <span className="text-danger">*</span>
                </label>
                <span className={`small ${description.length > 5000 ? "text-danger fw-bold" : "text-muted"}`}>
                  {description.length}/5000
                </span>
              </div>
              <textarea
                id="description-input"
                className={`form-control ${errors.description ? "is-invalid" : ""}`}
                style={{ minHeight: "130px" }}
                placeholder="Detailed description of the issue, steps to reproduce, or error messages encountered..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                disabled={submitting || !!successResult}
                required
              />
              {errors.description && (
                <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                  {errors.description}
                </div>
              )}
            </div>
          </div>

          {/* 4. Attachments Group */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 className="h6 fw-semibold mb-0">Attachments (Optional)</h2>
              <span className="small text-muted">{stagedFiles.length}/{MAX_ATTACHMENTS} files</span>
            </div>
            <p className="small text-muted mb-2">
              Allowed file types: JPG, PNG, WEBP, PDF. Max 5 MB per file.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              className="d-none"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              multiple
              onChange={handleFileChange}
              disabled={submitting || stagedFiles.length >= MAX_ATTACHMENTS || !!successResult}
              id="file-upload-input"
            />

            {!successResult && (
              <div className="mb-3">
                <label
                  htmlFor="file-upload-input"
                  className={`btn btn-sm btn-outline-secondary ${
                    submitting || stagedFiles.length >= MAX_ATTACHMENTS ? "disabled" : ""
                  }`}
                >
                  + Add Files
                </label>
              </div>
            )}

            {fileErrors.length > 0 && (
              <div
                className="alert alert-warning py-2 px-3 mb-3 d-flex justify-content-between align-items-start"
                data-testid="file-errors"
              >
                <ul className="mb-0 small ps-3 flex-grow-1">
                  {fileErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="btn-close ms-2"
                  aria-label="Dismiss warning"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => setFileErrors([])}
                ></button>
              </div>
            )}

            {stagedFiles.length > 0 && (
              <div className="list-group mb-3" data-testid="staged-files-list">
                {stagedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="list-group-item d-flex justify-content-between align-items-center py-2 px-3"
                  >
                    <div className="text-truncate me-2">
                      <span className="fw-semibold small">{file.name}</span>
                      <span className="text-muted small ms-2">({formatFileSize(file.size)})</span>
                    </div>
                    {!successResult && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                        aria-label={`Remove file ${file.name}`}
                        title={`Remove ${file.name}`}
                        onClick={() => removeStagedFile(idx)}
                        disabled={submitting}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Actions */}
          {!successResult && (
            <div className="d-flex justify-content-end gap-2 pt-3 border-top">
              <button
                type="button"
                className="btn btn-zen-secondary"
                onClick={() => {
                  if (onCancel) onCancel();
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-zen-primary d-flex align-items-center gap-2"
                disabled={submitting || loadingRefs}
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Ticket</span>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
