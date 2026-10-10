import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createActionTaken, fetchActionsTaken, updateActionTaken, type ActionTaken } from "../../src/api";
import ActionsTakenPanel from "../../src/components/ActionsTakenPanel";

vi.mock("../../src/api", async () => ({
  ...(await vi.importActual<typeof import("../../src/api")>("../../src/api")),
  createActionTaken: vi.fn(),
  fetchActionsTaken: vi.fn(),
  updateActionTaken: vi.fn(),
}));

const people = {
  requester: { id: 1, name: "Rina Requester", role: "REQUESTER" as const },
  staff: { id: 2, name: "Sam Staff", role: "IT_STAFF" as const },
  admin: { id: 3, name: "Ari Admin", role: "ADMINISTRATOR" as const },
};

function action(id: number, status: ActionTaken["status"], overrides: Partial<ActionTaken> = {}): ActionTaken {
  return {
    id,
    ticketId: 11,
    actionDateTime: `2026-10-0${id}T03:04:05.000Z`,
    actionDescription: `Action description ${id}`,
    result: status === "DRAFT" ? null : `Result ${id}`,
    status,
    createdBy: people.staff,
    performedBy: status === "COMPLETED" ? people.staff : null,
    assignedTo: people.admin,
    followUpRequired: status === "COMPLETED",
    followUpNote: status === "COMPLETED" ? "Confirm access" : null,
    attachmentNotes: `Attachment note ${id}`,
    completedAt: status === "COMPLETED" ? "2026-10-01T04:00:00.000Z" : null,
    createdAt: "2026-10-01T03:00:00.000Z",
    updatedAt: "2026-10-01T03:30:00.000Z",
    version: 1,
    ...overrides,
  };
}

function response(items: ActionTaken[], page = 1, totalPages = 1) {
  return { items, page, pageSize: 20, totalItems: items.length, totalPages, ticketVersion: 4 };
}

