import { useState, useEffect, useCallback } from "react";
import type {
  StaffQueueTicket,
  TicketPriority,
  TicketStatus,
} from "../types/ticket";
import { useCategories } from "../hooks/useReferenceData";
import {
  ZenItPriorityBadge,
  ZenPriorityBadge,
  ZenStatusBadge,
} from "./ZenBadge";
import { formatDateOnly, formatDateTime } from "../utils/format";

interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

interface QueueQueryState {
  search: string;
  status: TicketStatus | "";
  categoryId: string;
  requestedPriority: TicketPriority | "";
  itPriority: TicketPriority | "";
  owner: "" | "assigned" | "unassigned" | "mine";
  sort: "updatedAt" | "createdAt" | "number";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

const initialQueryState: QueueQueryState = {
  search: "",
  status: "",
  categoryId: "",
  requestedPriority: "",
  itPriority: "",
  owner: "",
  sort: "updatedAt",
  order: "desc",
  page: 1,
  pageSize: 10,
};

/**
 * Staff Ticket Queue [FR-22, ui-spec section 6].
 *
 * The shared queue IT Staff open to find work: debounced search on number or
 * summary, status / category / requested-priority / IT-priority / owner
 * filters, sort, and pagination over every ticket. The owner filter is opt-in
 * with All owners the default, so unclaimed work is the first thing visible
 * [D12]. Desktop renders a table (tablet drops Category), small screens render
 * tappable cards. Any row opens for action through onSelectTicket.
 */
export function StaffTicketQueue({ onSelectTicket }: StaffTicketQueueProps) {
  const [tickets, setTickets] = useState<StaffQueueTicket[]>([]);
  const { categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [queryState, setQueryState] =
    useState<QueueQueryState>(initialQueryState);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input by 300ms, matching the requester list convention.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(queryState.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [queryState.search]);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Only the debounced search counts toward "filtered": sort, order and page
  // navigate within a result set, they never empty it [BR-24].
  const hasActiveFilters = Boolean(
    queryState.search.trim() ||
      queryState.status ||
      queryState.categoryId ||
      queryState.requestedPriority ||
      queryState.itPriority ||
      queryState.owner
  );

  // The queue is scoped by the session cookie, so there is no identity to
  // wait for before fetching and nothing for this component to carry.
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (queryState.status) params.set("status", queryState.status);
    if (queryState.categoryId) params.set("categoryId", queryState.categoryId);
    if (queryState.requestedPriority)
      params.set("requestedPriority", queryState.requestedPriority);
    if (queryState.itPriority) params.set("itPriority", queryState.itPriority);
    if (queryState.owner) params.set("owner", queryState.owner);
    if (queryState.sort) params.set("sort", queryState.sort);
    if (queryState.order) params.set("order", queryState.order);
    params.set("page", String(queryState.page));
    params.set("pageSize", String(queryState.pageSize));

    try {
      const res = await fetch(`/api/staff/tickets?${params.toString()}`);

      if (res.status === 403) {
        setTickets([]);
        setTotal(0);
        setTotalPages(0);
        setForbidden(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || "Failed to load the ticket queue.");
        setTickets([]);
        setTotal(0);
        setTotalPages(0);
        return;
      }

      const data = await res.json();
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch {
      setError("Network error. Unable to connect to the server.");
      setTickets([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    queryState.status,
    queryState.categoryId,
    queryState.requestedPriority,
    queryState.itPriority,
    queryState.owner,
    queryState.sort,
    queryState.order,
    queryState.page,
    queryState.pageSize,
  ]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleResetFilters = () => {
    setQueryState((prev) => ({
      ...prev,
      search: "",
      status: "",
      categoryId: "",
      requestedPriority: "",
      itPriority: "",
      owner: "",
      page: 1,
    }));
  };

  const handleSelectTicket = (ticketId: number) => {
    if (onSelectTicket) onSelectTicket(ticketId);
  };

  return (
    <div className="my-2" data-testid="staff-queue-view">
      <div className="zg-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h4 fw-bold mb-1 text-zen-primary">Ticket Queue</h1>
            <p className="text-muted small mb-0">
              Find unclaimed work, narrow it down, and open a ticket for action.
            </p>
          </div>
          <p className="text-muted small mb-0" data-testid="queue-result-count">
            {total} {total === 1 ? "ticket" : "tickets"}
          </p>
        </div>

        {/* Toolbar & Filters [ui-spec section 6] */}
        <div className="p-3 bg-light rounded border mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-lg-3">
              <label htmlFor="queue-search" className="visually-hidden">
                Search number or summary
              </label>
              <input
                id="queue-search"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search number or summary"
                value={queryState.search}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    search: e.target.value,
                    page: 1,
                  }));
                }}
              />
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label htmlFor="queue-status-filter" className="visually-hidden">
                Filter by status
              </label>
              <select
                id="queue-status-filter"
                className="form-select form-select-sm"
                value={queryState.status}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    status: e.target.value as TicketStatus | "",
                    page: 1,
                  }));
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="WAITING_FOR_REQUESTER">
                  WAITING FOR REQUESTER
                </option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
                <option value="REOPENED">REOPENED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label
                htmlFor="queue-category-filter"
                className="visually-hidden"
              >
                Filter by category
              </label>
              <select
                id="queue-category-filter"
                className="form-select form-select-sm"
                value={queryState.categoryId}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                    page: 1,
                  }));
                }}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label
                htmlFor="queue-req-priority-filter"
                className="visually-hidden"
              >
                Filter by requested priority
              </label>
              <select
                id="queue-req-priority-filter"
                className="form-select form-select-sm"
                value={queryState.requestedPriority}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    requestedPriority: e.target.value as TicketPriority | "",
                    page: 1,
                  }));
                }}
              >
                <option value="">All Req Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label
                htmlFor="queue-it-priority-filter"
                className="visually-hidden"
              >
                Filter by IT priority
              </label>
              <select
                id="queue-it-priority-filter"
                className="form-select form-select-sm"
                value={queryState.itPriority}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    itPriority: e.target.value as TicketPriority | "",
                    page: 1,
                  }));
                }}
              >
                <option value="">All IT Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-2">
              <label htmlFor="queue-owner-filter" className="visually-hidden">
                Filter by owner
              </label>
              <select
                id="queue-owner-filter"
                className="form-select form-select-sm"
                value={queryState.owner}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    owner: e.target.value as QueueQueryState["owner"],
                    page: 1,
                  }));
                }}
              >
                <option value="">All owners</option>
                <option value="assigned">Assigned to anyone</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div className="col-6 col-md-4 col-lg-1 text-end">
              <button
                type="button"
                className="btn btn-zen-tertiary btn-sm w-100"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                Clear filters
              </button>
            </div>
          </div>

          {/* Sort Options Strip */}
          <div className="row g-2 mt-2 pt-2 border-top align-items-center small text-muted">
            <div className="col-12 d-flex align-items-center gap-2">
              <label htmlFor="queue-sort-select" className="mb-0">
                Sort by:
              </label>
              <select
                id="queue-sort-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={queryState.sort}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    sort: e.target.value as
                      | "updatedAt"
                      | "createdAt"
                      | "number",
                    page: 1,
                  }));
                }}
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Created</option>
                <option value="number">Number</option>
              </select>
              <label htmlFor="queue-order-select" className="visually-hidden">
                Sort order
              </label>
              <select
                id="queue-order-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={queryState.order}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    order: e.target.value as "asc" | "desc",
                    page: 1,
                  }));
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Forbidden State: a Requester-role caller refused without content */}
        {forbidden && (
          <div
            className="text-center py-5 border rounded bg-light"
            data-testid="queue-forbidden"
          >
            <div className="h5 fw-semibold mb-2 text-zen-primary">
              You do not have access to the ticket queue
            </div>
            <p className="text-muted small mb-0">
              Your role does not have access to this screen. The server refuses
              the request as well, whatever the browser shows.
            </p>
          </div>
        )}

        {/* Failure State with a Retry that preserves the current query */}
        {!forbidden && error && (
          <div
            className="alert alert-danger py-2 mb-3 d-flex justify-content-between align-items-center"
            role="alert"
            data-testid="queue-failure"
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => fetchQueue()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State - Table and Card Skeletons */}
        {!forbidden && !error && loading ? (
          <div data-testid="queue-loading" className="py-2">
            <div className="table-responsive d-none d-md-block">
              <table className="table align-middle mb-0 zg-queue-table">
                <thead
                  className="table-light small text-muted text-uppercase"
                  style={{ fontSize: "0.75rem" }}
                >
                  <tr>
                    <th scope="col" style={{ width: "150px" }}>
                      Ticket Number
                    </th>
                    <th scope="col" style={{ width: "110px" }}>
                      Created
                    </th>
                    <th scope="col">Summary</th>
                    <th
                      scope="col"
                      className="d-none d-lg-table-cell"
                      style={{ width: "130px" }}
                    >
                      Category
                    </th>
                    <th scope="col" style={{ width: "90px" }}>
                      Req Pri
                    </th>
                    <th scope="col" style={{ width: "100px" }}>
                      IT Pri
                    </th>
                    <th scope="col" style={{ width: "110px" }}>
                      Status
                    </th>
                    <th scope="col" style={{ width: "130px" }}>
                      Owner
                    </th>
                    <th scope="col" style={{ width: "150px" }}>
                      Updated
                    </th>
                    <th
                      scope="col"
                      style={{ width: "70px" }}
                      className="text-end"
                    >
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx}>
                      <td>
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "120px" }}
                        />
                      </td>
                      <td>
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "80px" }}
                        />
                      </td>
                      <td>
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "70%" }}
                        />
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "90px" }}
                        />
                      </td>
                      <td>
                        <div className="zg-skeleton-badge" />
                      </td>
                      <td>
                        <div className="zg-skeleton-badge" />
                      </td>
                      <td>
                        <div className="zg-skeleton-badge" />
                      </td>
                      <td>
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "90px" }}
                        />
                      </td>
                      <td>
                        <div
                          className="zg-skeleton-line"
                          style={{ width: "120px" }}
                        />
                      </td>
                      <td className="text-end">
                        <div
                          className="zg-skeleton-line ms-auto"
                          style={{ width: "40px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-md-none">
              <div className="d-flex flex-column gap-3">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded bg-white shadow-sm"
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div
                        className="zg-skeleton-line"
                        style={{ width: "130px" }}
                      />
                      <div className="d-flex gap-1">
                        <div className="zg-skeleton-badge" />
                        <div className="zg-skeleton-badge" />
                      </div>
                    </div>
                    <div
                      className="zg-skeleton-line mb-3"
                      style={{ width: "85%" }}
                    />
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div
                        className="zg-skeleton-line"
                        style={{ width: "110px" }}
                      />
                      <div
                        className="zg-skeleton-line"
                        style={{ width: "40px" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !forbidden && !error && tickets.length === 0 ? (
          /* Empty vs No Results: never confused [AC-18] */
          hasActiveFilters ? (
            <div
              className="text-center py-5 border rounded bg-light"
              data-testid="queue-no-results"
            >
              <div className="h5 fw-semibold mb-2 text-muted">
                No tickets match your filters
              </div>
              <p className="text-muted small mb-3">
                Try adjusting your search keywords or filter criteria.
              </p>
              <button
                type="button"
                className="btn btn-zen-secondary btn-sm"
                onClick={handleResetFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className="text-center py-5 border rounded bg-light"
              data-testid="queue-empty"
            >
              <div className="h5 fw-semibold mb-2 text-zen-primary">
                No tickets in queue
              </div>
              <p className="text-muted small mb-0">
                There is no work waiting right now. New tickets filed by
                requesters will appear here.
              </p>
            </div>
          )
        ) : (
          !forbidden &&
          !error && (
            <div>
              {/* Desktop Table View (>= 992px; compact widths use cards) */}
              <div
                className="table-responsive d-none d-lg-block"
                data-testid="queue-table"
              >
                <table className="table table-hover align-middle mb-0 zg-queue-table">
                  <thead
                    className="table-light small text-muted text-uppercase"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <tr>
                      <th scope="col" style={{ width: "150px" }}>
                        Ticket Number
                      </th>
                      <th scope="col" style={{ width: "110px" }}>
                        Created
                      </th>
                      <th scope="col">Summary</th>
                      <th
                        scope="col"
                        className="d-none d-lg-table-cell"
                        style={{ width: "130px" }}
                      >
                        Category
                      </th>
                      <th scope="col" style={{ width: "90px" }}>
                        Req Pri
                      </th>
                      <th scope="col" style={{ width: "100px" }}>
                        IT Pri
                      </th>
                      <th scope="col" style={{ width: "130px" }}>
                        Status
                      </th>
                      <th scope="col" style={{ width: "130px" }}>
                        Owner
                      </th>
                      <th scope="col" style={{ width: "150px" }}>
                        Updated
                      </th>
                      <th
                        scope="col"
                        style={{ width: "70px" }}
                        className="text-end"
                      >
                        Open
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} data-testid="queue-row">
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 fw-bold text-decoration-none text-zen-primary"
                            onClick={() => handleSelectTicket(ticket.id)}
                          >
                            {ticket.number}
                          </button>
                        </td>
                        <td>
                          <span className="small text-muted">
                            {formatDateOnly(ticket.createdAt)}
                          </span>
                        </td>
                        <td>
                          <div
                            className="text-truncate"
                            style={{ maxWidth: "280px" }}
                            title={ticket.summary}
                          >
                            {ticket.summary}
                          </div>
                          <div className="small text-muted">
                            Filed by{" "}
                            <span className="fw-medium">
                              {ticket.requester.name}
                            </span>
                          </div>
                        </td>
                        <td className="d-none d-lg-table-cell">
                          <span className="small text-muted">
                            {ticket.categoryName}
                          </span>
                        </td>
                        <td>
                          <ZenPriorityBadge
                            priority={ticket.requestedPriority}
                          />
                        </td>
                        <td>
                          <ZenItPriorityBadge priority={ticket.itPriority} />
                        </td>
                        <td>
                          <ZenStatusBadge status={ticket.status} />
                          {ticket.appearsResolvedAt && (
                            <span
                              className="badge badge-zen-appears-resolved d-block mt-1"
                              data-testid="appears-resolved-badge"
                            >
                              REQUESTER SAYS FIXED
                            </span>
                          )}
                        </td>
                        <td>
                          {ticket.owner ? (
                            <span className="small fw-medium text-zen-body">
                              {ticket.owner.name}
                            </span>
                          ) : (
                            <span className="small text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="small text-muted text-truncate d-block">
                            {formatDateTime(ticket.updatedAt)}
                          </span>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="zg-action-link"
                            onClick={() => handleSelectTicket(ticket.id)}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compact Cards View (< 992px): tappable to detail */}
              <div className="d-lg-none" data-testid="queue-cards">
                <div className="d-flex flex-column gap-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 border rounded bg-white shadow-sm"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                      data-testid="queue-card"
                      onClick={() => handleSelectTicket(ticket.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectTicket(ticket.id);
                        }
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <span className="fw-bold text-zen-primary">
                          {ticket.number}
                        </span>
                        <div className="d-flex flex-wrap justify-content-end gap-1">
                          <ZenStatusBadge status={ticket.status} />
                          {ticket.appearsResolvedAt && (
                            <span
                              className="badge badge-zen-appears-resolved"
                              data-testid="appears-resolved-badge"
                            >
                              REQUESTER SAYS FIXED
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="fw-medium small mb-1 text-zen-body">
                        {ticket.summary}
                      </div>
                      <div className="small text-muted mb-2">
                        Filed by{" "}
                        <span className="fw-medium">
                          {ticket.requester.name}
                        </span>
                      </div>
                      <div className="d-flex gap-1 mb-2">
                        <ZenPriorityBadge priority={ticket.requestedPriority} />
                        <ZenItPriorityBadge priority={ticket.itPriority} />
                      </div>

                      <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
                        <div>
                          {ticket.owner ? (
                            <span>{ticket.owner.name}</span>
                          ) : (
                            <span>Unassigned</span>
                          )}
                          <span>
                            {" "}
                            · Updated: {formatDateTime(ticket.updatedAt)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="zg-action-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTicket(ticket.id);
                          }}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Controls: prev/next + page indicator + page size */}
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4 pt-3 border-top">
                <div className="d-flex align-items-center gap-2 small text-muted">
                  <label htmlFor="queue-page-size-select" className="mb-0">
                    Per page:
                  </label>
                  <select
                    id="queue-page-size-select"
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={queryState.pageSize}
                    onChange={(e) => {
                      setQueryState((prev) => ({
                        ...prev,
                        pageSize: Number(e.target.value),
                        page: 1,
                      }));
                    }}
                    aria-label="Page size"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-zen-secondary btn-sm"
                    disabled={queryState.page <= 1}
                    onClick={() =>
                      setQueryState((prev) => ({
                        ...prev,
                        page: Math.max(1, prev.page - 1),
                      }))
                    }
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span
                    className="small text-muted px-2"
                    data-testid="pagination-page-info"
                  >
                    Page <strong>{queryState.page}</strong> of{" "}
                    <strong>{totalPages || 1}</strong> ({total} tickets)
                  </span>
                  <button
                    type="button"
                    className="btn btn-zen-secondary btn-sm"
                    disabled={queryState.page >= totalPages || totalPages === 0}
                    onClick={() =>
                      setQueryState((prev) => ({
                        ...prev,
                        page: Math.min(totalPages, prev.page + 1),
                      }))
                    }
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
