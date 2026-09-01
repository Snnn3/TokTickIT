import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { CreateTicket } from "../../components/CreateTicket";
import { RequesterProvider } from "../../context/RequesterContext";

const mockRequester = {
  id: 1,
  name: "Anucha Wongchai",
  email: "anucha.wongchai@example.com",
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockSystems = [
  { id: 1, name: "Email" },
  { id: 2, name: "Campus Wi-Fi" },
];

function AuthenticatedWrapper({ children }: { children: ReactNode }) {
  return <RequesterProvider>{children}</RequesterProvider>;
}

describe("CreateTicket Component (C-01..C-06, S-01)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem(
      "toktickit_selected_requester",
      JSON.stringify(mockRequester)
    );

    // Default mock for reference endpoints
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/api/reference/categories")) {
        return {
          ok: true,
          json: async () => ({ categories: mockCategories }),
        } as Response;
      }
      if (url.includes("/api/reference/systems")) {
        return {
          ok: true,
          json: async () => ({ systems: mockSystems }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({}),
      } as Response;
    });
  });

  it("renders read-only system metadata and classification fields (S-01, FR-04)", async () => {
    render(
      <AuthenticatedWrapper>
        <CreateTicket />
      </AuthenticatedWrapper>
    );

    expect(screen.getByText(/Create Support Ticket/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ticket Number/i)).toHaveValue("Generated after submission");
    expect(screen.getByLabelText(/Requester/i)).toHaveValue("Anucha Wongchai (anucha.wongchai@example.com)");

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
      expect(screen.getByText("Campus Wi-Fi")).toBeInTheDocument();
    });
  });

  it("shows field-level error when submitting without required fields (C-01, C-03, AC-04, AC-06)", async () => {
    render(
      <AuthenticatedWrapper>
        <CreateTicket />
      </AuthenticatedWrapper>
    );

    const form = screen.getByTestId("create-ticket-form");
    fireEvent.submit(form);

    expect(screen.getByText("Summary is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Category is required")).toBeInTheDocument();
    expect(screen.getByText("Related system is required")).toBeInTheDocument();
    expect(screen.getByText("Requested priority is required")).toBeInTheDocument();
  });

  it("renders live limit indicator and validates over-limit text (C-02, AC-05)", async () => {
    render(
      <AuthenticatedWrapper>
        <CreateTicket />
      </AuthenticatedWrapper>
    );

    const summaryInput = screen.getByLabelText(/Ticket Summary/i);
    fireEvent.change(summaryInput, { target: { value: "A".repeat(151) } });

    const form = screen.getByTestId("create-ticket-form");
    fireEvent.submit(form);

    expect(screen.getByText("Summary must not exceed 150 characters")).toBeInTheDocument();
  });

  it("renders success panel with official ticket number upon successful submission (C-04, AC-01, FR-07)", async () => {
    const onSuccessNavigate = vi.fn();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            ticket: {
              id: 101,
              number: "TKT-2026-00042",
              ticketDate: new Date().toISOString(),
              summary: "Printer not working",
            },
          }),
        } as Response;
      }
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      if (url.includes("/api/reference/systems")) {
        return { ok: true, json: async () => ({ systems: mockSystems }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <AuthenticatedWrapper>
        <CreateTicket onSuccessNavigate={onSuccessNavigate} />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Requested Priority/i), { target: { value: "HIGH" } });
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Printer broken" } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Paper jam error code 12" } });

    fireEvent.submit(screen.getByTestId("create-ticket-form"));

    await waitFor(() => {
      expect(screen.getByTestId("success-panel")).toBeInTheDocument();
    });

    expect(screen.getByText("TKT-2026-00042")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /View My Tickets/i }));
    expect(onSuccessNavigate).toHaveBeenCalledWith(101);
  });

  it("prevents duplicate submissions with busy indicator and disabled controls (C-05, AC-21, BR-18)", async () => {
    let resolvePost: any;
    const postPromise = new Promise((res) => {
      resolvePost = res;
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return postPromise as Promise<Response>;
      }
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      if (url.includes("/api/reference/systems")) {
        return { ok: true, json: async () => ({ systems: mockSystems }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <AuthenticatedWrapper>
        <CreateTicket />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Requested Priority/i), { target: { value: "LOW" } });
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Test Summary" } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Test Description" } });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Button should be in submitting state
    expect(screen.getByText(/Submitting.../i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submitting.../i })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /Submitting.../i })).toBeDisabled();

    // Settle promise
    resolvePost({
      ok: true,
      json: async () => ({
        ticket: { id: 1, number: "TKT-2026-00001", ticketDate: new Date().toISOString() },
      }),
    });

    await waitFor(() => {
      expect(screen.getByTestId("success-panel")).toBeInTheDocument();
    });
  });

  it("preserves form values when API fails with error banner (C-06, AC-20, BR-23)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return {
          ok: false,
          json: async () => ({
            error: { code: "UNEXPECTED", message: "Server connection failed" },
          }),
        } as Response;
      }
      if (url.includes("/api/reference/categories")) {
        return { ok: true, json: async () => ({ categories: mockCategories }) } as Response;
      }
      if (url.includes("/api/reference/systems")) {
        return { ok: true, json: async () => ({ systems: mockSystems }) } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <AuthenticatedWrapper>
        <CreateTicket />
      </AuthenticatedWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Account and Access")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Requested Priority/i), { target: { value: "HIGH" } });
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), { target: { value: "Preserved Summary" } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Preserved Description" } });

    fireEvent.submit(screen.getByTestId("create-ticket-form"));

    await waitFor(() => {
      expect(screen.getByTestId("api-error-banner")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Ticket Summary/i)).toHaveValue("Preserved Summary");
    expect(screen.getByLabelText(/Description/i)).toHaveValue("Preserved Description");
  });
});
