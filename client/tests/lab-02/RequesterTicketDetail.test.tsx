import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail";
import { useRequester } from "../../src/components/RequesterContext";
import { fetchTicket, type TicketDetail } from "../../src/api.detail";

vi.mock("../../src/components/RequesterContext", () => ({ useRequester: vi.fn() }));
vi.mock("../../src/api.detail", () => ({ fetchTicket: vi.fn() }));

const requester = { id: 3, name: "David Lee", email: "david@example.com" };
const ticket: TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requester,
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 2, name: "Corporate Laptop" },
  summary: "Laptop battery drains quickly",
  description: "The battery drains while idle.",
  requestedPriority: "HIGH",
  currentStatus: "NEW",
  createdAt: "2026-08-31T09:14:00.000Z",
  attachments: [{ id: 7, originalFilename: "report.pdf", contentType: "application/pdf", fileSize: 1024, uploadedAt: "2026-08-31T09:15:00.000Z", isRemoved: false, removedAt: null, removedReason: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRequester).mockReturnValue({
    selectedRequester: requester,
    setSelectedRequester: vi.fn(),
    clearSelectedRequester: vi.fn(),
  });
  vi.mocked(fetchTicket).mockResolvedValue(ticket);
});

describe("RequesterTicketDetail", () => {
  it("shows an owned ticket read-only with attachment metadata", async () => {
    render(<RequesterTicketDetail ticketId={42} />);
    expect(await screen.findByRole("heading", { name: "Ticket Details" })).toBeInTheDocument();
    expect(screen.getAllByText("TKT-2026-000042").length).toBeGreaterThan(0);
    expect(screen.getByText("Laptop battery drains quickly")).toBeInTheDocument();
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.queryByText(/comments|internal notes|actions taken|change status/i)).not.toBeInTheDocument();
    expect(fetchTicket).toHaveBeenCalledWith(42, requester.id);
  });

  it("shows a friendly ownership error without ticket data", async () => {
    vi.mocked(fetchTicket).mockRejectedValue(new Error("You cannot access this ticket"));
    render(<RequesterTicketDetail ticketId={42} />);
    expect(await screen.findByText("You cannot access this ticket")).toBeInTheDocument();
    expect(screen.queryByText("TKT-2026-000042")).not.toBeInTheDocument();
  });

  it("shows a not-found error", async () => {
    vi.mocked(fetchTicket).mockRejectedValue(new Error("Ticket not found"));
    render(<RequesterTicketDetail ticketId={999} />);
    await waitFor(() => expect(screen.getByText("Ticket not found")).toBeInTheDocument());
  });
});
