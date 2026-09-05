import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail";
import { useRequester } from "../../src/components/RequesterContext";
import { fetchTicket, type TicketDetail } from "../../src/api.detail";

vi.mock("../../src/components/RequesterContext", () => ({ useRequester: vi.fn() }));
vi.mock("../../src/api.detail", () => ({ fetchTicket: vi.fn() }));
vi.mock("../../src/api", () => ({ downloadAttachment: vi.fn(), removeAttachment: vi.fn(), uploadAttachment: vi.fn() }));

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
  attachments: [{ id: 7, originalFilename: "wrong-report.pdf", contentType: "application/pdf", fileSize: 1024, uploadedAt: "2026-08-31T09:15:00.000Z", isRemoved: true, removedAt: "2026-08-31T09:16:00.000Z", removedReason: "Uploaded the wrong report" }],
};

describe("AttachmentSection", () => {
  beforeEach(() => {
    vi.mocked(useRequester).mockReturnValue({ selectedRequester: requester, setSelectedRequester: vi.fn(), clearSelectedRequester: vi.fn() });
    vi.mocked(fetchTicket).mockResolvedValue(ticket);
  });

  it("shows removed metadata without download or remove controls", async () => {
    render(<RequesterTicketDetail ticketId={42} />);
    expect(await screen.findByText("wrong-report.pdf")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded the wrong report/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Preview wrong-report.pdf" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
