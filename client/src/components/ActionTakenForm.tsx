import { useRef, useState } from "react";
import type { ActionStatus, ActionTaken, ActionUserSummary, CreateActionTakenInput, UpdateActionTakenInput } from "../api";

const MAX = 2000;
type Submit = CreateActionTakenInput | UpdateActionTakenInput;
type Props = { mode: "create" | "edit"; action?: ActionTaken; ticketVersion: number; assignees: ActionUserSummary[]; submitting: boolean; readOnly?: boolean; reviewMessage?: string; onSubmit: (data: Submit) => void; onClose: () => void; };
const key = () => globalThis.crypto?.randomUUID?.() ?? `action-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function ActionTakenForm({ mode, action, ticketVersion, assignees, submitting, readOnly = false, reviewMessage, onSubmit, onClose }: Props) {
  const [description, setDescription] = useState(action?.actionDescription ?? "");
  const [result, setResult] = useState(action?.result ?? "");
  const [assignedToUserId, setAssignedToUserId] = useState(action?.assignedTo?.id ? String(action.assignedTo.id) : "");
  const [followUpRequired, setFollowUpRequired] = useState(action?.followUpRequired ?? false);
  const [followUpNote, setFollowUpNote] = useState(action?.followUpNote ?? "");
  const [attachmentNotes, setAttachmentNotes] = useState(action?.attachmentNotes ?? "");
  const [createStatus, setCreateStatus] = useState<"DRAFT" | "COMPLETED">("DRAFT");
  const [editStatus, setEditStatus] = useState<ActionStatus>("DRAFT");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const requestKey = useRef(key()); const descriptionRef = useRef<HTMLTextAreaElement | null>(null); const resultRef = useRef<HTMLTextAreaElement | null>(null); const followUpNoteRef = useRef<HTMLTextAreaElement | null>(null); const attachmentNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const validate = (status: ActionStatus) => {
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Action Description is required.";
    if (description.length > MAX) next.description = "Action Description must be 2,000 characters or fewer.";
    if (result.length > MAX) next.result = "Result must be 2,000 characters or fewer.";
    if (attachmentNotes.length > MAX) next.attachmentNotes = "Attachment Notes must be 2,000 characters or fewer.";
    if (followUpNote.length > MAX) next.followUpNote = "Follow-up Note must be 2,000 characters or fewer.";
    if ((status === "COMPLETED" || status === "CANCELLED") && !result.trim()) next.result = status === "CANCELLED" ? "Cancellation explanation is required." : "Result is required when completing an Action.";
    if (followUpRequired && !followUpNote.trim()) next.followUpNote = "Follow-up Note is required when follow-up is required.";
    setErrors(next);
    (["description", "result", "followUpNote", "attachmentNotes"] as const).some((field) => {
      if (!next[field]) return false;
      ({ description: descriptionRef, result: resultRef, followUpNote: followUpNoteRef, attachmentNotes: attachmentNotesRef }[field]).current?.focus();
      return true;
    });
    return Object.keys(next).length === 0;
  };
  const submit = (status: ActionStatus) => {
    if (!validate(status)) return;
    const common = { actionDescription: description, result: result.trim() || null, assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null, followUpRequired: status === "CANCELLED" ? false : followUpRequired, followUpNote: status === "CANCELLED" || !followUpRequired ? null : followUpNote.trim() || null, attachmentNotes: attachmentNotes.trim() || null, status, expectedTicketVersion: ticketVersion };
    onSubmit(mode === "create" ? { ...common, status: status as "DRAFT" | "COMPLETED", requestKey: requestKey.current } : { ...common, expectedVersion: action!.version });
  };
  const counter = (name: string, value: string) => <span id={`${name}-count`} className="actions-taken__counter">{value.length} / {MAX}</span>;
  const disabled = submitting || readOnly;
  return <form className="actions-taken__form" onSubmit={(event) => { event.preventDefault(); if (!readOnly) submit(mode === "create" ? createStatus : editStatus); }}>
    <h3>{mode === "create" ? "Add Action" : `Edit Action ${action!.id}`}</h3>
    <p className="actions-taken__shared-hint">Actions Taken are visible to the Requester. Use Internal Notes for private information.</p>
    {reviewMessage ? <p className="actions-taken__notice" role="status">{reviewMessage}</p> : null}
    <p><strong>Action Date/Time:</strong> {mode === "create" ? "Recorded when saved" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(action!.actionDateTime))}</p>
    <p><strong>Performed By:</strong> {action?.performedBy?.name ?? "Not performed"}</p>
    <label htmlFor="action-description">Action Description *</label><textarea ref={descriptionRef} id="action-description" aria-invalid={Boolean(errors.description)} aria-describedby="action-description-count action-description-error" value={description} onChange={(e) => setDescription(e.target.value)} readOnly={readOnly} disabled={submitting} />{counter("action-description", description)}{errors.description && <p id="action-description-error" role="alert">{errors.description}</p>}
    <label htmlFor="action-result">Result{(mode === "create" ? createStatus : "") === "COMPLETED" ? " *" : ""}</label><textarea ref={resultRef} id="action-result" aria-invalid={Boolean(errors.result)} aria-describedby="action-result-count action-result-error" value={result} onChange={(e) => setResult(e.target.value)} readOnly={readOnly} disabled={submitting} />{counter("action-result", result)}{errors.result && <p id="action-result-error" role="alert">{errors.result}</p>}
    <label htmlFor="action-assignee">Action Assignee</label><select id="action-assignee" value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value)} disabled={disabled}><option value="">Unassigned</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select>
    {mode === "create" && <><label htmlFor="action-state">State</label><select id="action-state" value={createStatus} onChange={(e) => setCreateStatus(e.target.value as "DRAFT" | "COMPLETED")} disabled={disabled}><option value="DRAFT">DRAFT</option><option value="COMPLETED">COMPLETED</option></select></>}
    <label><input type="checkbox" checked={followUpRequired} onChange={(e) => setFollowUpRequired(e.target.checked)} disabled={disabled} /> Follow-Up Required</label>
    <label htmlFor="action-follow-up-note">Follow-up Note{followUpRequired ? " *" : ""}</label><textarea ref={followUpNoteRef} id="action-follow-up-note" aria-invalid={Boolean(errors.followUpNote)} aria-describedby="action-follow-up-note-count action-follow-up-note-error" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} readOnly={readOnly} disabled={!followUpRequired || submitting} />{counter("action-follow-up-note", followUpNote)}{errors.followUpNote && <p id="action-follow-up-note-error" role="alert">{errors.followUpNote}</p>}
    <label htmlFor="action-attachment-notes">Attachment Notes</label><textarea ref={attachmentNotesRef} id="action-attachment-notes" aria-invalid={Boolean(errors.attachmentNotes)} aria-describedby="action-attachment-notes-count action-attachment-notes-error" value={attachmentNotes} onChange={(e) => setAttachmentNotes(e.target.value)} readOnly={readOnly} disabled={submitting} />{counter("action-attachment-notes", attachmentNotes)}{errors.attachmentNotes && <p id="action-attachment-notes-error" role="alert">{errors.attachmentNotes}</p>}
    <div className="actions-taken__form-actions">{readOnly ? null : <><button type="submit" className="btn zg-button zg-button--primary" disabled={submitting}>{submitting ? "Saving…" : mode === "create" ? createStatus === "COMPLETED" ? "Save Completed Action" : "Save Draft" : editStatus === "COMPLETED" ? "Save Completed Action" : editStatus === "CANCELLED" ? "Save Cancelled Action" : "Save Draft"}</button>{mode === "create" ? null : <><button type="button" className="btn zg-button zg-button--primary" disabled={submitting} onClick={() => { setEditStatus("COMPLETED"); submit("COMPLETED"); }}>Complete Action</button><button type="button" className="btn zg-button zg-button--secondary" disabled={submitting} onClick={() => { setEditStatus("CANCELLED"); submit("CANCELLED"); }}>Cancel Action</button></>}</>}<button type="button" className="btn zg-button zg-button--secondary" disabled={submitting} onClick={onClose}>{readOnly ? "Close review" : mode === "create" ? "Cancel" : "Cancel edit"}</button></div>
  </form>;
}
