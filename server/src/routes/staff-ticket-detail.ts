import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import type { TicketStatus } from "@prisma/client";
import { internalServerError } from "../internal-error.js";
import { requireStaff, requireRequester, authenticatedUserId, requireCsrf, requirePasswordChanged } from "../auth.js";
const router = Router();
const owner = { select: { id: true, name: true, email: true, role: true } } as const;
router.get("/api/staff/tickets/:id", async (req: Request, res: Response) => {
  if (!requireStaff(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  try {
    const prisma = getPrisma();
    const [ticket, eligibleOwners] = await Promise.all([
      prisma.ticket.findUnique({ where: { id }, include: { requester: { select: { id: true, name: true, email: true } }, category: true, relatedSystem: true, assignedTo: owner, attachments: { select: { id: true, originalFilename: true, contentType: true, fileSize: true, uploadedAt: true, isRemoved: true, removedAt: true, removedReason: true } }, publicComments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } }, actionsTaken: { select: { status: true, result: true } }, internalNotes: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } } } }),
      prisma.user.findMany({ where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
    ]);
    if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    const { actionsTaken, ...detail } = ticket;
    const resolutionReady = !actionsTaken.some((action) => action.status === "DRAFT") && actionsTaken.some((action) => action.status === "COMPLETED" && action.result?.trim());
    return res.json({ ...detail, eligibleOwners, resolutionReady });
  } catch (e) { return internalServerError(res, "STAFF DETAIL ERROR:", e); }
});
function requireOperationalAccess(req: Request, res: Response): boolean {
  if (!req.auth) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
    return false;
  }
  if (req.auth.role !== "IT_STAFF" && req.auth.role !== "ADMINISTRATOR") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Operational workflow access required." } });
    return false;
  }
  return requirePasswordChanged(req, res);
}

async function setOwner(req: Request, res: Response, ownerId: number | null, expectedVersion: number) {
  if (!requireOperationalAccess(req, res) || !requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  try {
    const prisma = getPrisma();
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id }, select: { id: true, version: true } });
      if (!ticket) throw new WorkflowError("NOT_FOUND", "Ticket not found");
      if (ticket.version !== expectedVersion) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      if (ownerId !== null && !await tx.user.findFirst({ where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } })) throw new WorkflowError("INVALID_OWNER", "Owner must be active IT Staff or Administrator.");
      const changed = await tx.ticket.updateMany({ where: { id, version: expectedVersion }, data: { assignedToUserId: ownerId, version: { increment: 1 } } });
      if (changed.count !== 1) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      return tx.ticket.findUniqueOrThrow({ where: { id }, select: { assignedTo: owner, version: true } });
    });
    return res.set("X-Ticket-Version", String(updated.version)).json(updated.assignedTo);
  } catch (e: any) {
    if (workflowError(res, e)) return;
    if (e?.code === "P2034") return res.status(409).json({ error: { code: "STALE_UPDATE", message: "The Ticket changed. Refresh and retry." } });
    return internalServerError(res, "OWNER UPDATE ERROR:", e);
  }
}
router.patch("/api/staff/tickets/:id/owner", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (Object.keys(body).some((key) => key !== "ownerId" && key !== "expectedVersion") || (body.ownerId !== null && !Number.isInteger(body.ownerId)) || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "ownerId and expectedVersion are required." } });
  return setOwner(req, res, body.ownerId, body.expectedVersion);
});
router.post("/api/staff/tickets/:id/claim", async (req: Request, res: Response) => {
  const body = req.body ?? {};
  if (Object.keys(body).some((key) => key !== "expectedVersion") || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "expectedVersion is required." } });
  return setOwner(req, res, authenticatedUserId(req)!, body.expectedVersion);
});

function requirePriorityAccess(req: Request, res: Response): boolean {
  if (!req.auth) {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
    return false;
  }
  if (req.auth?.role !== "IT_STAFF" && req.auth?.role !== "ADMINISTRATOR") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Staff priority access required." } });
    return false;
  }
  return requirePasswordChanged(req, res);
}

router.patch("/api/staff/tickets/:id/priority", async (req: Request, res: Response) => {
  if (!requirePriorityAccess(req, res) || !requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  const body = req.body ?? {}; const value = body.itPriority;
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  if (Object.keys(body).some((key) => key !== "itPriority" && key !== "expectedVersion") || (value !== "LOW" && value !== "MEDIUM" && value !== "HIGH") || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) {
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "itPriority and expectedVersion are required." } });
  }
  try {
    const updated = await getPrisma().$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id }, select: { id: true, version: true } });
      if (!ticket) throw new WorkflowError("NOT_FOUND", "Ticket not found");
      if (ticket.version !== body.expectedVersion) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      const changed = await tx.ticket.updateMany({ where: { id, version: body.expectedVersion }, data: { itPriority: value, version: { increment: 1 } } });
      if (changed.count !== 1) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      return tx.ticket.findUniqueOrThrow({ where: { id }, select: { id: true, requestedPriority: true, itPriority: true, version: true, updatedAt: true } });
    });
    return res.status(200).json(updated);
  } catch (e: any) {
    if (workflowError(res, e)) return;
    if (e?.code === "P2034") return res.status(409).json({ error: { code: "STALE_UPDATE", message: "The Ticket changed. Refresh and retry." } });
    return internalServerError(res, "PRIORITY UPDATE ERROR:", e);
  }
});

