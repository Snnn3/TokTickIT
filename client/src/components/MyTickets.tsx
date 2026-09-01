import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext";
import type { Category, TicketSummaryItem, TicketPriority, TicketStatus } from "../types/ticket";
import { ZenPriorityBadge, ZenStatusBadge } from "./ZenBadge";
import { formatDateTime } from "../utils/format";

export type { TicketSummaryItem };

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

interface TicketQueryState {
  search: string;
  categoryId: string;
  priority: TicketPriority | "";
  status: TicketStatus | "";
  sort: "updatedAt" | "createdAt" | "number";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
}

const initialQueryState: TicketQueryState = {
  search: "",
  categoryId: "",
  priority: "",
  status: "",
  sort: "updatedAt",
  order: "desc",
  page: 1,
  pageSize: 10,
};

export function MyTickets({ onCreateTicket, onSelectTicket }: MyTicketsProps) {
  const { selectedRequester } = useRequester();

  // State
  const [tickets, setTickets] = useState<TicketSummaryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated Query State
  const [queryState, setQueryState] = useState<TicketQueryState>(initialQueryState);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input by 300ms [ui-spec.md Section 8]
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(queryState.search);
    }, 300);
    return () => clearTimeout(timer);
  }, [queryState.search]);

  // Pagination metadata
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Track if any filter is active
  const hasActiveFilters = Boolean(
    queryState.search.trim() ||
      queryState.categoryId ||
      queryState.priority ||
      queryState.status ||
      queryState.sort !== "updatedAt" ||
      queryState.order !== "desc"
  );

  // Load categories for filter dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/reference/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch {
        // Silently fail category load; fallback to empty list
      }
    }
    loadCategories();
  }, []);

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    if (!selectedRequester) return;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    if (queryState.categoryId) params.set("categoryId", queryState.categoryId);
    if (queryState.priority) params.set("priority", queryState.priority);
    if (queryState.status) params.set("status", queryState.status);
    if (queryState.sort) params.set("sort", queryState.sort);
    if (queryState.order) params.set("order", queryState.order);
    params.set("page", String(queryState.page));
    params.set("pageSize", String(queryState.pageSize));

    try {
      const res = await fetch(`/api/tickets?${params.toString()}`, {
        headers: {
          "X-Requester-Id": String(selectedRequester.id),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message || "Failed to load tickets.");
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
    selectedRequester,
    debouncedSearch,
    queryState.categoryId,
    queryState.priority,
    queryState.status,
    queryState.sort,
    queryState.order,
    queryState.page,
    queryState.pageSize,
  ]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleResetFilters = () => {
    setQueryState(initialQueryState);
  };

  const handleSelectTicket = (ticketId: number) => {
    if (onSelectTicket) onSelectTicket(ticketId);
  };

  return (
    <div className="my-2">
      {/* Header bar */}
      <div className="zg-card p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)" }}>
              My Tickets
            </h1>
            <p className="text-muted small mb-0">
              Track and manage all your submitted IT support tickets.
            </p>
          </div>
          <div>
            <button
              type="button"
              className="btn btn-zen-primary d-flex align-items-center gap-2"
              onClick={() => {
                if (onCreateTicket) onCreateTicket();
              }}
            >
              <span>+</span>
              <span>Create Ticket</span>
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3 bg-light rounded border mb-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-lg-4">
              <label htmlFor="ticket-search" className="visually-hidden">
                Search tickets
              </label>
              <input
                id="ticket-search"
                type="text"
                className="form-control form-control-sm"
                placeholder="Search number or summary"
                value={queryState.search}
                onChange={(e) => {
                  setQueryState((prev) => ({ ...prev, search: e.target.value, page: 1 }));
                }}
              />
            </div>

            {/* Category Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="category-filter" className="visually-hidden">
                Filter by category
              </label>
              <select
                id="category-filter"
                className="form-select form-select-sm"
                value={queryState.categoryId}
                onChange={(e) => {
                  setQueryState((prev) => ({ ...prev, categoryId: e.target.value, page: 1 }));
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

            {/* Priority Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="priority-filter" className="visually-hidden">
                Filter by priority
              </label>
              <select
                id="priority-filter"
                className="form-select form-select-sm"
                value={queryState.priority}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    priority: e.target.value as TicketPriority | "",
                    page: 1,
                  }));
                }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="status-filter" className="visually-hidden">
                Filter by status
              </label>
              <select
                id="status-filter"
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
              </select>
            </div>

            {/* Clear Filters Tertiary Button [ui-spec §3, §8] */}
            <div className="col-6 col-md-3 col-lg-2 text-end">
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
              <span>Sort by:</span>
              <select
                id="sort-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={queryState.sort}
                onChange={(e) => {
                  setQueryState((prev) => ({
                    ...prev,
                    sort: e.target.value as "updatedAt" | "createdAt" | "number",
                    page: 1,
                  }));
                }}
              >
                <option value="updatedAt">Last Updated</option>
                <option value="createdAt">Creation Date</option>
                <option value="number">Ticket Number</option>
              </select>
              <select
                id="order-select"
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

        {/* Error State */}
        {error && (
          <div className="alert alert-danger py-2 mb-3 d-flex justify-content-between align-items-center" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => fetchTickets()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State - Table and Card Skeletons per ui-spec.md §8 */}
        {loading ? (
          <div data-testid="tickets-loading" className="py-2">
            {/* Desktop Table Skeletons (>= 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table align-middle mb-0">
                <thead className="table-light small text-muted text-uppercase" style={{ fontSize: "0.75rem" }}>
                  <tr>
                    <th scope="col" style={{ width: "160px" }}>Ticket Number</th>
                    <th scope="col">Summary</th>
                    <th scope="col" className="d-none d-lg-table-cell" style={{ width: "160px" }}>Category</th>
                    <th scope="col" style={{ width: "110px" }}>Priority</th>
                    <th scope="col" style={{ width: "90px" }}>Status</th>
                    <th scope="col" style={{ width: "170px" }}>Last Updated</th>
                    <th scope="col" style={{ width: "90px" }} className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((idx) => (
                    <tr key={idx}>
                      <td><div className="zg-skeleton-line" style={{ width: "120px" }} /></td>
                      <td><div className="zg-skeleton-line" style={{ width: "70%" }} /></td>
                      <td className="d-none d-lg-table-cell"><div className="zg-skeleton-line" style={{ width: "90px" }} /></td>
                      <td><div className="zg-skeleton-badge" /></td>
                      <td><div className="zg-skeleton-badge" /></td>
                      <td><div className="zg-skeleton-line" style={{ width: "130px" }} /></td>
                      <td className="text-end"><div className="zg-skeleton-line ms-auto" style={{ width: "40px" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Skeletons (< 768px) */}
            <div className="d-md-none">
              <div className="d-flex flex-column gap-3">
                {[1, 2, 3].map((idx) => (
                  <div key={idx} className="p-3 border rounded bg-white shadow-sm">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="zg-skeleton-line" style={{ width: "130px" }} />
                      <div className="d-flex gap-1">
                        <div className="zg-skeleton-badge" />
                        <div className="zg-skeleton-badge" />
                      </div>
                    </div>
                    <div className="zg-skeleton-line mb-3" style={{ width: "85%" }} />
                    <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                      <div className="zg-skeleton-line" style={{ width: "110px" }} />
                      <div className="zg-skeleton-line" style={{ width: "40px" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          /* Empty / No Results State */
          hasActiveFilters ? (
            <div className="text-center py-5 border rounded bg-light" data-testid="no-results-state">
              <div className="h5 fw-semibold mb-2 text-muted">No tickets match your filters</div>
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
            <div className="text-center py-5 border rounded bg-light" data-testid="empty-tickets-state">
              <div className="h5 fw-semibold mb-2" style={{ color: "var(--zg-primary)" }}>
                No tickets yet
              </div>
              <p className="text-muted small mb-3">
                Create your first ticket
              </p>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                onClick={() => {
                  if (onCreateTicket) onCreateTicket();
                }}
              >
                + Create your first ticket
              </button>
            </div>
          )
        ) : (
          /* Tickets List View */
          <div>
            {/* Desktop Table View (>= 768px) */}
            <div className="table-responsive d-none d-md-block" data-testid="tickets-desktop-table">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small text-muted text-uppercase" style={{ fontSize: "0.75rem" }}>
                  <tr>
                    <th scope="col" style={{ width: "160px" }}>Ticket Number</th>
                    <th scope="col">Summary</th>
                    <th scope="col" className="d-none d-lg-table-cell" style={{ width: "160px" }}>Category</th>
                    <th scope="col" style={{ width: "110px" }}>Priority</th>
                    <th scope="col" style={{ width: "90px" }}>Status</th>
                    <th scope="col" style={{ width: "170px" }}>Last Updated</th>
                    <th scope="col" style={{ width: "90px" }} className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 fw-bold text-decoration-none"
                          style={{ color: "var(--zg-primary)" }}
                          onClick={() => handleSelectTicket(ticket.id)}
                        >
                          {ticket.number}
                        </button>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: "340px" }} title={ticket.summary}>
                          {ticket.summary}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <span className="small text-muted">{ticket.categoryName}</span>
                      </td>
                      <td>
                        <ZenPriorityBadge priority={ticket.requestedPriority} />
                      </td>
                      <td>
                        <ZenStatusBadge status={ticket.status} />
                      </td>
                      <td>
                        <span className="small text-muted">
                          {formatDateTime(ticket.updatedAt)}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="zg-action-link"
                          onClick={() => handleSelectTicket(ticket.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (< 768px) - Whole card clickable [AC-22, ui-spec §8] */}
            <div className="d-md-none" data-testid="tickets-mobile-cards">
              <div className="d-flex flex-column gap-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 border rounded bg-white shadow-sm"
                    role="button"
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSelectTicket(ticket.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectTicket(ticket.id);
                      }
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="fw-bold" style={{ color: "var(--zg-primary)" }}>
                        {ticket.number}
                      </span>
                      <div className="d-flex gap-1">
                        <ZenPriorityBadge priority={ticket.requestedPriority} />
                        <ZenStatusBadge status={ticket.status} />
                      </div>
                    </div>

                    <div className="fw-medium small mb-2 text-dark">{ticket.summary}</div>

                    <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
                      <div>
                        <span>Updated: {formatDateTime(ticket.updatedAt)}</span>
                      </div>
                      <button
                        type="button"
                        className="zg-action-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTicket(ticket.id);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls [ui-spec §8: prev/next + page indicator "Page X of Y (N tickets)"; pageSize select {5,10,20}] */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3 mt-4 pt-3 border-top">
              {/* Prev, Page Indicator, Next */}
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm"
                  disabled={queryState.page <= 1}
                  onClick={() => setQueryState((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="small text-muted px-2" data-testid="pagination-page-info">
                  Page <strong>{queryState.page}</strong> of <strong>{totalPages || 1}</strong> ({total} tickets)
                </span>
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm"
                  disabled={queryState.page >= totalPages || totalPages === 0}
                  onClick={() =>
                    setQueryState((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))
                  }
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>

              {/* Page Size Selector */}
              <div className="d-flex align-items-center gap-2 small text-muted">
                <label htmlFor="page-size-select" className="mb-0">
                  Per page:
                </label>
                <select
                  id="page-size-select"
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
