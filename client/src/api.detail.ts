const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface TicketDetailAttachment {
  id: number;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removedReason: string | null;
}

export interface TicketDetail {
  id: number;
  ticketNumber: string;
  requester: { id: number; name: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: string;
  createdAt: string;
  attachments: TicketDetailAttachment[];
}

export async function fetchTicket(
  ticketId: number,
  requesterId: number,
): Promise<TicketDetail> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("You cannot access this ticket");
    }

    if (response.status === 404) {
      throw new Error("Ticket not found");
    }

    throw new Error("Unable to load ticket");
  }

  return response.json() as Promise<TicketDetail>;
}
