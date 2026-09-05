const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export interface Requester {
  id: number;
  name: string;
  email: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Health check failed");
  }

  const catRes = await fetch(`${API_URL}/api/categories`);
  if (!catRes.ok) {
    throw new Error("Failed to fetch categories");
  }
  const categories: Category[] = await catRes.json();
  return { online: true, categories };
}

// Issue 8 — fetch requesters from the backend.
// Calls GET /api/requesters to get all active requesters for the Development Requester selector.
// Throwing on failure lets the UI show an error state.
export async function fetchRequesters(): Promise<Requester[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Failed to fetch requesters");
  }
  const requesters: Requester[] = await res.json();
  return requesters;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch related systems");
  }
  return res.json();
}

export interface CreateTicketPayload {
  categoryId: number;
  relatedSystemId: number;
  priority: string;
  summary: string;
  description: string;
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "NEW";
export type TicketSortBy = "ticketNumber" | "createdAt" | "updatedAt";
export type TicketSortOrder = "asc" | "desc";

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: Category;
  relatedSystem: RelatedSystem;
  requestedPriority: TicketPriority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketListResponse {
  data: TicketListItem[];
  meta: TicketListMeta;
}

export interface FetchTicketsOptions {
  requesterId: number;
  search?: string;
  categoryId?: string;
  relatedSystemId?: string;
  requestedPriority?: TicketPriority;
  currentStatus?: TicketStatus;
  sortBy: TicketSortBy;
  sortOrder: TicketSortOrder;
  page: number;
  pageSize: number;
}

export async function fetchTickets({ requesterId, ...options }: FetchTicketsOptions): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });

  const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!res.ok) throw new Error("Unable to load your tickets");
  return res.json();
}

export async function createTicket(payload: CreateTicketPayload, requesterId: number) {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": requesterId.toString(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create ticket");
  }
  return res.json();
}

// เพิ่มฟังก์ชันนี้เข้าไปใน client/src/api.ts
export interface AttachmentMetadata {
  id: number;
  ticketId: number;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removedById: number | null;
  removedReason: string | null;
}

function attachmentErrorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body && "error" in body) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string") return error.message;
  }
  return fallback;
}

export async function uploadAttachment(ticketId: number, file: File, requesterId: number): Promise<AttachmentMetadata> {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const formData = new FormData();
  formData.append("file", file); 

  const response = await fetch(`${apiUrl}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "X-Requester-Id": String(requesterId),
      // ห้ามใส่ Content-Type application/json เพราะใช้ FormData
    },
    body: formData,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Use the safe fallback below when the body is not JSON.
    }
    throw new Error(attachmentErrorMessage(body, `Failed to upload attachment: ${file.name}`));
  }

  return response.json() as Promise<AttachmentMetadata>;
}

export async function fetchAttachments(ticketId: number, requesterId: number): Promise<AttachmentMetadata[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!response.ok) throw new Error("Unable to load attachments");
  return response.json() as Promise<AttachmentMetadata[]>;
}

export async function removeAttachment(attachmentId: number, removedReason: string, requesterId: number): Promise<AttachmentMetadata> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Requester-Id": String(requesterId) },
    body: JSON.stringify({ removedReason }),
  });
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { /* safe fallback below */ }
    throw new Error(attachmentErrorMessage(body, "Unable to remove attachment"));
  }
  return response.json() as Promise<AttachmentMetadata>;
}

export async function downloadAttachment(attachmentId: number, requesterId: number): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    headers: { "X-Requester-Id": String(requesterId) },
  });
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { /* safe fallback below */ }
    throw new Error(attachmentErrorMessage(body, "Unable to download attachment"));
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "attachment";
  return { blob: await response.blob(), filename };
}
