import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActionTakenForm from "../../src/components/ActionTakenForm";
import type { ActionTaken } from "../../src/api";

const action: ActionTaken = { id: 4, ticketId: 9, actionDateTime: "2026-10-10T01:00:00.000Z", actionDescription: "Draft action", result: null, status: "DRAFT", createdBy: { id: 1, name: "Staff", role: "IT_STAFF" }, performedBy: null, assignedTo: null, followUpRequired: false, followUpNote: null, attachmentNotes: null, completedAt: null, createdAt: "2026-10-10T01:00:00.000Z", updatedAt: "2026-10-10T01:00:00.000Z", version: 2 };
const assignees = [{ id: 2, name: "Admin", role: "ADMINISTRATOR" as const }];

describe("ActionTakenForm", () => {
  it("validates required Description, terminal Result, field limits, and follow-up dependencies", () => {
    render(<ActionTakenForm mode="create" ticketVersion={3} assignees={assignees} submitting={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Action Description is required");
    expect(screen.getByLabelText("Action Description *")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(screen.getByText("Action Description must be 2,000 characters or fewer.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Valid" } });
    fireEvent.change(screen.getByLabelText("State"), { target: { value: "COMPLETED" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Completed Action" }));
    expect(screen.getByText("Result is required when completing an Action.")).toBeInTheDocument();
    expect(screen.getByLabelText("Result *")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Result *"), { target: { value: "Completed" } });
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.click(screen.getByRole("button", { name: "Save Completed Action" }));
    expect(screen.getByText("Follow-up Note is required when follow-up is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Follow-up Note *")).toHaveFocus();
  });

  it("focuses Attachment Notes when its over-limit error is first", () => {
    render(<ActionTakenForm mode="create" ticketVersion={3} assignees={assignees} submitting={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "Valid" } });
    fireEvent.change(screen.getByLabelText("Attachment Notes"), { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(screen.getByLabelText("Attachment Notes")).toHaveFocus();
  });

  it("submits Draft creation with null follow-up and a stable requestKey", () => {
    const onSubmit = vi.fn(); const { rerender } = render(<ActionTakenForm mode="create" ticketVersion={3} assignees={assignees} submitting={false} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Action Description *"), { target: { value: "A".repeat(2000) } });
    fireEvent.change(screen.getByLabelText("Action Assignee"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ actionDescription: "A".repeat(2000), assignedToUserId: 2, followUpNote: null, requestKey: expect.any(String) }));
    const firstKey = onSubmit.mock.calls[0][0].requestKey;
    rerender(<ActionTakenForm mode="create" ticketVersion={3} assignees={assignees} submitting={false} onSubmit={onSubmit} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    expect(onSubmit.mock.calls[1][0].requestKey).toBe(firstKey);
  });

  it("preserves a local follow-up note when toggled off and back on", () => {
    render(<ActionTakenForm mode="create" ticketVersion={3} assignees={assignees} submitting={false} onSubmit={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    fireEvent.change(screen.getByLabelText("Follow-up Note *"), { target: { value: "Call requester" } });
    fireEvent.click(screen.getByLabelText("Follow-Up Required")); fireEvent.click(screen.getByLabelText("Follow-Up Required"));
    expect(screen.getByLabelText("Follow-up Note *")).toHaveValue("Call requester");
  });

  it("allows Draft edit assignment, completion, and cancellation explanation", () => {
    const onSubmit = vi.fn(); render(<ActionTakenForm mode="edit" action={action} ticketVersion={5} assignees={assignees} submitting={false} onSubmit={onSubmit} onClose={vi.fn()} />);
    expect(screen.getByText("Not performed")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Action Assignee"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Fixed" } });
    fireEvent.click(screen.getByRole("button", { name: "Complete Action" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: "COMPLETED", expectedTicketVersion: 5, expectedVersion: 2, assignedToUserId: 2 }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Action" }));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ status: "CANCELLED", followUpRequired: false, followUpNote: null }));
  });
});
