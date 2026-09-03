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
export async function uploadAttachment(ticketId: number, file: File, requesterId: number): Promise<any> {
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
    let message = `Failed to upload attachment: ${file.name}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) message = errorBody.message;
    } catch {
      // ใช้ fallback message เดิม
    }
    throw new Error(message);
  }

  return response.json();
}