export const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};
const statuses = Object.keys(ticketTransitions) as TicketStatus[];
const CANCELLED_ACTION_RESULT = "Cancelled because the Ticket was cancelled.";

class WorkflowError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}


function workflowError(res: Response, error: unknown): boolean {
  if (!(error instanceof WorkflowError)) return false;
  const status = error.code === "NOT_FOUND" ? 404 : error.code === "VALIDATION_ERROR" || error.code === "INVALID_OWNER" ? 422 : 409;
  res.status(status).json({ error: { code: error.code, message: error.message } });
  return true;
}

router.patch("/api/staff/tickets/:id/status", async (req: Request, res: Response) => {
  if (!requireOperationalAccess(req, res) || !requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const next = body.status;
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  if (Object.keys(body).some((key) => key !== "status" && key !== "expectedVersion") || typeof next !== "string" || !statuses.includes(next as TicketStatus) || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) {
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "status and expectedVersion are required." } });
  }
  try {
    const updated = await getPrisma().$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id }, select: { id: true, version: true, currentStatus: true } });
      if (!ticket) throw new WorkflowError("NOT_FOUND", "Ticket not found");
      if (ticket.version !== body.expectedVersion) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      const target = next as TicketStatus;
      if (!ticketTransitions[ticket.currentStatus].includes(target)) throw new WorkflowError("INVALID_STATUS_TRANSITION", "The requested status transition is not allowed.");
      if (target === "RESOLVED") {
        const [drafts, completed] = await Promise.all([
          tx.actionTaken.count({ where: { ticketId: id, status: "DRAFT" } }),
          tx.actionTaken.findMany({ where: { ticketId: id, status: "COMPLETED" }, select: { result: true } }),
        ]);
        if (drafts > 0 || !completed.some((action) => action.result?.trim())) throw new WorkflowError("RESOLUTION_BLOCKED", "Resolution requires at least one Completed Action with a Result and no Draft Actions.");
      }
      if (target === "CANCELLED") {
        await tx.actionTaken.updateMany({ where: { ticketId: id, status: "DRAFT" }, data: { status: "CANCELLED", result: CANCELLED_ACTION_RESULT, followUpRequired: false, followUpNote: null, performedById: null, completedAt: null, version: { increment: 1 } } });
      }
      const now = new Date();
      const changed = await tx.ticket.updateMany({ where: { id, version: body.expectedVersion }, data: { currentStatus: target, version: { increment: 1 }, ...(target === "RESOLVED" ? { resolvedAt: now } : {}) } });
      if (changed.count !== 1) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      return tx.ticket.findUniqueOrThrow({ where: { id }, select: { id: true, currentStatus: true, version: true, updatedAt: true, resolvedAt: true } });
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    if (workflowError(res, error)) return;
    if (error?.code === "P2034") return res.status(409).json({ error: { code: "STALE_UPDATE", message: "The Ticket changed. Refresh and retry." } });
    return internalServerError(res, "STATUS UPDATE ERROR:", error);
  }
});

router.post("/api/tickets/:id/problem-resolved", async (req: Request, res: Response) => {
  if (!requireRequester(req, res) || !requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  const userId = authenticatedUserId(req)!;
  const body = req.body ?? {};
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  if (Object.keys(body).some((key) => key !== "expectedVersion") || !Number.isInteger(body.expectedVersion) || body.expectedVersion < 1) {
    return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "expectedVersion is required." } });
  }
  try {
    const updated = await getPrisma().$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id, requesterId: userId }, select: { id: true, version: true, currentStatus: true, requesterResolutionIndicatedAt: true } });
      if (!ticket) throw new WorkflowError("NOT_FOUND", "Ticket not found");
      if (ticket.version !== body.expectedVersion) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      if (ticket.requesterResolutionIndicatedAt) throw new WorkflowError("ALREADY_INDICATED", "Problem resolution was already indicated.");
      if (ticket.currentStatus !== "IN_PROGRESS" && ticket.currentStatus !== "WAITING_FOR_REQUESTER") throw new WorkflowError("NOT_ALLOWED", "Problem resolution cannot be indicated in the current Ticket status.");
      const changed = await tx.ticket.updateMany({ where: { id, requesterId: userId, version: body.expectedVersion, requesterResolutionIndicatedAt: null }, data: { requesterResolutionIndicatedAt: new Date(), requesterResolutionIndicatedByUserId: userId, version: { increment: 1 } } });
      if (changed.count !== 1) throw new WorkflowError("STALE_UPDATE", "The Ticket changed. Refresh and retry.");
      return tx.ticket.findUniqueOrThrow({ where: { id }, select: { id: true, currentStatus: true, requesterResolutionIndicatedAt: true, requesterResolutionIndicatedByUserId: true, version: true, updatedAt: true } });
    });
    return res.status(200).json(updated);
  } catch (error: any) {
    if (workflowError(res, error)) return;
    if (error?.code === "P2034") return res.status(409).json({ error: { code: "STALE_UPDATE", message: "The Ticket changed. Refresh and retry." } });
    return internalServerError(res, "RESOLUTION INDICATION ERROR:", error);
  }
});
export default router;
