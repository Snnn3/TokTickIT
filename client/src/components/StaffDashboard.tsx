import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStaffDashboard } from "../api/dashboard";
import type { StaffDashboardResponse } from "../types/dashboard";
import { formatBangkokDateTime } from "../utils/format";

function recentBounds(asOf: string) {
  const from = new Date(
    new Date(asOf).getTime() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();
  return { from, to: asOf };
}

function recentQueueHref(asOf: string): string {
  const params = new URLSearchParams({
    dateField: "updatedAt",
    ...recentBounds(asOf),
  });
  return `/staff/queue?${params.toString()}`;
}

function recentActionsHref(asOf: string): string {
  const params = new URLSearchParams({
    performedBy: "me",
    ...recentBounds(asOf),
  });
  return `/staff/actions?${params.toString()}`;
}

const METRICS = [
  {
    key: "openTickets",
    label: "Open Tickets",
    href: "/staff/queue?statusGroup=open",
    description: "All tickets in an active workflow status.",
  },
  {
    key: "unassignedTickets",
    label: "Unassigned Tickets",
    href: "/staff/queue?statusGroup=open&owner=unassigned",
    description: "Active tickets waiting for an owner.",
  },
  {
    key: "myOwnedTickets",
    label: "My Owned Tickets",
    href: "/staff/queue?statusGroup=open&owner=mine",
    description: "Active tickets assigned to you.",
  },
  {
    key: "myActiveActions",
    label: "My Active Actions",
    href: "/staff/actions?performedBy=me&statusGroup=active",
    description: "Actions you recorded that are planned or in progress.",
  },
] as const;

export function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const hasSnapshotRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    const hasSnapshot = hasSnapshotRef.current;
    if (hasSnapshot) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await getStaffDashboard();
      if (result.response.status === 403) {
        setData(null);
        hasSnapshotRef.current = false;
        setForbidden(true);
        return;
      }
      if (!result.response.ok || !result.data) {
        setError("The staff dashboard could not be loaded. Please try again.");
        return;
      }
      setForbidden(false);
      hasSnapshotRef.current = true;
      setData(result.data);
    } catch {
      setError("The staff dashboard could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (forbidden) {
    return (
      <div
        className="zg-card p-4 text-center"
        data-testid="staff-dashboard-forbidden"
      >
        <h1 className="h5 mb-2">You do not have access to this dashboard</h1>
        <p className="text-muted mb-3">
          This operational summary is available to IT Staff and Administrators.
        </p>
        <Link className="btn btn-zen-secondary" to="/tickets">
          Back to my tickets
        </Link>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div
        aria-live="polite"
        className="my-2"
        data-testid="staff-dashboard-loading"
      >
        <p className="visually-hidden">Loading staff dashboard</p>
        <div className="row g-3 mb-4" aria-hidden="true">
          {METRICS.map((metric) => (
            <div className="col-12 col-sm-6 col-xl-3" key={metric.key}>
              <div className="zg-card p-4 placeholder-glow">
                <span className="placeholder col-7" />
                <span className="placeholder col-4 mt-3" />
              </div>
            </div>
          ))}
        </div>
        <div className="zg-card p-4 placeholder-glow" aria-hidden="true">
          <span className="placeholder col-5" />
          <span className="placeholder col-10 mt-3" />
        </div>
      </div>
    );
  }

  if (!data && error) {
    return (
      <main className="zg-card p-4" data-testid="staff-dashboard-failure">
        <div className="alert alert-danger mb-0" role="alert">
          <p className="mb-2">{error}</p>
          <button
            className="btn btn-sm btn-outline-danger"
            disabled={refreshing}
            onClick={() => void loadDashboard()}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const asOf = data?.asOf ?? null;
  const recentTicketHref = asOf ? recentQueueHref(asOf) : "/staff/queue";
  const recentActionHref = asOf
    ? recentActionsHref(asOf)
    : "/staff/actions?performedBy=me";

  return (
    <main className="my-2" data-testid="staff-dashboard-view">
      <div className="zg-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="h4 fw-bold mb-1 text-zen-primary">
              Staff Dashboard
            </h1>
            <p className="text-muted small mb-1">
              A current operational snapshot for IT Staff and Administrators.
            </p>
            <p className="text-muted small mb-0">
              Recent: last 7 days
              {asOf && (
                <> · Snapshot: {formatBangkokDateTime(asOf)} (Bangkok)</>
              )}
            </p>
          </div>
          <button
            className="btn btn-zen-secondary btn-sm"
            disabled={refreshing}
            onClick={() => void loadDashboard()}
            type="button"
          >
            {refreshing ? "Refreshing…" : "Refresh dashboard"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2">
            {data ? `This snapshot is stale. ${error}` : error}
          </p>
          <button
            className="btn btn-sm btn-outline-danger"
            disabled={refreshing}
            onClick={() => void loadDashboard()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <section aria-label="Staff dashboard metrics" className="row g-3 mb-4">
        {METRICS.map((metric) => (
          <div className="col-12 col-sm-6 col-xl-3" key={metric.key}>
            <Link
              aria-label={`${metric.label}: ${data?.metrics[metric.key] ?? 0}`}
              className="zg-card p-4 h-100 d-block text-decoration-none"
              data-testid={`dashboard-metric-${metric.key}`}
              to={metric.href}
            >
              <div className="small text-muted">{metric.label}</div>
              <div
                className="display-6 fw-bold text-zen-primary"
                aria-live="polite"
              >
                {data?.metrics[metric.key] ?? 0}
              </div>
              <div className="small text-zen-body">{metric.description}</div>
            </Link>
          </div>
        ))}
      </section>

      <section
        aria-labelledby="ticket-status-heading"
        className="zg-card p-4 mb-4"
      >
        <h2 className="h5 fw-semibold" id="ticket-status-heading">
          Tickets by Status
        </h2>
        <p className="small text-muted">
          All tickets, including resolved, closed and cancelled tickets.
        </p>
        <div className="row g-3">
          {data?.groupings.ticketsByStatus.map((group) => (
            <div className="col-12 col-sm-6 col-xl-3" key={group.status}>
              <Link
                aria-label={`${group.status.replaceAll("_", " ")} tickets: ${group.count}`}
                className="border rounded p-3 h-100 d-flex justify-content-between gap-2 text-decoration-none text-zen-primary"
                to={`/staff/queue?status=${group.status}`}
              >
                <span>{group.status.replaceAll("_", " ")}</span>
                <span className="fw-bold" aria-live="polite">
                  {group.count}
                </span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="row g-3">
        <section
          aria-labelledby="recent-tickets-heading"
          className="col-12 col-xl-6"
        >
          <div className="zg-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
              <h2 className="h5 fw-semibold mb-0" id="recent-tickets-heading">
                Recently Updated Tickets
              </h2>
              <Link className="small" to={recentTicketHref}>
                View all
              </Link>
            </div>
            <p className="small text-muted">
              Updated in the last 7 days, newest first.
            </p>
            {data?.lists.recentTickets.length ? (
              <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
                {data.lists.recentTickets.map((ticket) => (
                  <li className="border-top pt-3" key={ticket.id}>
                    <Link
                      className="fw-semibold text-zen-primary"
                      state={{ from: "/dashboard/staff" }}
                      to={`/staff/tickets/${ticket.id}`}
                    >
                      {ticket.number} · {ticket.summary}
                    </Link>
                    <div className="small text-muted mt-1">
                      {ticket.status.replaceAll("_", " ")} · Updated{" "}
                      {formatBangkokDateTime(ticket.updatedAt)} (Bangkok)
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="small text-muted mb-0"
                data-testid="recent-tickets-empty"
              >
                No tickets have been updated in the last 7 days.
              </p>
            )}
          </div>
        </section>

        <section
          aria-labelledby="recent-actions-heading"
          className="col-12 col-xl-6"
        >
          <div className="zg-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
              <h2 className="h5 fw-semibold mb-0" id="recent-actions-heading">
                My Recent Actions
              </h2>
              <Link className="small" to={recentActionHref}>
                View all
              </Link>
            </div>
            <p className="small text-muted">
              Actions recorded by you, not actions assigned to you.
            </p>
            {data?.lists.myRecentActions.length ? (
              <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
                {data.lists.myRecentActions.map((action) => (
                  <li className="border-top pt-3" key={action.id}>
                    <Link
                      className="fw-semibold text-zen-primary"
                      state={{ from: "/dashboard/staff" }}
                      to={`/staff/tickets/${action.ticketId}#action-${action.id}`}
                    >
                      {action.title}
                    </Link>
                    <div className="small text-muted mt-1">
                      {action.ticketNumber} ·{" "}
                      {action.status.replaceAll("_", " ")} ·{" "}
                      {formatBangkokDateTime(action.createdAt)} (Bangkok)
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                className="small text-muted mb-0"
                data-testid="recent-actions-empty"
              >
                You have not recorded any actions in the last 7 days.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
