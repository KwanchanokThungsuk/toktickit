import { useEffect, useState } from "react";
import ErrorState from "./ErrorState";
import Loading from "./Loading";
import { claimStaffTicket, fetchStaffTicketDetail, updateStaffTicketOwner, updateStaffTicketPriority, updateStaffTicketStatus, type StaffTicketDetail as StaffTicketDetailData, type StaffTicketStatus } from "../api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function StaffTicketDetail({ ticketId }: { ticketId: number }) {
  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [error, setError] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StaffTicketStatus | "">("");

  useEffect(() => {
    let active = true;
    setTicket(null); setError("");
    fetchStaffTicketDetail(ticketId).then((value) => {
      if (active) { setTicket(value); setSelectedOwner(value.assignedTo ? String(value.assignedTo.id) : ""); setSelectedPriority(value.itPriority); setSelectedStatus(value.currentStatus); }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load ticket details"); });
    return () => { active = false; };
  }, [ticketId]);

  if (error) return <ErrorState title="Unable to load ticket" message={error} action={<a className="btn zg-button zg-button--secondary" href="#/staff/tickets">Back to Ticket Queue</a>} />;
  if (!ticket) return <Loading message="Loading ticket details..." />;

  async function saveOwner(ownerId: number | null) {
    setSaving(true);
    try { const owner = await updateStaffTicketOwner(ticketId, ownerId); setTicket((current) => current ? { ...current, assignedTo: owner } : current); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update ticket owner"); }
    finally { setSaving(false); }
  }
  async function claim() {
    setSaving(true);
    try { const owner = await claimStaffTicket(ticketId); setTicket((current) => current ? { ...current, assignedTo: owner } : current); setSelectedOwner(owner?.id ? String(owner.id) : ""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to claim ticket"); }
    finally { setSaving(false); }
  }

  async function savePriority() {
    if (!selectedPriority) return;
    setSaving(true);
    try { const updated = await updateStaffTicketPriority(ticketId, selectedPriority as "LOW" | "MEDIUM" | "HIGH"); setTicket((current) => current ? { ...current, itPriority: updated.itPriority } : current); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update IT Priority"); }
    finally { setSaving(false); }
  }

  async function saveStatus() {
    if (!ticket || !selectedStatus || selectedStatus === ticket.currentStatus) return;
    if (["RESOLVED", "CLOSED", "CANCELLED"].includes(selectedStatus) && !window.confirm(`Confirm transition to ${selectedStatus}?`)) return;
    setSaving(true);
    try { const updated = await updateStaffTicketStatus(ticketId, selectedStatus); setTicket((current) => current ? { ...current, currentStatus: updated.currentStatus } : current); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update Ticket status"); }
    finally { setSaving(false); }
  }

  const allowedTransitions: Record<string, StaffTicketStatus[]> = { NEW: ["OPEN", "CANCELLED"], OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"], IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"], WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"], RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"], CANCELLED: ["REOPENED"] };

  return <div className="ticket-detail">
    <div className="ticket-detail__breadcrumb"><a href="#/staff/tickets">Ticket Queue</a><span aria-hidden="true">&gt;</span><span>Ticket Details</span></div>
    <header className="ticket-detail__header"><div><h1>Ticket Details</h1><p>{ticket.ticketNumber}</p></div><div className="d-flex align-items-center gap-3"><span className="badge bg-secondary">{ticket.currentStatus}</span><a className="btn zg-button zg-button--secondary" href="#/staff/tickets">Back to Queue</a></div></header>
    <section className="ticket-detail__panel" aria-labelledby="overview-heading"><h2 id="overview-heading">Ticket Overview</h2><div className="ticket-detail__grid"><div className="ticket-detail__wide"><dt>Summary</dt><dd>{ticket.summary}</dd></div><div className="ticket-detail__wide"><dt>Description</dt><dd className="ticket-detail__description">{ticket.description}</dd></div><div><dt>Created Date</dt><dd>{formatDate(ticket.createdAt)}</dd></div><div><dt>Last Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd></div><div><dt>Requester</dt><dd>{ticket.requester.name}<br /><span className="ticket-detail__muted">{ticket.requester.email}</span></dd></div><div><dt>Category</dt><dd>{ticket.category.name}</dd></div><div><dt>Related system</dt><dd>{ticket.relatedSystem.name}</dd></div><div><dt>Requested priority</dt><dd>{ticket.requestedPriority}</dd></div><div><dt>IT priority</dt><dd>{ticket.itPriority}</dd></div><div><dt>Status</dt><dd>{ticket.currentStatus}</dd></div></div></section>
    <section className="ticket-detail__panel" aria-labelledby="ownership-heading"><h2 id="ownership-heading">Ownership</h2><div className="ticket-detail__grid"><div><dt>Current owner</dt><dd>{ticket.assignedTo ? ticket.assignedTo.name : "Unassigned"}</dd></div><div><dt>Assignment</dt><dd className="d-flex flex-wrap gap-2 align-items-center">{!ticket.assignedTo ? <button className="btn zg-button zg-button--primary" disabled={saving} onClick={() => void claim()}>Claim ticket</button> : null}<select aria-label="Ticket owner" value={selectedOwner} onChange={(event) => setSelectedOwner(event.target.value)}><option value="">Unassigned</option>{ticket.eligibleOwners.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name} ({candidate.role})</option>)}</select><button className="btn zg-button zg-button--secondary" disabled={saving} onClick={() => void saveOwner(selectedOwner ? Number(selectedOwner) : null)}>Save owner</button></dd></div></div></section>
    <section className="ticket-detail__panel" aria-labelledby="workflow-heading"><h2 id="workflow-heading">Workflow</h2><div className="ticket-detail__grid"><div className="ticket-detail__workflow-control"><dt>IT Priority</dt><dd><select aria-label="IT Priority" value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value)}><option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option></select><span className="ticket-detail__workflow-actions"><button className="btn zg-button zg-button--secondary" disabled={saving || selectedPriority === ticket.itPriority} onClick={() => void savePriority()}>Save priority</button></span></dd></div><div className="ticket-detail__workflow-control"><dt>Status</dt><dd><select aria-label="Ticket status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as StaffTicketStatus)}><option value={ticket.currentStatus}>{ticket.currentStatus}</option>{(allowedTransitions[ticket.currentStatus] ?? []).map((status) => <option key={status} value={status}>{status}</option>)}</select><span className="ticket-detail__workflow-actions"><button className="btn zg-button zg-button--secondary" disabled={saving || !selectedStatus || selectedStatus === ticket.currentStatus} onClick={() => void saveStatus()}>Save status</button></span></dd></div></div></section>
    <section className="ticket-detail__panel" aria-labelledby="attachments-heading"><h2 id="attachments-heading">Attachments ({ticket.attachments.length})</h2>{ticket.attachments.length ? <ul className="ticket-detail__attachments">{ticket.attachments.map((attachment) => <li key={attachment.id} className={attachment.isRemoved ? "is-removed" : ""}><strong>{attachment.originalFilename}</strong><span>{attachment.contentType} · {attachment.fileSize} bytes{attachment.isRemoved ? " · removed" : ""}</span></li>)}</ul> : <p className="ticket-detail__muted">No attachments.</p>}</section>
    {ticket.requesterResolutionIndicatedAt ? <p className="alert alert-info">Requester indicated that the problem appears resolved on {new Date(ticket.requesterResolutionIndicatedAt).toLocaleString()}.</p> : null}
  </div>;
}
