import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CreateTicket from "../../src/components/CreateTicket";
import * as api from "../../src/api";
import { RequesterProvider } from "../../src/components/RequesterContext";
// Mock API functions
vi.mock("../../src/api", () => ({
  fetchCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Hardware" }]),
  fetchRelatedSystems: vi.fn().mockResolvedValue([{ id: 1, name: "Email System" }]),
  createTicket: vi.fn().mockResolvedValue({ ticketNumber: "TICK-999" }),
}));

const mockRequester = { id: 1, name: "Charlie Brown", email: "charlie@example.com" };

// Helper to wrap component with required context
function renderWithContext(ui: React.ReactNode) {
  // Mock localStorage for RequesterContext
  vi.spyOn(Storage.prototype, "getItem").mockReturnValue(JSON.stringify(mockRequester));
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("CreateTicket Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and then loads reference data", async () => {
    renderWithContext(<CreateTicket />);
    
    expect(screen.getByText(/loading ticket options/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create ticket/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Charlie Brown")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty required fields", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/please select a category/i)).toBeInTheDocument();
    expect(screen.getByText(/summary must be between 10 and 150 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be between 20 and 5000 characters/i)).toBeInTheDocument();
  });

  it("validates summary and description character limits", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    // Enter short summary and description
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Short" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Too short desc" } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/summary must be between 10 and 150 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be between 20 and 5000 characters/i)).toBeInTheDocument();
  });

  it("submits successfully and shows success screen with ticket number", async () => {
    // Mock global fetch for successful ticket creation
    vi.spyOn(window, "fetch").mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/categories")) {
        return new Response(JSON.stringify([{ id: 1, name: "Hardware" }]), { status: 200 });
      }
      if (urlString.includes("/api/related-systems")) {
        return new Response(JSON.stringify([{ id: 1, name: "Email System" }]), { status: 200 });
      }
      if (urlString.includes("/api/tickets")) {
        return new Response(JSON.stringify({ ticketNumber: "TKT-2026-0099" }), { status: 201 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Network connection is down in lab" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Please help check the router configuration on the 3rd floor." } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    // Verify success state appears with dynamic ticket number format
    await waitFor(() => {
      expect(screen.getByText(/TKT-/i)).toBeInTheDocument();
    });
  });

  it("preserves form data and shows error message when API submission fails", async () => {
    // Mock global fetch to return server error on ticket creation
    vi.spyOn(window, "fetch").mockImplementation(async (url) => {
      const urlString = String(url);
      if (urlString.includes("/api/categories")) {
        return new Response(JSON.stringify([{ id: 1, name: "Hardware" }]), { status: 200 });
      }
      if (urlString.includes("/api/related-systems")) {
        return new Response(JSON.stringify([{ id: 1, name: "Email System" }]), { status: 200 });
      }
      if (urlString.includes("/api/tickets")) {
        return new Response(JSON.stringify({ error: { message: "Unable to create ticket. Please try again." } }), { status: 500 });
      }
      return new Response(JSON.stringify({}), { status: 404 });
    });

    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit ticket/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/related system/i), { target: { value: "1" } });
    const summaryInput = screen.getByLabelText(/summary/i);
    fireEvent.change(summaryInput, { target: { value: "Important system bug found" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Detailed description of the critical bug happening right now." } });

    fireEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    // Verify error message is shown and form data is preserved
    await waitFor(() => {
      expect(screen.getByText(/unable to create ticket/i)).toBeInTheDocument();
    });
    expect(summaryInput).toHaveValue("Important system bug found");
  });
});