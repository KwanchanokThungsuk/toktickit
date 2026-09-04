import { useEffect, useState } from "react";
import { useRequester } from "./RequesterContext";
import Badge from "./Badge";
import ErrorState from "./ErrorState";
import Loading from "./Loading";
import { fetchTicket } from "../api.detail.js";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function priorityVariant(priority) {
  if (priority === "HIGH") return "danger";
  if (priority === "MEDIUM") return "warning";
  return "neutral";
}

export default function RequesterTicketDetail({ ticketId }) {
  const { selectedRequester } = useRequester();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setTicket(null);
    setError("");
    setIsLoading(true);

    if (!selectedRequester) return undefined;

    fetchTicket(ticketId, selectedRequester.id)
      .then((data) => {
        if (active) setTicket(data);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load ticket");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [ticketId, selectedRequester]);

  if (isLoading) return <Loading message="Loading ticket details..." />;
  if (error) return <ErrorState title="Unable to load ticket" message={error} action={<a className="btn zg-button zg-button--secondary" href="#/tickets">Back to My Tickets</a>} />;
  if (!ticket) return null;

  return (
    <div className="ticket-detail">
      <div className="ticket-detail__breadcrumb"><a href="#/tickets">My Tickets</a><span aria-hidden="true">&gt;</span><span>Ticket Details</span></div>
      <header className="ticket-detail__header"><div><h1>Ticket Details</h1><p>{ticket.ticketNumber}</p></div><a className="btn zg-button zg-button--secondary" href="#/tickets">Back to My Tickets</a></header>
      <section className="ticket-detail__panel" aria-labelledby="ticket-information-heading">
        <h2 id="ticket-information-heading">Ticket Information</h2>
        <dl className="ticket-detail__grid">
          <div><dt>Ticket No.</dt><dd>{ticket.ticketNumber}</dd></div>
          <div><dt>Ticket Date</dt><dd>{formatDate(ticket.createdAt)}</dd></div>
          <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
          <div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div>
          <div><dt>Requester</dt><dd>{ticket.requester.name}</dd></div>
          <div><dt>Requested Priority</dt><dd><Badge variant={priorityVariant(ticket.requestedPriority)}>{ticket.requestedPriority}</Badge></dd></div>
          <div><dt>Current Status</dt><dd><Badge variant="success">{ticket.currentStatus}</Badge></dd></div>
          <div className="ticket-detail__wide"><dt>Summary</dt><dd>{ticket.summary}</dd></div>
          <div className="ticket-detail__wide"><dt>Description</dt><dd className="ticket-detail__description">{ticket.description}</dd></div>
        </dl>
      </section>
      <section className="ticket-detail__panel" aria-labelledby="attachments-heading">
        <h2 id="attachments-heading">Attachments ({ticket.attachments.length})</h2>
        {ticket.attachments.length === 0 ? <p className="ticket-detail__muted">No attachments have been added to this ticket.</p> : <ul className="ticket-detail__attachments">{ticket.attachments.map((attachment) => <li key={attachment.id} className={attachment.isRemoved ? "is-removed" : ""}><div><strong title={attachment.originalFilename}>{attachment.originalFilename}</strong><span>{formatFileSize(attachment.fileSize)} · {attachment.contentType} · {formatDate(attachment.uploadedAt)}</span>{attachment.isRemoved ? <span>Removed{attachment.removedAt ? ` on ${formatDate(attachment.removedAt)}` : ""}{attachment.removedReason ? `: ${attachment.removedReason}` : ""}</span> : null}</div>{attachment.isRemoved ? <Badge variant="neutral">Removed</Badge> : null}</li>)}</ul>}
      </section>
    </div>
  );
}