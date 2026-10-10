import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getRequesterDashboard } from "../api/dashboard";
import { useAuth } from "../context/AuthContext";
import type {
  DashboardTicketSummary,
  RequesterDashboardResponse,
} from "../types/dashboard";
import { isAuthRequired } from "../utils/authRequired";
import { getRecentDateBounds } from "../utils/dashboardDateBounds";
import { formatBangkokDateTime } from "../utils/format";
import { ZenStatusBadge } from "./ZenBadge";

function recentUpdatedHref(asOf: string) {
  return `/tickets?${new URLSearchParams({
    dateField: "updatedAt",
    ...getRecentDateBounds(asOf),
  }).toString()}`;
}

function recentResolvedHref(asOf: string) {
  return `/tickets?${new URLSearchParams({
    statusGroup: "resolved",
    dateField: "resolvedAt",
    ...getRecentDateBounds(asOf),
  }).toString()}`;
}

const METRICS = [
  {
    key: "openTickets",
    label: "My Open Tickets",
    href: "/tickets?statusGroup=open",
    description: "Tickets still moving through the support workflow.",
  },
  {
    key: "waitingForRequester",
    label: "Waiting for Me",
    href: "/tickets?status=WAITING_FOR_REQUESTER",
    description: "Tickets that need a response from you.",
  },
  {
    key: "recentlyUpdated",
    label: "Recently Updated",
    href: null,
    description: "Your Tickets updated in the last 7 days.",
  },
  {
    key: "recentlyResolved",
    label: "Recently Resolved",
    href: null,
    description: "Your Tickets resolved in the last 7 days.",
  },
] as const;

interface TicketListProps {
  heading: string;
  testId: string;
  tickets: DashboardTicketSummary[];
  viewAllHref: string;
  emptyText: string;
  timestamp: "updatedAt" | "resolvedAt";
  since?: string;
}

