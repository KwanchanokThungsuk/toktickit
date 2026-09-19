import { Router, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { authenticatedUserId, requireCsrf } from "../auth.js";

const router = Router();

function bodyValue(value: unknown): { ok: true; body: string } | { ok: false } {
  if (typeof value !== "string") return { ok: false };
  if (value.trim().length === 0 || Array.from(value).length > 2000) return { ok: false };
  return { ok: true, body: value.trim() };
}

function invalidBody(res: Response) {
  return res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Body must be non-blank and at most 2,000 characters." } });
}

router.get("/api/tickets/:id/comments", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { requesterId: true } });
    if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    if (req.auth.role === "REQUESTER" && ticket.requesterId !== authenticatedUserId(req)) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    if (req.auth.role !== "REQUESTER" && req.auth.role !== "IT_STAFF" && req.auth.role !== "ADMINISTRATOR") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Comment access forbidden." } });
    const comments = await getPrisma().publicComment.findMany({ where: { ticketId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.status(200).json(comments);
  } catch (error) { return internalServerError(res, "GET COMMENTS ERROR:", error); }
});

router.post("/api/tickets/:id/comments", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
  if (!requireCsrf(req, res)) return;
  if (req.auth.role !== "REQUESTER" && req.auth.role !== "IT_STAFF") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Comment creation forbidden." } });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id }, select: { requesterId: true } });
    if (!ticket) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    if (req.auth.role === "REQUESTER" && ticket.requesterId !== authenticatedUserId(req)) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    const body = bodyValue(req.body?.body);
    if (!body.ok) return invalidBody(res);
    const comment = await getPrisma().publicComment.create({ data: { ticketId: id, authorId: authenticatedUserId(req)!, body: body.body }, select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.status(201).json(comment);
  } catch (error) { return internalServerError(res, "CREATE COMMENT ERROR:", error); }
});

router.get("/api/staff/tickets/:id/internal-notes", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
  if (req.auth.role === "REQUESTER") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Internal Note access forbidden." } });
  if (req.auth.role !== "IT_STAFF" && req.auth.role !== "ADMINISTRATOR") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Internal Note access forbidden." } });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  try {
    const exists = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    const notes = await getPrisma().internalNote.findMany({ where: { ticketId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.status(200).json(notes);
  } catch (error) { return internalServerError(res, "GET NOTES ERROR:", error); }
});

router.post("/api/staff/tickets/:id/internal-notes", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
  if (req.auth.role !== "IT_STAFF") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Internal Note creation forbidden." } });
  if (!requireCsrf(req, res)) return;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
  const body = bodyValue(req.body?.body);
  if (!body.ok) return invalidBody(res);
  try {
    const exists = await getPrisma().ticket.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Ticket not found." } });
    const note = await getPrisma().internalNote.create({ data: { ticketId: id, authorId: authenticatedUserId(req)!, body: body.body }, select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } });
    return res.status(201).json(note);
  } catch (error) { return internalServerError(res, "CREATE NOTE ERROR:", error); }
});

export default router;
