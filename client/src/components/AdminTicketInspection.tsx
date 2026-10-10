import { useCallback, useEffect, useState } from "react";
import { fetchAdminInternalNotes, fetchAdminTicketInspection, fetchUsers, updateAdminTicketPriority, type ActionUserSummary, type AdminTicketInspection as Ticket, type InternalNote } from "../api";
import ErrorState from "./ErrorState";
import ActionsTakenPanel from "./ActionsTakenPanel";
import "../styles/admin-ticket-inspection.css";

function formatDate(value: string) { return new Date(value).toLocaleString(); }

export default function AdminTicketInspection({ ticketId }: { ticketId: number }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [actionAssignees, setActionAssignees] = useState<ActionUserSummary[]>([]);
  const refreshTicket = useCallback(() => { fetchAdminTicketInspection(ticketId).then((value) => { setTicket(value); setPriority(value.itPriority); }).catch((e: Error) => setError(e.message)); }, [ticketId]);
  useEffect(() => { refreshTicket(); fetchAdminInternalNotes(ticketId).then(setNotes).catch((e: Error) => setError(e.message)); fetchUsers().then((users: Array<ActionUserSummary & { isActive?: boolean }>) => setActionAssignees(users.filter((user) => user.isActive !== false && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR")))).catch(() => setActionAssignees([])); }, [ticketId, refreshTicket]);
  if (error) return <ErrorState title="Unable to load Ticket" message={error} />;
  if (!ticket) return <p className="admin-inspection__loading" role="status">Loading Ticket inspection…</p>;
  const savePriority = async () => { setSaving(true); setError(""); try { const updated = await updateAdminTicketPriority(ticketId, priority as never); setTicket({ ...ticket, itPriority: updated.itPriority }); } catch (e) { setError((e as Error).message); } finally { setSaving(false); } };
  return <main className="admin-inspection">
    <header className="admin-inspection__header"><p className="admin-inspection__eyebrow">Administrator Ticket Inspection</p><h1>Ticket Inspection</h1><p className="admin-inspection__intro">Ticket details are read-only. Administrators can update IT Priority and manage Actions Taken.</p></header>
    <section className="admin-inspection__card" aria-labelledby="ticket-information"><h2 id="ticket-information">Ticket information</h2><dl className="admin-inspection__details">
      <div><dt>Ticket Number</dt><dd>{ticket.ticketNumber}</dd></div><div><dt>Summary</dt><dd>{ticket.summary}</dd></div><div className="admin-inspection__detail--wide"><dt>Description</dt><dd>{ticket.description}</dd></div><div><dt>Requester</dt><dd>{ticket.requester.name}</dd></div><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div><div><dt>Requested Priority</dt><dd><span className="admin-inspection__badge">{ticket.requestedPriority}</span></dd></div><div><dt>Current Status</dt><dd><span className="admin-inspection__badge">{ticket.currentStatus}</span></dd></div><div><dt>Owner</dt><dd>{ticket.assignedTo?.name ?? "Unassigned"}</dd></div>
    </dl></section>
    <section className="admin-inspection__card admin-inspection__priority"><div><h2>IT Priority</h2><p>This is the only Ticket field editable by an Administrator in this inspection.</p></div><div className="admin-inspection__priority-controls"><label htmlFor="admin-it-priority">IT Priority</label><select id="admin-it-priority" value={priority} disabled={saving} onChange={(e) => setPriority(e.target.value)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select><button type="button" className="btn zg-button zg-button--primary" disabled={saving} onClick={() => void savePriority()}>{saving ? "Saving…" : "Save IT Priority"}</button></div>{error && <p className="admin-inspection__inline-error" role="alert">{error}</p>}</section>
    <section className="admin-inspection__card" aria-labelledby="public-comments"><h2 id="public-comments">Public Comments</h2>{ticket.publicComments?.length ? ticket.publicComments.map((comment) => <article className="admin-inspection__message" key={comment.id}><p>{comment.body}</p><small>{comment.author.name} · {formatDate(comment.createdAt)}</small></article>) : <p className="admin-inspection__empty">No public comments.</p>}</section>
    <section className="admin-inspection__card admin-inspection__notes" aria-labelledby="internal-notes"><h2 id="internal-notes">Internal Notes</h2><p className="admin-inspection__readonly">Internal communications · read-only</p>{notes.length ? notes.map((note) => <article className="admin-inspection__message" key={note.id}><p>{note.body}</p><small>{note.author.name} · {formatDate(note.createdAt)}</small></article>) : <p className="admin-inspection__empty">No internal notes.</p>}</section>
    <ActionsTakenPanel ticketId={ticket.id} role="ADMINISTRATOR" ticketStatus={ticket.currentStatus} assignees={actionAssignees} onTicketRefreshRequested={refreshTicket} />
  </main>;
}
