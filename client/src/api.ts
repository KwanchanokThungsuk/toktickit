const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
export interface AuthUser { id: number; name: string; email: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR"; mustChangePassword: boolean }
let csrfToken = "";
async function csrf() { const r = await fetch(`${API_URL}/api/auth/csrf`, { credentials: "include" }); const b = await r.json(); csrfToken = b.csrfToken; return csrfToken; }
async function csrfHeader() { if (!csrfToken) await csrf(); return { "X-CSRF-Token": csrfToken }; }
export async function login(email: string, password: string) { await csrf(); const r = await fetch(`${API_URL}/api/auth/login`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ email, password }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error?.message ?? "Unable to sign in"); await csrf(); return b.user as AuthUser; }
export async function currentUser() { const r = await fetch(`${API_URL}/api/auth/me`, { credentials: "include" }); if (!r.ok) return null; return ((await r.json()) as { user: AuthUser }).user; }
export async function logout() { if (!csrfToken) await csrf(); await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken } }); csrfToken = ""; }
export async function changePassword(currentPassword: string, newPassword: string) { if (!csrfToken) await csrf(); const r = await fetch(`${API_URL}/api/auth/change-password`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify({ currentPassword, newPassword }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error?.message ?? "Unable to change password"); return b; }

export interface Category {
  id: number;
  name: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
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
  requestedPriority: TicketPriority;
  summary: string;
  description: string;
}

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "NEW";
export type TicketSortBy = "ticketNumber" | "createdAt" | "updatedAt";
export type TicketSortOrder = "asc" | "desc";
export type StaffTicketStatus = "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export interface StaffTicket { id: number; ticketNumber: string; createdAt: string; updatedAt: string; summary: string; requestedPriority: TicketPriority; itPriority: TicketPriority; currentStatus: StaffTicketStatus; category: Category; relatedSystem: RelatedSystem; assignedTo: { id: number; name: string; email: string } | null; }
export interface StaffTicketResponse { items: StaffTicket[]; page: number; pageSize: number; totalItems: number; totalPages: number; }
export interface StaffTicketOptions { page?: number; pageSize?: number; search?: string; status?: StaffTicketStatus; itPriority?: TicketPriority; sortBy?: TicketSortBy; sortOrder?: TicketSortOrder; }
export async function fetchStaffTickets(options: StaffTicketOptions = {}): Promise<StaffTicketResponse> { const params = new URLSearchParams(); Object.entries(options).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); const res = await fetch(`${API_URL}/api/staff/tickets?${params}`, { credentials: "include" }); const body = await res.json(); if (!res.ok) throw new Error(body.error?.message ?? "Unable to load ticket queue"); return body; }

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

export async function fetchTickets(options: FetchTicketsOptions): Promise<TicketListResponse> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });

  const res = await fetch(`${API_URL}/api/tickets?${params.toString()}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Unable to load your tickets");
  return res.json();
}

export async function createTicket(payload: CreateTicketPayload) {
  const token = await csrfHeader();
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...token,
    },
    credentials: "include",
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

function attachmentErrorMessage(
  body: unknown,
  fallback: string,
  status: number,
) {
  if (status >= 500) {
    return fallback;
  }

  if (typeof body === "object" && body && "error" in body) {
    const error = (body as { error?: { message?: unknown } }).error;
    if (typeof error?.message === "string") return error.message;
  }
  return fallback;
}

export async function uploadAttachment(ticketId: number, file: File): Promise<AttachmentMetadata> {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const formData = new FormData();
  formData.append("file", file); 

  const response = await fetch(`${apiUrl}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    // Do not set Content-Type manually for FormData.
    body: formData, credentials: "include", headers: await csrfHeader(),
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // Use the safe fallback below when the body is not JSON.
    }
    throw new Error(attachmentErrorMessage(body, `Failed to upload attachment: ${file.name}`, response.status));
  }

  return response.json() as Promise<AttachmentMetadata>;
}

export async function fetchAttachments(ticketId: number): Promise<AttachmentMetadata[]> {
  const response = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Unable to load attachments");
  return response.json() as Promise<AttachmentMetadata[]>;
}

export async function removeAttachment(attachmentId: number, removedReason: string): Promise<AttachmentMetadata> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/remove`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await csrfHeader()) }, credentials: "include",
    body: JSON.stringify({ removedReason }),
  });
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { /* safe fallback below */ }
    throw new Error(attachmentErrorMessage(body, "Unable to remove attachment", response.status));
  }
  return response.json() as Promise<AttachmentMetadata>;
}

export async function downloadAttachment(attachmentId: number): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    credentials: "include",
  });
  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { /* safe fallback below */ }
    throw new Error(attachmentErrorMessage(body, "Unable to download attachment", response.status));
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? "attachment";
  return { blob: await response.blob(), filename };
}
