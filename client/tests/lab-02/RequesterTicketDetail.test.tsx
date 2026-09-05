import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail";
import { useRequester } from "../../src/components/RequesterContext";
import { fetchTicket, type TicketDetail } from "../../src/api.detail";
import {
  downloadAttachment,
  removeAttachment,
  uploadAttachment,
} from "../../src/api";

vi.mock("../../src/components/RequesterContext", () => ({
  useRequester: vi.fn(),
}));

vi.mock("../../src/api.detail", () => ({
  fetchTicket: vi.fn(),
}));

vi.mock("../../src/api", () => ({
  downloadAttachment: vi.fn(),
  removeAttachment: vi.fn(),
  uploadAttachment: vi.fn(),
}));

const requester = {
  id: 3,
  name: "David Lee",
  email: "david@example.com",
};

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
  attachments: [
    {
      id: 7,
      originalFilename: "report.pdf",
      contentType: "application/pdf",
      fileSize: 1024,
      uploadedAt: "2026-08-31T09:15:00.000Z",
      isRemoved: false,
      removedAt: null,
      removedReason: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useRequester).mockReturnValue({
    selectedRequester: requester,
    setSelectedRequester: vi.fn(),
    clearSelectedRequester: vi.fn(),
  });

  vi.mocked(fetchTicket).mockResolvedValue(ticket);

  vi.mocked(downloadAttachment).mockResolvedValue({
    blob: new Blob(["preview"], {
      type: "application/pdf",
    }),
    filename: "report.pdf",
  });

  vi.mocked(removeAttachment).mockResolvedValue({
    ...ticket.attachments[0],
    ticketId: ticket.id,
    removedById: requester.id,
    isRemoved: true,
    removedAt: "2026-09-01T09:15:00.000Z",
    removedReason: "Uploaded the wrong file",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("RequesterTicketDetail", () => {
  it("shows an owned ticket read-only with attachment metadata", async () => {
    render(<RequesterTicketDetail ticketId={42} />);

    expect(
      await screen.findByRole("heading", {
        name: "Ticket Details",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText("TKT-2026-000042").length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByText("Laptop battery drains quickly"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("report.pdf"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Attachments (1 active of 5)"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Preview report.pdf",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Download report.pdf",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(
        /comments|internal notes|actions taken|change status/i,
      ),
    ).not.toBeInTheDocument();

    expect(fetchTicket).toHaveBeenCalledWith(
      42,
      requester.id,
    );
  });

  it("previews an active attachment in a new tab", async () => {
    const previewWindow = {
      close: vi.fn(),
      location: {
        href: "",
      },
    };

    vi.spyOn(window, "open").mockReturnValue(
      previewWindow as unknown as Window,
    );

    const createObjectURL = vi.fn(() => "blob:preview");

    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL: vi.fn(),
    });

    render(<RequesterTicketDetail ticketId={42} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Preview report.pdf",
      }),
    );

    await waitFor(() =>
      expect(downloadAttachment).toHaveBeenCalledWith(
        7,
        requester.id,
      ),
    );

    expect(window.open).toHaveBeenCalledWith(
      "",
      "_blank",
    );

    expect(previewWindow.location.href).toBe(
      "blob:preview",
    );
  });

  it("shows preview errors safely", async () => {
    vi.mocked(downloadAttachment).mockRejectedValue(
      new Error("Unable to download attachment"),
    );

    vi.spyOn(window, "open").mockReturnValue({
      close: vi.fn(),
      location: {
        href: "",
      },
    } as unknown as Window);

    render(<RequesterTicketDetail ticketId={42} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Preview report.pdf",
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Unable to download attachment",
    );
  });

  it("does not show Preview for unsupported attachment types", async () => {
    vi.mocked(fetchTicket).mockResolvedValue({
      ...ticket,
      attachments: [
        {
          ...ticket.attachments[0],
          originalFilename: "archive.zip",
          contentType: "application/zip",
        },
      ],
    });

    render(<RequesterTicketDetail ticketId={42} />);

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    expect(
      screen.queryByRole("button", {
        name: "Preview archive.zip",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Download archive.zip",
      }),
    ).toBeInTheDocument();
  });

  it("shows a friendly ownership error without ticket data", async () => {
    vi.mocked(fetchTicket).mockRejectedValue(
      new Error("You cannot access this ticket"),
    );

    render(<RequesterTicketDetail ticketId={42} />);

    expect(
      await screen.findByText(
        "You cannot access this ticket",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("TKT-2026-000042"),
    ).not.toBeInTheDocument();
  });

  it("shows a not-found error", async () => {
    vi.mocked(fetchTicket).mockRejectedValue(
      new Error("Ticket not found"),
    );

    render(<RequesterTicketDetail ticketId={999} />);

    await waitFor(() =>
      expect(
        screen.getByText("Ticket not found"),
      ).toBeInTheDocument(),
    );
  });

  it("requires a valid reason before confirming soft removal", async () => {
    render(<RequesterTicketDetail ticketId={42} />);

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove",
      }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "Remove attachment",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Remove Attachment",
      }),
    ).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText("Reason for removal"),
      {
        target: {
          value: "Uploaded the wrong file",
        },
      },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove Attachment",
      }),
    );

    await waitFor(() =>
      expect(removeAttachment).toHaveBeenCalledWith(
        7,
        "Uploaded the wrong file",
        requester.id,
      ),
    );

    expect(
      await screen.findByText(
        /Uploaded the wrong file/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Preview report.pdf",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Download report.pdf",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Remove",
      }),
    ).not.toBeInTheDocument();
  });

  it("focuses the removal reason when the dialog opens", async () => {
    render(<RequesterTicketDetail ticketId={42} />);

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByLabelText("Reason for removal")).toHaveFocus();
  });

  it("traps Tab and Shift+Tab inside the removal dialog", async () => {
    render(<RequesterTicketDetail ticketId={42} />);

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    const reason = screen.getByLabelText("Reason for removal");
    const confirm = screen.getByRole("button", {
      name: "Remove Attachment",
    });

    fireEvent.change(reason, {
      target: { value: "Uploaded the wrong file" },
    });
    expect(confirm).toBeEnabled();

    fireEvent.keyDown(reason, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();

    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(reason).toHaveFocus();
  });

  it("closes the removal dialog with Escape and restores trigger focus", async () => {
    render(<RequesterTicketDetail ticketId={42} />);

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    const removeButton = screen.getByRole("button", { name: "Remove" });
    fireEvent.click(removeButton);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(removeButton).toHaveFocus();
    expect(removeAttachment).not.toHaveBeenCalled();
  });

  it("rejects an attachment larger than 5 MB before uploading", async () => {
    const { container } = render(
      <RequesterTicketDetail ticketId={42} />,
    );

    await screen.findByRole("heading", {
      name: "Ticket Details",
    });

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    expect(input).toBeTruthy();

    const oversizedFile = new File(
      ["x"],
      "large.png",
      {
        type: "image/png",
      },
    );

    Object.defineProperty(oversizedFile, "size", {
      value: 5 * 1024 * 1024 + 1,
    });

    fireEvent.change(input, {
      target: {
        files: [oversizedFile],
      },
    });

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "large.png exceeds the 5 MB attachment size limit.",
    );

    expect(uploadAttachment).not.toHaveBeenCalled();
  });
});
