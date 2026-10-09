import { Router, type Request, type Response } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { authenticatedUserId, requireCsrf, requirePasswordChanged } from "../auth.js";

const router = Router();
const userSummary = { id: true, name: true, role: true } as const;
const actionInclude = { creator: { select: userSummary }, performer: { select: userSummary }, assignee: { select: userSummary } } as const;
const MAX_TEXT = 2000;
const MAX_NOTE = 2000;

function operational(req: Request, res: Response) {
  if (!req.auth) { res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } }); return false; }
  if (req.auth.role !== "IT_STAFF" && req.auth.role !== "ADMINISTRATOR") { res.status(403).json({ error: { code: "FORBIDDEN", message: "Operational access required." } }); return false; }
  return requirePasswordChanged(req, res);
}
function id(value: unknown) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : null; }
function text(value: unknown, max = MAX_TEXT) { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null; }
function optionalText(value: unknown, max = MAX_NOTE) { if (value == null || (typeof value === "string" && value.trim() === "")) return null; return typeof value === "string" && value.trim().length <= max ? value.trim() : undefined; }
function invalid(res: Response, message: string) { return res.status(422).json({ error: { code: "VALIDATION_ERROR", message } }); }
function safeAction(action: any) { return action; }

router.get("/api/tickets/:id/actions-taken", async (req: Request, res: Response) => {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
  if (!requirePasswordChanged(req, res)) return;
  const ticketId = id(req.params.id);
  if (!ticketId) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  const page = req.query.page === undefined ? 1 : id(req.query.page);
  const pageSize = req.query.pageSize === undefined ? 20 : id(req.query.pageSize);
  if (!page || !pageSize || pageSize > 100) return invalid(res, "page and pageSize must be positive; pageSize must be at most 100");
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true, requesterId: true, version: true } });
    if (!ticket || (req.auth.role === "REQUESTER" && ticket.requesterId !== req.auth.userId)) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    const where = { ticketId };
    const [totalItems, items] = await Promise.all([
      prisma.actionTaken.count({ where }),
      prisma.actionTaken.findMany({ where, include: actionInclude, orderBy: [{ actionDateTime: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return res.status(200).json({ items: items.map(safeAction), page, pageSize, totalItems, totalPages: totalItems ? Math.ceil(totalItems / pageSize) : 0, ticketVersion: ticket.version });
  } catch (e) { return internalServerError(res, "ACTION LIST ERROR:", e); }
});

router.post("/api/staff/tickets/:id/actions-taken", async (req: Request, res: Response) => {
  if (!operational(req, res) || !requireCsrf(req, res)) return;
  const ticketId = id(req.params.id); const creatorId = authenticatedUserId(req);
  if (!ticketId || !creatorId) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
  const body = req.body ?? {};
  const allowedPost = ["actionDescription", "result", "followUpRequired", "followUpNote", "attachmentNotes", "assignedToUserId", "status", "expectedTicketVersion", "requestKey"];
  if (Object.keys(body).some(key => !allowedPost.includes(key))) return invalid(res, "Unsupported Action field");
  const description = text(body.actionDescription); const requestKey = text(body.requestKey, 200);
  const followUpRequired = body.followUpRequired;
  const expectedTicketVersion = body.expectedTicketVersion;
  if (!description || typeof followUpRequired !== "boolean" || !Number.isInteger(expectedTicketVersion) || expectedTicketVersion < 1 || !requestKey) return invalid(res, "Invalid required Action fields");
  const result = optionalText(body.result); const followUpNote = optionalText(body.followUpNote); const attachmentNotes = optionalText(body.attachmentNotes);
  if (result === undefined || followUpNote === undefined || attachmentNotes === undefined) return invalid(res, "Invalid Action text field");
  if (followUpRequired && !followUpNote) return invalid(res, "followUpNote is required when followUpRequired is true");
  const status = body.status ?? "DRAFT";
  if (status !== "DRAFT" && status !== "COMPLETED") return invalid(res, "Action status must be DRAFT or COMPLETED");
  if (status === "COMPLETED" && !result) return invalid(res, "result is required for a Completed Action");
  const assignedToUserId = body.assignedToUserId == null ? null : id(body.assignedToUserId);
  if (body.assignedToUserId != null && !assignedToUserId) return invalid(res, "Invalid assignee");
  try {
    const prisma = getPrisma();
    const action = await prisma.$transaction(async tx => {
      const existing = await tx.actionTaken.findUnique({ where: { ticketId_createdById_requestKey: { ticketId, createdById: creatorId, requestKey } }, include: actionInclude });
      if (existing) return { action: existing, created: false, ticketVersion: (await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version };
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { id: true, version: true, currentStatus: true } });
      if (!ticket) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw Object.assign(new Error("TICKET_NOT_ACTIVE"), { code: "TICKET_NOT_ACTIVE" });
      if (ticket.version !== expectedTicketVersion) throw Object.assign(new Error("STALE_UPDATE"), { code: "STALE_UPDATE" });
      if (assignedToUserId !== null) {
        const assignee = await tx.user.findFirst({ where: { id: assignedToUserId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
        if (!assignee) throw Object.assign(new Error("INVALID_ASSIGNEE"), { code: "INVALID_ASSIGNEE" });
      }
      const now = new Date();
      const created = await tx.actionTaken.create({ data: { ticketId, createdById: creatorId, actionDescription: description, result, status, followUpRequired, followUpNote: followUpRequired ? followUpNote : null, attachmentNotes, assignedToUserId, performedById: status === "COMPLETED" ? creatorId : null, completedAt: status === "COMPLETED" ? now : null, requestKey }, include: actionInclude });
      const updatedTicket = await tx.ticket.updateMany({ where: { id: ticketId, version: expectedTicketVersion }, data: { version: { increment: 1 } } });
      if (updatedTicket.count !== 1) throw Object.assign(new Error("STALE_UPDATE"), { code: "STALE_UPDATE" });
      return { action: created, created: true, ticketVersion: expectedTicketVersion + 1 };
    });
    return res.status(action.created ? 201 : 200).json({ action: safeAction(action.action), ticketVersion: action.ticketVersion });
  } catch (e: any) {
    if (e?.code === "STALE_UPDATE") {
      const existing = await getPrisma().actionTaken.findUnique({ where: { ticketId_createdById_requestKey: { ticketId, createdById: creatorId, requestKey } }, include: actionInclude });
      if (existing) return res.status(200).json({ action: existing, ticketVersion: (await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
      return res.status(409).json({ error: { code: "STALE_UPDATE", message: "The Ticket changed. Refresh and retry." } });
    }
    if (e?.code === "TICKET_NOT_ACTIVE") return res.status(409).json({ error: { code: "TICKET_NOT_ACTIVE", message: "Ticket is not active." } });
    if (e?.code === "INVALID_ASSIGNEE") return invalid(res, "Assignee must be an active IT Staff or Administrator");
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const existing = await getPrisma().actionTaken.findUnique({ where: { ticketId_createdById_requestKey: { ticketId, createdById: creatorId, requestKey } }, include: actionInclude });
      if (existing) return res.status(200).json({ action: existing, ticketVersion: (await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
    }
    if (e?.code === "NOT_FOUND") return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found" } });
    return internalServerError(res, "ACTION CREATE ERROR:", e);
  }
});

router.patch("/api/staff/tickets/:id/actions-taken/:actionId", async (req: Request, res: Response) => {
  if (!operational(req, res) || !requireCsrf(req, res)) return;
  const ticketId = id(req.params.id); const actionId = id(req.params.actionId);
  if (!ticketId || !actionId) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Action not found" } });
  const body = req.body ?? {};
  if (!Number.isInteger(body.expectedTicketVersion) || !Number.isInteger(body.expectedVersion)) return invalid(res, "Expected Ticket and Action versions are required");
  const allowed = ["actionDescription", "result", "assignedToUserId", "followUpRequired", "followUpNote", "attachmentNotes", "status", "expectedTicketVersion", "expectedVersion"];
  if (Object.keys(body).some(key => !allowed.includes(key))) return invalid(res, "Unsupported Action field");
  try {
    const prisma = getPrisma();
    const result = await prisma.$transaction(async tx => {
      const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } });
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId }, select: { version: true, currentStatus: true } });
      if (!current || !ticket) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      if (current.status !== "DRAFT") throw Object.assign(new Error("ACTION_IMMUTABLE"), { code: "ACTION_IMMUTABLE" });
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus)) throw Object.assign(new Error("TICKET_NOT_ACTIVE"), { code: "TICKET_NOT_ACTIVE" });
      if (ticket.version !== body.expectedTicketVersion || current.version !== body.expectedVersion) throw Object.assign(new Error("STALE_UPDATE"), { code: "STALE_UPDATE" });
      const assignedToUserId = body.assignedToUserId === undefined ? current.assignedToUserId : (body.assignedToUserId === null ? null : id(body.assignedToUserId));
      if (body.assignedToUserId !== undefined && body.assignedToUserId !== null && assignedToUserId === null) throw Object.assign(new Error("VALIDATION_ERROR"), { code: "VALIDATION_ERROR" });
      const merged = { actionDescription: body.actionDescription ?? current.actionDescription, result: body.result === undefined ? current.result : body.result, assignedToUserId, followUpRequired: body.followUpRequired === undefined ? current.followUpRequired : body.followUpRequired, followUpNote: body.followUpNote === undefined ? current.followUpNote : body.followUpNote, attachmentNotes: body.attachmentNotes === undefined ? current.attachmentNotes : body.attachmentNotes, status: body.status ?? current.status };
      const desc = text(merged.actionDescription); const resText = optionalText(merged.result); const note = optionalText(merged.followUpNote); const attachment = optionalText(merged.attachmentNotes);
      if (!desc || resText === undefined || note === undefined || attachment === undefined || typeof merged.followUpRequired !== "boolean") throw Object.assign(new Error("VALIDATION_ERROR"), { code: "VALIDATION_ERROR" });
      if (merged.followUpRequired && !note) throw Object.assign(new Error("VALIDATION_ERROR"), { code: "VALIDATION_ERROR" });
      if (merged.status !== "DRAFT" && merged.status !== "COMPLETED" && merged.status !== "CANCELLED") throw Object.assign(new Error("INVALID_ACTION_TRANSITION"), { code: "INVALID_ACTION_TRANSITION" });
      if (merged.status === "COMPLETED" && !resText) throw Object.assign(new Error("VALIDATION_ERROR"), { code: "VALIDATION_ERROR" });
      if (merged.status === "CANCELLED" && !resText) throw Object.assign(new Error("VALIDATION_ERROR"), { code: "VALIDATION_ERROR" });
      if (merged.assignedToUserId !== null) {
        const assignee = await tx.user.findFirst({ where: { id: merged.assignedToUserId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } }, select: { id: true } });
        if (!assignee) throw Object.assign(new Error("INVALID_ASSIGNEE"), { code: "INVALID_ASSIGNEE" });
      }
      const cancelled = merged.status === "CANCELLED";
      const completed = merged.status === "COMPLETED";
      const updatedTicket = await tx.ticket.updateMany({ where: { id: ticketId, version: body.expectedTicketVersion }, data: { version: { increment: 1 } } });
      if (updatedTicket.count !== 1) throw Object.assign(new Error("STALE_UPDATE"), { code: "STALE_UPDATE" });
      const updated = await tx.actionTaken.updateMany({ where: { id: actionId, version: body.expectedVersion, status: "DRAFT" }, data: { actionDescription: desc, result: resText, assignedToUserId: merged.assignedToUserId, followUpRequired: cancelled ? false : merged.followUpRequired, followUpNote: cancelled || !merged.followUpRequired ? null : note, attachmentNotes: attachment, status: merged.status, performedById: completed ? authenticatedUserId(req) : null, completedAt: completed ? new Date() : null, version: { increment: 1 } } });
      if (updated.count !== 1) throw Object.assign(new Error("STALE_UPDATE"), { code: "STALE_UPDATE" });
      const action = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: actionInclude });
      return { action, ticketVersion: body.expectedTicketVersion + 1 };
    });
    return res.status(200).json(result);
  } catch (e: any) {
    const codes: Record<string, [number, string]> = { NOT_FOUND: [404, "NOT_FOUND"], ACTION_IMMUTABLE: [409, "ACTION_IMMUTABLE"], TICKET_NOT_ACTIVE: [409, "TICKET_NOT_ACTIVE"], STALE_UPDATE: [409, "STALE_UPDATE"], INVALID_ACTION_TRANSITION: [409, "INVALID_ACTION_TRANSITION"], INVALID_ASSIGNEE: [422, "VALIDATION_ERROR"], VALIDATION_ERROR: [422, "VALIDATION_ERROR"] };
    if (e?.code && codes[e.code]) return res.status(codes[e.code][0]).json({ error: { code: codes[e.code][1], message: e.code.replaceAll("_", " ") } });
    return internalServerError(res, "ACTION UPDATE ERROR:", e);
  }
});

export default router;
