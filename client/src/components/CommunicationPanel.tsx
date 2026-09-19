import { useState } from "react";
import { addInternalNote, addTicketComment, type InternalNote, type TicketComment } from "../api";

const MAX_BODY_CODE_POINTS = 2000;

function Entries({ entries }: { entries: Array<TicketComment | InternalNote> }) {
  return <ul className="ticket-detail__communications">{entries.map((entry) => <li key={entry.id}><strong>{entry.author.name}</strong><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time><p>{entry.body}</p></li>)}</ul>;
}

export function PublicComments({ ticketId, initial }: { ticketId: number; initial: TicketComment[] }) {
  const [entries, setEntries] = useState(initial); const [body, setBody] = useState(""); const [error, setError] = useState("");
  async function submit() { if ([...body].length > MAX_BODY_CODE_POINTS) { setError("Comment must be 2,000 characters or fewer."); return; } try { const entry = await addTicketComment(ticketId, body); setEntries((current) => [...current, entry]); setBody(""); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add comment"); } }
  return <section className="ticket-detail__panel" aria-labelledby="comments-heading"><h2 id="comments-heading">Public Comments</h2><Entries entries={entries} /><div className="ticket-detail__composer"><label className="ticket-detail__composer-label" htmlFor={`comment-${ticketId}`}>Add a comment</label><textarea className="ticket-detail__composer-input" id={`comment-${ticketId}`} value={body} onChange={(event) => setBody(event.target.value)} /><p className="ticket-detail__composer-counter" aria-live="polite">{[...body].length} / {MAX_BODY_CODE_POINTS}</p><div className="ticket-detail__composer-actions"><button type="button" className="btn zg-button zg-button--secondary" onClick={() => void submit()} disabled={!body.trim()}>Add comment</button></div>{error ? <p role="alert" className="text-danger">{error}</p> : null}</div></section>;
}

export function InternalNotes({ ticketId, initial }: { ticketId: number; initial: InternalNote[] }) {
  const [entries, setEntries] = useState(initial); const [body, setBody] = useState(""); const [error, setError] = useState("");
  async function submit() { if ([...body].length > MAX_BODY_CODE_POINTS) { setError("Internal note must be 2,000 characters or fewer."); return; } try { const entry = await addInternalNote(ticketId, body); setEntries((current) => [...current, entry]); setBody(""); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add internal note"); } }
  return <section className="ticket-detail__panel" aria-labelledby="notes-heading"><h2 id="notes-heading">Internal Notes</h2><Entries entries={entries} /><div className="ticket-detail__composer"><label className="ticket-detail__composer-label" htmlFor={`note-${ticketId}`}>Add an internal note</label><textarea className="ticket-detail__composer-input" id={`note-${ticketId}`} value={body} onChange={(event) => setBody(event.target.value)} /><p className="ticket-detail__composer-counter" aria-live="polite">{[...body].length} / {MAX_BODY_CODE_POINTS}</p><div className="ticket-detail__composer-actions"><button type="button" className="btn zg-button zg-button--secondary" onClick={() => void submit()} disabled={!body.trim()}>Add note</button></div>{error ? <p role="alert" className="text-danger">{error}</p> : null}</div></section>;
}
