import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CreateTicket from "../../src/components/CreateTicket";
import * as api from "../../src/api";
import { RequesterProvider } from "../../src/components/RequesterContext";
// Mock API functions
vi.mock("../../src/api", () => ({
  fetchCategories: vi.fn().mockResolvedValue([{ id: 1, name: "Hardware" }]),
  fetchRelatedSystems: vi.fn().mockResolvedValue([{ id: 1, name: "Email System" }]),
  createTicket: vi.fn().mockResolvedValue({ id: 101, ticketNumber: "TICK-101" }),
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
});