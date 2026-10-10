import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { getStaffActions } from "../api/actions";
import { useAuth } from "../context/AuthContext";
import { useRequestGeneration } from "../hooks/useRequestGeneration";
import { Forbidden } from "./ScreenPanel";
import type { StaffActionListResponse } from "../types/action";
import { formatBangkokDateTime } from "../utils/format";
import { isAuthRequired } from "../utils/authRequired";

const ALLOWED_QUERY_KEYS = [
  "statusGroup",
  "from",
  "to",
  "page",
  "pageSize",
] as const;

function makeRequestParams(source: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams({ performedBy: "me" });
  for (const key of ALLOWED_QUERY_KEYS) {
    const value = source.get(key);
    if (value !== null) params.set(key, value);
  }
  if (!params.has("page")) params.set("page", "1");
  if (!params.has("pageSize")) params.set("pageSize", "10");
  return params;
}

export function StaffActionsList() {
  const { expireSession } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = makeRequestParams(searchParams).toString();
  const [data, setData] = useState<StaffActionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const { beginRequest, invalidateRequests } = useRequestGeneration();

  const loadActions = useCallback(async () => {
    const isCurrentRequest = beginRequest();
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const response = await getStaffActions(new URLSearchParams(queryString));
      if (!isCurrentRequest()) return;
      const authRequired = await isAuthRequired(response);
      if (!isCurrentRequest()) return;
      if (authRequired) {
        expireSession();
        return;
      }
      if (response.status === 403) {
        setData(null);
        setForbidden(true);
        return;
      }
      if (!response.ok) {
        setData(null);
        setError("Your actions could not be loaded. Please try again.");
        return;
      }
      const result = (await response.json()) as StaffActionListResponse;
      if (!isCurrentRequest()) return;
      setData(result);
    } catch {
      if (!isCurrentRequest()) return;
      setData(null);
      setError("Your actions could not be loaded. Please try again.");
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [beginRequest, expireSession, queryString]);

  useEffect(() => {
    void loadActions();
    return invalidateRequests;
  }, [invalidateRequests, loadActions]);

  const updatePagination = (key: "page" | "pageSize", value: string) => {
    const next = makeRequestParams(searchParams);
    next.set(key, value);
    if (key === "pageSize") next.set("page", "1");
    setSearchParams(next);
  };

  if (forbidden) return <Forbidden backTo="/tickets" />;

  return (
    <main className="my-2" data-testid="staff-actions-list-view">
      <section className="zg-card p-4">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
          <div>
            <h1 className="h4 fw-bold mb-1 text-zen-primary">
              My Recent Actions
            </h1>
            <p className="small text-muted mb-0">
              Actions recorded by you, not actions assigned to you.
            </p>
          </div>
          {data && (
            <span className="small text-muted" data-testid="action-list-count">
              {data.total} {data.total === 1 ? "action" : "actions"}
            </span>
          )}
        </div>

        {loading && (
          <p
            aria-live="polite"
            className="text-muted"
            data-testid="actions-loading"
          >
            Loading your actions…
          </p>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}{" "}
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => void loadActions()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {data.actions.length > 0 ? (
              <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
                {data.actions.map((action) => (
                  <li className="zg-readonly-panel p-3" key={action.id}>
                    <Link
                      className="fw-semibold text-zen-primary zg-breakable-action-title"
                      state={{ from: `${location.pathname}${location.search}` }}
                      to={`/staff/tickets/${action.ticketId}#action-${action.id}`}
                    >
                      {action.title}
                    </Link>
                    <dl className="row g-2 small mb-0 mt-2">
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Ticket</dt>
                        <dd className="mb-0">
                          <Link
                            state={{
                              from: `${location.pathname}${location.search}`,
                            }}
                            to={`/staff/tickets/${action.ticketId}`}
                          >
                            {action.ticketNumber}
                          </Link>
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Status</dt>
                        <dd className="mb-0">
                          {action.status.replaceAll("_", " ")}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Performed by</dt>
                        <dd className="mb-0 zg-breakable-text">
                          {action.performedBy.name}
                        </dd>
                      </div>
                      <div className="col-12 col-md-6">
                        <dt className="text-muted">Assignee</dt>
                        <dd className="mb-0 zg-breakable-text">
                          {action.assignee?.name ?? "Unassigned"}
                        </dd>
                      </div>
                      <div className="col-12">
                        <dt className="text-muted">Created (Bangkok)</dt>
                        <dd className="mb-0">
                          {formatBangkokDateTime(action.createdAt)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-muted" data-testid="actions-empty">
                No actions match this view.{" "}
                <Link to="/staff/queue">Open the Ticket Queue</Link>.
              </div>
            )}

            {data.total > 0 && (
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4 pt-3 border-top">
                <div className="d-flex align-items-center gap-2 small text-muted">
                  <label className="mb-0" htmlFor="staff-action-page-size">
                    Per page:
                  </label>
                  <select
                    className="form-select form-select-sm"
                    id="staff-action-page-size"
                    value={data.pageSize}
                    onChange={(event) =>
                      updatePagination("pageSize", event.target.value)
                    }
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    aria-label="Previous page"
                    className="btn btn-zen-secondary btn-sm"
                    disabled={data.page <= 1}
                    onClick={() =>
                      updatePagination("page", String(data.page - 1))
                    }
                    type="button"
                  >
                    Previous
                  </button>
                  <span
                    className="small text-muted"
                    data-testid="action-pagination"
                  >
                    Page {data.page} of {data.totalPages} ({data.total} actions)
                  </span>
                  <button
                    aria-label="Next page"
                    className="btn btn-zen-secondary btn-sm"
                    disabled={data.page >= data.totalPages}
                    onClick={() =>
                      updatePagination("page", String(data.page + 1))
                    }
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
