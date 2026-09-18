import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import StaffTicketQueue from "../../src/components/StaffTicketQueue";
import App from "../../src/App";
import { currentUser, fetchStaffTickets } from "../../src/api";

vi.mock("../../src/api", async () => { const actual = await vi.importActual<typeof import("../../src/api")>("../../src/api"); return { ...actual, currentUser: vi.fn(), fetchStaffTickets: vi.fn() }; });
const data = { page: 1, pageSize: 20, totalItems: 2, totalPages: 1, items: [{ id: 1, ticketNumber: "TKT-1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", summary: "Email issue", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "OPEN", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Email" }, assignedTo: { id: 2, name: "Queue Staff", email: "staff@example.com" } }, { id: 2, ticketNumber: "TKT-2", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", summary: "VPN issue", requestedPriority: "LOW", itPriority: "LOW", currentStatus: "NEW", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "VPN" }, assignedTo: null }] } as any;
describe("StaffTicketQueue", () => { beforeEach(() => { vi.clearAllMocks(); window.location.hash = "#/tickets"; vi.mocked(fetchStaffTickets).mockResolvedValue(data); });
  it("renders required columns, controls, owner states, and detail links", async () => { render(<StaffTicketQueue />); expect(await screen.findByText("TKT-1")).toBeInTheDocument(); expect(screen.getAllByText("Ticket Number").length).toBeGreaterThan(0); expect(screen.getByLabelText("Search tickets")).toBeInTheDocument(); expect(screen.getByText("Queue Staff")).toBeInTheDocument(); expect(screen.getByText("Unassigned")).toBeInTheDocument(); expect(screen.getAllByRole("link", { name: "Open Detail" })[0]).toHaveAttribute("href", "#/staff/tickets/1"); });
  it("updates search, filters, and sorting requests", async () => { render(<StaffTicketQueue />); await screen.findByText("TKT-1"); fireEvent.change(screen.getByLabelText("Search tickets"), { target: { value: "vpn" } }); fireEvent.change(screen.getByLabelText("Status"), { target: { value: "OPEN" } }); fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "HIGH" } }); fireEvent.change(screen.getByLabelText("Sort by"), { target: { value: "ticketNumber" } }); await waitFor(() => expect(fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ search: "vpn", status: "OPEN", itPriority: "HIGH", sortBy: "ticketNumber" }))); });
  it("renders loading, empty, error, and pagination states", async () => { vi.mocked(fetchStaffTickets).mockImplementation(() => new Promise(() => undefined)); render(<StaffTicketQueue />); expect(screen.getByRole("status")).toHaveTextContent("Loading"); });
  it("renders empty and error responses", async () => { vi.mocked(fetchStaffTickets).mockResolvedValueOnce({ ...data, items: [], totalItems: 0, totalPages: 0 }); render(<StaffTicketQueue />); expect(await screen.findByText("No tickets found.")).toBeInTheDocument(); vi.mocked(fetchStaffTickets).mockRejectedValueOnce(new Error("Queue unavailable")); render(<StaffTicketQueue />); expect(await screen.findByRole("alert")).toHaveTextContent("Queue unavailable"); });
  it("renders pagination controls", async () => { vi.mocked(fetchStaffTickets).mockResolvedValue({ ...data, totalPages: 2 }); render(<StaffTicketQueue />); expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument(); });
  it("shows Access denied for direct Queue access by Requesters and Administrators", async () => {
    window.location.hash = "#/staff/tickets";
    for (const role of ["REQUESTER", "ADMINISTRATOR"] as const) {
      vi.mocked(currentUser).mockResolvedValue({ id: 1, name: "User", email: "user@example.com", role, mustChangePassword: false });
      render(<App />);
      expect(await screen.findByRole("heading", { name: "Access denied" })).toBeInTheDocument();
    }
  });
});