function TicketList({
  heading,
  testId,
  tickets,
  viewAllHref,
  emptyText,
  timestamp,
  since,
}: TicketListProps) {
  const timeLabel = timestamp === "updatedAt" ? "Updated" : "Resolved";

  return (
    <section aria-labelledby={`${testId}-heading`} className="col-12 col-xl-6">
      <div className="zg-card p-4 h-100">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <h2 className="h5 fw-semibold mb-0" id={`${testId}-heading`}>
            {heading}
          </h2>
          <Link className="small" to={viewAllHref}>
            View all
          </Link>
        </div>
        <p className="small text-muted">
          {since
            ? `${timeLabel} since ${formatBangkokDateTime(since)} (Bangkok), newest first.`
            : "All tickets waiting for your response, newest first."}
        </p>
        {tickets.length ? (
          <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
            {tickets.map((ticket) => (
              <li className="border-top pt-3" key={ticket.id}>
                <Link
                  className="fw-semibold text-zen-primary zg-breakable-text"
                  state={{ from: "/dashboard/requester" }}
                  to={`/tickets/${ticket.id}`}
                >
                  {ticket.number} · {ticket.summary}
                </Link>
                <div className="small text-muted mt-1 d-flex flex-wrap align-items-center gap-2">
                  <ZenStatusBadge status={ticket.status} />
                  <span>
                    {timeLabel}{" "}
                    {formatBangkokDateTime(
                      ticket[timestamp] ?? ticket.updatedAt
                    )}{" "}
                    (Bangkok)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small text-muted mb-0" data-testid={testId}>
            {emptyText}
          </p>
        )}
      </div>
    </section>
  );
}

export function RequesterDashboard() {
  const { expireSession } = useAuth();
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const hasSnapshotRef = useRef(false);

  const loadDashboard = useCallback(async () => {
    if (hasSnapshotRef.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await getRequesterDashboard();
      if (await isAuthRequired(result.response)) {
        expireSession();
        return;
      }
      if (result.response.status === 403) {
        setData(null);
        hasSnapshotRef.current = false;
        setForbidden(true);
        setNotFound(false);
        return;
      }
      if (result.response.status === 404) {
        setData(null);
        hasSnapshotRef.current = false;
        setForbidden(false);
        setNotFound(true);
        return;
      }
      if (!result.response.ok || !result.data) {
        setError("The dashboard could not be loaded. Please try again.");
        return;
      }
      setForbidden(false);
      setNotFound(false);
      hasSnapshotRef.current = true;
      setData(result.data);
    } catch {
      setError("The dashboard could not be loaded. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expireSession]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (forbidden) {
    return (
      <div
        className="zg-card p-4 text-center"
        data-testid="requester-dashboard-forbidden"
      >
        <h1 className="h5 mb-2">You do not have access to this dashboard</h1>
        <p className="text-muted mb-3">
          Your dashboard data is unavailable for this account.
        </p>
        <Link className="btn btn-zen-secondary" to="/tickets">
          Back to my tickets
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        className="zg-card p-4 text-center"
        data-testid="requester-dashboard-not-found"
      >
        <h1 className="h5 mb-2">Dashboard not found</h1>
        <p className="text-muted mb-3">
          This dashboard is unavailable. Your Tickets are still accessible.
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
        data-testid="requester-dashboard-loading"
      >
        <p className="visually-hidden">Loading requester dashboard</p>
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
      <main className="zg-card p-4" data-testid="requester-dashboard-failure">
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
  const { from } = asOf ? getRecentDateBounds(asOf) : { from: "" };

  return (
    <main className="my-2" data-testid="requester-dashboard-view">
      <div className="zg-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <h1 className="h4 fw-bold mb-1 text-zen-primary">My Dashboard</h1>
            <p className="text-muted small mb-1">
              A summary of your Tickets and the work that needs your attention.
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
          <p className="mb-2">This snapshot is stale. {error}</p>
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

      <section aria-label="My dashboard metrics" className="row g-3 mb-4">
        {METRICS.map((metric) => {
          const href =
            metric.key === "recentlyUpdated" && asOf
              ? recentUpdatedHref(asOf)
              : metric.key === "recentlyResolved" && asOf
                ? recentResolvedHref(asOf)
                : (metric.href ?? "/tickets");
          const count = data?.metrics[metric.key] ?? 0;
          return (
            <div className="col-12 col-sm-6 col-xl-3" key={metric.key}>
              <Link
                aria-label={`${metric.label}: ${count}`}
                className="zg-card p-4 h-100 d-block text-decoration-none"
                data-testid={`requester-dashboard-metric-${metric.key}`}
                to={href}
              >
                <div className="small text-muted">{metric.label}</div>
                <div
                  className="display-6 fw-bold text-zen-primary"
                  aria-live="polite"
                >
                  {count}
                </div>
                <div className="small text-zen-body">{metric.description}</div>
              </Link>
            </div>
          );
        })}
      </section>

      <div className="row g-3">
        <TicketList
          heading="Tickets Needing Attention"
          testId="requester-attention-empty"
          tickets={data?.lists.attentionTickets ?? []}
          viewAllHref="/tickets?status=WAITING_FOR_REQUESTER"
          emptyText="No Tickets are waiting for your response."
          timestamp="updatedAt"
        />
        <TicketList
          heading="Recently Updated Tickets"
          testId="requester-recent-empty"
          tickets={data?.lists.recentTickets ?? []}
          viewAllHref={asOf ? recentUpdatedHref(asOf) : "/tickets"}
          emptyText="No Tickets have been updated in the last 7 days."
          timestamp="updatedAt"
          since={from || undefined}
        />
        <TicketList
          heading="Recently Resolved Tickets"
          testId="requester-resolved-empty"
          tickets={data?.lists.resolvedTickets ?? []}
          viewAllHref={
            asOf ? recentResolvedHref(asOf) : "/tickets?statusGroup=resolved"
          }
          emptyText="No Tickets were resolved in the last 7 days."
          timestamp="resolvedAt"
          since={from || undefined}
        />
      </div>
    </main>
  );
}
