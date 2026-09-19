import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StaffTicketDetail from "../../src/components/StaffTicketDetail";
import { claimStaffTicket, fetchStaffTicketDetail, updateStaffTicketOwner } from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual<typeof import("../../src/api")>("../../src/api");
  return { ...actual, claimStaffTicket: vi.fn(), fetchStaffTicketDetail: vi.fn(), updateStaffTicketOwner: vi.fn() };
});

const detail = {
  id: 7, ticketNumber: "TKT-7", createdAt: "2026-01-01T10:00:00Z", updatedAt: "2026-01-02T15:30:00Z", summary: "Email issue", description: "A detailed issue description.", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", category: { id: 1, name: "Hardware" }, relatedSystem: { id: 1, name: "Email" }, requester: { id: 3, name: "Requester", email: "requester@example.com" }, assignedTo: null, attachments: [], eligibleOwners: [{ id: 4, name: "Staff B", email: "b@example.com", role: "IT_STAFF" }], requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null,
} as any;

describe("StaffTicketDetail", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchStaffTicketDetail).mockResolvedValue(detail); vi.mocked(claimStaffTicket).mockResolvedValue({ id: 9, name: "Current Staff", email: "staff@example.com" }); vi.mocked(updateStaffTicketOwner).mockResolvedValue({ id: 4, name: "Staff B", email: "b@example.com" }); });
  it("renders detail fields and claim/reassign controls", async () => { render(<StaffTicketDetail ticketId={7} />); expect(await screen.findByText("TKT-7")).toBeInTheDocument(); expect(screen.getByText(/Jan 1, 2026/)).toBeInTheDocument(); expect(screen.getByText(/Jan 2, 2026/)).toBeInTheDocument(); expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0); expect(screen.getByRole("button", { name: "Claim ticket" })).toBeInTheDocument(); expect(screen.getByLabelText("Ticket owner")).toBeInTheDocument(); });
  it("claims and reassigns through the authenticated API helpers", async () => { render(<StaffTicketDetail ticketId={7} />); await screen.findByText("TKT-7"); fireEvent.click(screen.getByRole("button", { name: "Claim ticket" })); await waitFor(() => expect(claimStaffTicket).toHaveBeenCalledWith(7)); fireEvent.change(screen.getByLabelText("Ticket owner"), { target: { value: "4" } }); fireEvent.click(screen.getByRole("button", { name: "Save owner" })); await waitFor(() => expect(updateStaffTicketOwner).toHaveBeenCalledWith(7, 4)); });
});
