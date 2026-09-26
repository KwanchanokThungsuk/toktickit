import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTicketInspection from "../../src/components/AdminTicketInspection";
import { fetchAdminInternalNotes, fetchAdminTicketInspection, updateAdminTicketPriority } from "../../src/api";

vi.mock("../../src/api", async () => ({ ...(await vi.importActual<typeof import("../../src/api")>("../../src/api")), fetchAdminInternalNotes: vi.fn(), fetchAdminTicketInspection: vi.fn(), updateAdminTicketPriority: vi.fn() }));
const ticket = { id: 7, ticketNumber: "TKT-7", summary: "Email issue", description: "Details", requestedPriority: "HIGH", itPriority: "HIGH", currentStatus: "NEW", requester: { name: "Requester" }, category: { name: "Hardware" }, relatedSystem: { name: "Email" }, assignedTo: null, publicComments: [{ id: 1, body: "Public update", author: { name: "Staff" } }], internalNotes: [] } as any;
describe("Administrator Ticket Inspection", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchAdminTicketInspection).mockResolvedValue(ticket); vi.mocked(fetchAdminInternalNotes).mockResolvedValue([{ id: 2, body: "Private note", author: { name: "Staff" } }] as any); vi.mocked(updateAdminTicketPriority).mockResolvedValue({ itPriority: "LOW" }); });
  it("reads comments and internal notes without staff composers", async () => { render(<AdminTicketInspection ticketId={7} />); expect(await screen.findByText("Public update")).toBeInTheDocument(); expect(await screen.findByText("Private note")).toBeInTheDocument(); expect(screen.queryByText(/Post|Claim|Reassign/i)).not.toBeInTheDocument(); expect(fetchAdminInternalNotes).toHaveBeenCalledWith(7); });
  it("updates only IT Priority", async () => { render(<AdminTicketInspection ticketId={7} />); await screen.findByText("TKT-7"); fireEvent.change(screen.getByLabelText("IT Priority"), { target: { value: "LOW" } }); fireEvent.click(screen.getByRole("button", { name: "Save IT Priority" })); await waitFor(() => expect(updateAdminTicketPriority).toHaveBeenCalledWith(7, "LOW")); });
});