describe("ActionsTakenPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows an independently loading Actions Taken section", () => {
    vi.mocked(fetchActionsTaken).mockReturnValue(new Promise(() => {}));
    render(<ActionsTakenPanel ticketId={11} role="REQUESTER" />);
    expect(screen.getByText("Loading Actions Taken…")).toBeInTheDocument();
    expect(fetchActionsTaken).toHaveBeenCalledWith(11, 1);
  });

  it("shows the empty state when the Ticket has no Actions", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValue(response([]));
    render(<ActionsTakenPanel ticketId={11} role="REQUESTER" />);
    expect(await screen.findByText("No Actions yet")).toBeInTheDocument();
    expect(screen.getByText("No Actions Taken have been recorded for this Ticket.")).toBeInTheDocument();
  });

  it("renders public DTO fields, terminal states, and accessible expanded details", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValue(response([
      action(1, "DRAFT"), action(2, "COMPLETED"), action(3, "CANCELLED"),
    ]));
    render(<ActionsTakenPanel ticketId={11} role="REQUESTER" />);

    expect(await screen.findByRole("table", { name: "Actions Taken for this Ticket" })).toBeInTheDocument();
    expect(screen.getAllByText("Action description 1")).toHaveLength(2);
    expect(screen.getAllByText("Not performed")).toHaveLength(4);
    expect(screen.getAllByText("Read-only")).toHaveLength(2);
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add|edit|complete|cancel|delete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "View Action 2" })[0]);
    expect(screen.getByRole("article", { name: "Action 2 details" })).toBeInTheDocument();
    expect(screen.getByText("Action Creator")).toBeInTheDocument();
    expect(screen.getByText("Action Assignee")).toBeInTheDocument();
    expect(screen.getAllByText("Required: Confirm access")).toHaveLength(2);
    expect(screen.getByText("Attachment note 2")).toBeInTheDocument();
    expect(screen.queryByText("requestKey")).not.toBeInTheDocument();
  });

  it("shows operational controls to Staff and Administrators on active Tickets", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValue(response([action(1, "COMPLETED")]));
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" />);
    expect(await screen.findByText("Actions Taken are shared with the Requester.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Action" })).toBeInTheDocument();

    rerender(<ActionsTakenPanel ticketId={11} role="ADMINISTRATOR" />);
    expect(screen.getByText("Actions Taken are shared with the Requester.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Action" })).toBeInTheDocument();
  });

  it("uses accessible pagination and fetches the next chronological page", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT")], 1, 2))
      .mockResolvedValueOnce(response([action(2, "COMPLETED")], 2, 2));
    render(<ActionsTakenPanel ticketId={11} role="REQUESTER" />);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(fetchActionsTaken).toHaveBeenLastCalledWith(11, 2));
    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("shows a safe error and retries the GET request", async () => {
    vi.mocked(fetchActionsTaken).mockRejectedValueOnce(new Error("Unable to load Actions Taken"))
      .mockResolvedValueOnce(response([action(1, "DRAFT")]));
    render(<ActionsTakenPanel ticketId={11} role="REQUESTER" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load Actions Taken");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchActionsTaken).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText("Action description 1")).length).toBe(2);
  });

  it("keeps inactive Tickets read-only and preserves a stale create draft for review", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValue(response([action(1, "DRAFT")]));
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="CLOSED" />);
    expect((await screen.findAllByText("Reopen the Ticket before changing Actions.")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    fireEvent.click(await screen.findByRole("button", { name: "Add Action" }));
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Retry draft" } });
    vi.mocked(createActionTaken).mockRejectedValueOnce(new ApiError(409, "STALE_UPDATE", "Stale"));
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByText("This Ticket or Action changed. Review the latest details before saving again.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Retry draft")).toBeInTheDocument();
  });

  it("preserves a create draft and requestKey, then unlocks it after reopen", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT")]))
      .mockResolvedValueOnce({ ...response([action(1, "DRAFT")]), ticketVersion: 5 });
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    expect(await screen.findByRole("button", { name: "Add Action" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Action" }));
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Blocked create" } });
    vi.mocked(createActionTaken).mockRejectedValueOnce(new ApiError(409, "TICKET_NOT_ACTIVE", "Ticket is not active.")).mockResolvedValueOnce({ action: action(2, "DRAFT"), ticketVersion: 6 });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect((await screen.findAllByText("Reopen the Ticket before changing Actions.")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Add Action" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Action 1" })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Blocked create")).toHaveAttribute("readonly");
    const requestKey = vi.mocked(createActionTaken).mock.calls[0][1].requestKey;
    expect(requestKey).toEqual(expect.any(String));
    expect(vi.mocked(fetchActionsTaken).mock.calls.length).toBeGreaterThan(1);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="CLOSED" />);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    expect(screen.getByDisplayValue("Blocked create")).not.toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(vi.mocked(createActionTaken)).toHaveBeenLastCalledWith(11, expect.objectContaining({ expectedTicketVersion: 5, requestKey })));
  });

  it("preserves an edit draft and unlocks it with refreshed versions after reopen", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT", { version: 1 })]))
      .mockResolvedValueOnce({ ...response([action(1, "DRAFT", { version: 2 })]), ticketVersion: 5 });
    vi.mocked(updateActionTaken).mockRejectedValueOnce(new ApiError(409, "TICKET_NOT_ACTIVE", "Ticket is not active.")).mockResolvedValueOnce({ action: action(1, "DRAFT", { version: 3 }), ticketVersion: 6 });
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit Action 1" }))[0]);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Blocked edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByText("This Ticket is not active. Review or copy your unsaved changes after reopening the Ticket.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Blocked edit")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
    expect(vi.mocked(updateActionTaken)).toHaveBeenCalledTimes(1);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="CLOSED" />);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    expect(screen.getByDisplayValue("Blocked edit")).not.toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(vi.mocked(updateActionTaken)).toHaveBeenLastCalledWith(11, 1, expect.objectContaining({ expectedTicketVersion: 5, expectedVersion: 2, actionDescription: "Blocked edit" })));
  });

  it("keeps immutable-conflict edits reviewable while showing the terminal server state", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT")]))
      .mockResolvedValueOnce(response([action(1, "COMPLETED")])) ;
    vi.mocked(updateActionTaken).mockRejectedValueOnce(new ApiError(409, "ACTION_IMMUTABLE", "Immutable"));
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit Action 1" }))[0]);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Unsaved correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByText("This Action is read-only. Review or copy your unsaved changes, then create a new Action for corrections or additional work.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Unsaved correction")).toHaveAttribute("readonly");
    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="CLOSED" />);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    expect(screen.getByDisplayValue("Unsaved correction")).toHaveAttribute("readonly");
  });

  it("keeps a stale Draft editable with refreshed versions for a deliberate retry", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT", { version: 1 })]))
      .mockResolvedValueOnce({ ...response([action(1, "DRAFT", { version: 2 })]), ticketVersion: 5 });
    vi.mocked(updateActionTaken).mockRejectedValueOnce(new ApiError(409, "STALE_UPDATE", "Stale"));
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit Action 1" }))[0]);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Retry this edit" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Completed locally" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete Action" }));
    await screen.findByText("This Ticket or Action changed. Review the latest details before saving again.");
    await waitFor(() => expect(fetchActionsTaken).toHaveBeenCalledTimes(2));
    expect(screen.getByDisplayValue("Retry this edit")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save Completed Action" }));
    await waitFor(() => expect(vi.mocked(updateActionTaken)).toHaveBeenLastCalledWith(11, 1, expect.objectContaining({ expectedTicketVersion: 5, expectedVersion: 2, actionDescription: "Retry this edit", status: "COMPLETED" })));
  });

  it("switches stale terminal edits into review-only mode without losing local input", async () => {
    vi.mocked(fetchActionsTaken).mockResolvedValueOnce(response([action(1, "DRAFT")]))
      .mockResolvedValueOnce({ ...response([action(1, "CANCELLED")]), ticketVersion: 5 });
    vi.mocked(updateActionTaken).mockRejectedValueOnce(new ApiError(409, "STALE_UPDATE", "Stale"));
    const { rerender } = render(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit Action 1" }))[0]);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Unsaved stale edit" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByText("This Action is now terminal and read-only. Review or copy your unsaved changes, then create a new Action for corrections or additional work.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Unsaved stale edit")).toHaveAttribute("readonly");
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Draft" })).not.toBeInTheDocument();
    expect(vi.mocked(updateActionTaken)).toHaveBeenCalledTimes(1);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="CLOSED" />);
    rerender(<ActionsTakenPanel ticketId={11} role="IT_STAFF" ticketStatus="OPEN" />);
    expect(screen.getByDisplayValue("Unsaved stale edit")).toHaveAttribute("readonly");
  });
});
