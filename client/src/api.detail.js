const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function fetchTicket(ticketId, requesterId) {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("You cannot access this ticket");
    if (response.status === 404) throw new Error("Ticket not found");
    throw new Error("Unable to load ticket");
  }

  return response.json();
}