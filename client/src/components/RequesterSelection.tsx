import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { RequesterUser } from "../types/requester";
import { useRequester } from "../context/RequesterContext";

export function RequesterSelection() {
  const { selectRequester } = useRequester();
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequesters = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/requesters");
      if (!res.ok) {
        throw new Error("Failed to load requesters");
      }
      const data = await res.json();
      setRequesters(data.requesters || []);
    } catch {
      setError("Unable to load development requesters. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequesters();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    const chosen = requesters.find((r) => r.id === parseInt(selectedId, 10));
    if (chosen) {
      selectRequester(chosen);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-3">
      <div className="zg-card p-4 shadow-sm w-100" style={{ maxWidth: "440px" }}>
        <div className="text-center mb-3">
          <h1 className="h3 fw-bold text-success mb-1" style={{ color: "var(--zg-primary)" }}>
            TokTickIT
          </h1>
          <p className="text-muted small mb-0">Development Session</p>
        </div>

        <div className="alert alert-light border small text-muted mb-4" role="note">
          Select a Development Requester to test requester-specific ticket behavior. This is not a
          login screen. Authentication and role-based access will be introduced in Lab 3.
        </div>

        {loading && (
          <div className="text-center py-4" data-testid="loading-state">
            <div className="spinner-border text-success" role="status" style={{ color: "var(--zg-primary)" }}>
              <span className="visually-hidden">Loading requesters...</span>
            </div>
            <p className="text-muted small mt-2 mb-0">Loading development requesters...</p>
          </div>
        )}

        {error && !loading && (
          <div className="alert alert-warning py-3" role="alert" data-testid="error-state">
            <p className="mb-2 small">{error}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={fetchRequesters}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && requesters.length === 0 && (
          <div className="text-center py-3" data-testid="empty-state">
            <p className="text-muted mb-3">No active requesters available.</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={fetchRequesters}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && requesters.length > 0 && (
          <form onSubmit={handleSubmit} data-testid="requester-form">
            <div className="mb-3">
              <label htmlFor="requester-select" className="form-label fw-semibold small mb-1">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                aria-required="true"
              >
                <option value="">-- Select Development Requester --</option>
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.name} ({req.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-zen-primary w-100 mt-2"
              disabled={!selectedId}
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
