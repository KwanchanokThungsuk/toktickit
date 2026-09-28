import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addInternalNote, addTicketComment } from "../../src/api";
import { InternalNotes, PublicComments } from "../../src/components/CommunicationPanel";

vi.mock("../../src/api", async () => ({
  ...(await vi.importActual<typeof import("../../src/api")>("../../src/api")),
  addInternalNote: vi.fn(),
  addTicketComment: vi.fn(),
}));

const comment = { id: 1, ticketId: 7, body: "Existing comment", createdAt: "2026-01-01T00:00:00.000Z", author: { id: 2, name: "Staff", role: "IT_STAFF" } };

describe("CommunicationPanel validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts Public Comment input by Unicode code points and rejects over-limit drafts", async () => {
    vi.mocked(addTicketComment).mockResolvedValue(comment);
    render(<PublicComments ticketId={7} initial={[]} />);
    const input = screen.getByLabelText("Add a comment");
    const button = screen.getByRole("button", { name: "Add comment" });

    expect(screen.getByText("0 / 2000")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "😀".repeat(2) } });
    expect(screen.getByText("2 / 2000")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "😀".repeat(2000) } });
    expect(screen.getByText("2000 / 2000")).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(addTicketComment).toHaveBeenCalledWith(7, "😀".repeat(2000)));
    fireEvent.change(input, { target: { value: "😀".repeat(2001) } });
    expect(screen.getByText("2001 / 2000")).toBeInTheDocument();
    fireEvent.click(button);

    expect(await screen.findByText("Comment must be 2,000 characters or fewer.")).toBeInTheDocument();
    expect(addTicketComment).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("😀".repeat(2001));
  });

  it("preserves a Public Comment draft when the backend rejects it", async () => {
    vi.mocked(addTicketComment).mockRejectedValue(new Error("Body is invalid"));
    render(<PublicComments ticketId={7} initial={[]} />);
    const input = screen.getByLabelText("Add a comment");
    fireEvent.change(input, { target: { value: "Draft text" } });
    fireEvent.click(screen.getByRole("button", { name: "Add comment" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Body is invalid"));
    expect(input).toHaveValue("Draft text");
  });

  it("applies the same Unicode boundary and draft preservation to Internal Notes", async () => {
    vi.mocked(addInternalNote).mockResolvedValue(comment);
    render(<InternalNotes ticketId={7} initial={[]} />);
    const input = screen.getByLabelText("Add an internal note");
    fireEvent.change(input, { target: { value: "😀".repeat(2000) } });
    expect(screen.getByText("2000 / 2000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(addInternalNote).toHaveBeenCalledWith(7, "😀".repeat(2000)));
    fireEvent.change(input, { target: { value: "😀".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    expect(await screen.findByText("Internal note must be 2,000 characters or fewer.")).toBeInTheDocument();
    expect(addInternalNote).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("😀".repeat(2001));

    vi.mocked(addInternalNote).mockRejectedValue(new Error("Note rejected"));
    fireEvent.change(input, { target: { value: "Valid draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Note rejected"));
    expect(input).toHaveValue("Valid draft");
  });
});
