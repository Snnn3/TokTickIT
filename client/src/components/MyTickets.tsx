import { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext";

export interface TicketSummaryItem {
  id: number;
  number: string;
  summary: string;
  categoryId: number;
  categoryName: string;
  systemId: number;
  systemName: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  status: "NEW";
  ticketDate: string;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
}

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export function MyTickets({ onCreateTicket, onSelectTicket }: MyTicketsProps) {
  const { selectedRequester } = useRequester();

  // State
  const [tickets, setTickets] = useState<TicketSummaryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input by 300ms [ui-spec.md Section 8]
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Pagination metadata
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Track if any filter is active
  const hasActiveFilters = Boolean(
    search.trim() || categoryId || priority || status || sort !== "updatedAt" || order !== "desc"
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
    if (categoryId) params.set("categoryId", categoryId);
    if (priority) params.set("priority", priority);
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

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
  }, [selectedRequester, debouncedSearch, categoryId, priority, status, sort, order, page, pageSize]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleResetFilters = () => {
    setSearch("");
    setCategoryId("");
    setPriority("");
    setStatus("");
    setSort("updatedAt");
    setOrder("desc");
    setPage(1);
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "HIGH":
        return "badge badge-zen-high";
      case "MEDIUM":
        return "badge badge-zen-medium";
      case "LOW":
      default:
        return "badge badge-zen-low";
    }
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

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
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
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
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
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
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="NEW">NEW</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div className="col-6 col-md-3 col-lg-2 text-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Sort & Pagination Options Strip */}
          <div className="row g-2 mt-2 pt-2 border-top align-items-center small text-muted">
            <div className="col-12 col-md-auto d-flex align-items-center gap-2">
              <span>Sort by:</span>
              <select
                id="sort-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
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
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value as "asc" | "desc");
                  setPage(1);
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            <div className="col-12 col-md-auto ms-md-auto d-flex align-items-center gap-2">
              <span>Page size:</span>
              <select
                id="page-size-select"
                className="form-select form-select-sm"
                style={{ width: "auto" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
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

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-5" data-testid="tickets-loading">
            <div
              className="spinner-border text-success mb-2"
              role="status"
              style={{ color: "var(--zg-primary)" }}
            >
              <span className="visually-hidden">Loading tickets...</span>
            </div>
            <p className="text-muted small mb-0">Loading your tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          /* Empty / No Results State */
          hasActiveFilters ? (
            <div className="text-center py-5 border rounded bg-light" data-testid="no-results-state">
              <div className="h5 fw-semibold mb-2 text-muted">No Matching Tickets</div>
              <p className="text-muted small mb-3">
                No tickets match your search or filter criteria.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="text-center py-5 border rounded bg-light" data-testid="empty-tickets-state">
              <div className="h5 fw-semibold mb-2" style={{ color: "var(--zg-primary)" }}>
                No Tickets Found
              </div>
              <p className="text-muted small mb-3">
                You haven't created any support tickets yet.
              </p>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                onClick={() => {
                  if (onCreateTicket) onCreateTicket();
                }}
              >
                + Create Your First Ticket
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
                          onClick={() => {
                            if (onSelectTicket) onSelectTicket(ticket.id);
                          }}
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
                        <span className={getPriorityBadgeClass(ticket.requestedPriority)}>
                          {ticket.requestedPriority}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-zen-new">{ticket.status}</span>
                      </td>
                      <td>
                        <span className="small text-muted">
                          {new Date(ticket.updatedAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-zen-secondary btn-sm py-0 px-2"
                          onClick={() => {
                            if (onSelectTicket) onSelectTicket(ticket.id);
                          }}
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
                    onClick={() => {
                      if (onSelectTicket) onSelectTicket(ticket.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (onSelectTicket) onSelectTicket(ticket.id);
                      }
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="fw-bold" style={{ color: "var(--zg-primary)" }}>
                        {ticket.number}
                      </span>
                      <div className="d-flex gap-1">
                        <span className={getPriorityBadgeClass(ticket.requestedPriority)}>
                          {ticket.requestedPriority}
                        </span>
                        <span className="badge badge-zen-new">{ticket.status}</span>
                      </div>
                    </div>

                    <div className="fw-medium small mb-2 text-dark">{ticket.summary}</div>

                    <div className="d-flex justify-content-between align-items-center small text-muted pt-2 border-top">
                      <div>
                        <span>{ticket.categoryName}</span> • <span>{ticket.systemName}</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-zen-secondary btn-sm py-0 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectTicket) onSelectTicket(ticket.id);
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-4 pt-3 border-top">
              <div className="small text-muted" data-testid="pagination-showing">
                Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{" "}
                <strong>{total}</strong> tickets
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <span className="small text-muted px-2" data-testid="pagination-page-info">
                  Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong> ({total} tickets)
                </span>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  disabled={page >= totalPages || totalPages === 0}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
