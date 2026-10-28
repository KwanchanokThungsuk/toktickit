import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { Prisma } from "@prisma/client";
import { internalServerError } from "../internal-error.js";
import { authenticatedUserId, requireRequester, requireStaffOrAdministrator } from "../auth.js";

const router = Router();
let clock: () => Date = () => new Date();
export function setDashboardClockForTests(provider?: () => Date) { clock = provider ?? (() => new Date()); }
const ACTIVE: any = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const STATUSES: any = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"];
const PRIORITIES: any = ["LOW", "MEDIUM", "HIGH"];
const ticketSelect = { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, assignedTo: { select: { id: true, name: true, role: true } }, updatedAt: true, resolvedAt: true } as const;
const actionSelect = { id: true, ticketId: true, actionDescription: true, status: true, completedAt: true, followUpRequired: true, performer: { select: { id: true, name: true, role: true } }, ticket: { select: { ticketNumber: true } } } as const;
const bad = (res: Response, status: number) => res.status(status).json({ error: { code: "INVALID_QUERY", message: "Invalid query parameters." } });
const scalar = (v: unknown) => typeof v === "string";
function instant(v: unknown) { return scalar(v) && /T\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(v) : null; }
function summary(t: any, requester = false) { const out: any = { id: t.id, ticketNumber: t.ticketNumber, summary: t.summary, currentStatus: t.currentStatus, updatedAt: t.updatedAt }; if (!requester) { out.itPriority = t.itPriority; out.assignedTo = t.assignedTo; } if (t.currentStatus === "RESOLVED" || t.currentStatus === "CLOSED") { out.resolutionTime = t.resolvedAt ?? t.updatedAt; out.resolutionTimeSource = t.resolvedAt ? "FORMAL_RESOLUTION" : "LEGACY_UPDATED_AT"; } return out; }
function actionSummary(a: any) { return { id: a.id, ticketId: a.ticketId, ticketNumber: a.ticket.ticketNumber, actionDescription: a.actionDescription, status: a.status, completedAt: a.completedAt, performedBy: a.performer, followUpRequired: a.followUpRequired }; }
function windowValues() { const end = clock(); const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); return { end, start }; }
function rejectQuery(req: Request, allowed: string[], status: number, res: Response) { return Object.keys(req.query).some(k => !allowed.includes(k)) ? bad(res, status) : false; }

router.get("/api/dashboard/requester", async (req, res) => {
  if (!requireRequester(req, res)) return;
  if (rejectQuery(req, [], 400, res)) return;
  const requesterId = authenticatedUserId(req)!; const { start, end } = windowValues();
  try {
    const prisma = getPrisma();
    const base = { requesterId };
    const recent = { ...base, updatedAt: { gte: start, lte: end } };
    const resolved: any = { ...base, currentStatus: { in: ["RESOLVED", "CLOSED"] }, OR: [{ resolvedAt: { gte: start, lte: end } }, { resolvedAt: null, updatedAt: { gte: start, lte: end } }] };
    const [openTickets, waitingForRequester, recentlyUpdated, recentlyResolved, attention, recentTickets, resolvedTickets] = await Promise.all([
      prisma.ticket.count({ where: { ...base, currentStatus: { in: ACTIVE } } }), prisma.ticket.count({ where: { ...base, currentStatus: "WAITING_FOR_REQUESTER" } }), prisma.ticket.count({ where: recent }), prisma.ticket.count({ where: resolved }),
      prisma.ticket.findMany({ where: { ...base, currentStatus: "WAITING_FOR_REQUESTER" }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5, select: ticketSelect }),
      prisma.ticket.findMany({ where: recent, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5, select: ticketSelect }),
      prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT "id" FROM "Ticket" WHERE "requesterId" = ${requesterId} AND "currentStatus" IN ('RESOLVED','CLOSED') AND (("resolvedAt" BETWEEN ${start} AND ${end}) OR ("resolvedAt" IS NULL AND "updatedAt" BETWEEN ${start} AND ${end})) ORDER BY COALESCE("resolvedAt", "updatedAt") DESC, "id" ASC LIMIT 5`),
    ]);
    const resolvedIds = (resolvedTickets as Array<{ id: number }>).map((row) => row.id);
    const resolvedRows = resolvedIds.length ? await prisma.ticket.findMany({ where: { id: { in: resolvedIds } }, select: ticketSelect }) : [];
    const resolvedById = new Map(resolvedRows.map((row: any) => [row.id, row]));
    const drill = (query: any) => ({ destination: "/tickets", query });
    return res.json({ asOf: end.toISOString(), window: { start: start.toISOString(), end: end.toISOString() }, displayTimeZone: "Asia/Bangkok", metrics: { openTickets: { count: openTickets, drillDown: drill({ statusGroup: "active" }) }, waitingForRequester: { count: waitingForRequester, drillDown: drill({ currentStatus: "WAITING_FOR_REQUESTER" }) }, recentlyUpdated: { count: recentlyUpdated, drillDown: drill({ updatedFrom: start.toISOString(), updatedTo: end.toISOString(), sortBy: "updatedAt", sortOrder: "desc" }) }, recentlyResolved: { count: recentlyResolved, drillDown: drill({ recentlyResolvedFrom: start.toISOString(), recentlyResolvedTo: end.toISOString() }) } }, attentionRequired: attention.map(t => summary(t, true)), recentTickets: recentTickets.map(t => summary(t, true)), resolvedTickets: resolvedIds.map((id) => summary(resolvedById.get(id), true)) });
  } catch (e) { return internalServerError(res, "REQUESTER DASHBOARD ERROR:", e); }
});

router.get("/api/staff/dashboard", async (req, res) => {
  if (!requireStaffOrAdministrator(req, res)) return;
  if (rejectQuery(req, [], 422, res)) return;
  const userId = authenticatedUserId(req)!; const { start, end } = windowValues();
  try {
    const prisma = getPrisma(); const active = { currentStatus: { in: ACTIVE } }; const recent = { updatedAt: { gte: start, lte: end } };
    const counts = await Promise.all([prisma.ticket.count({ where: { ...active, assignedToUserId: null } }), prisma.ticket.count({ where: { ...active, assignedToUserId: userId } }), prisma.ticket.count({ where: recent }), (prisma.actionTaken as any).count({ where: { status: "COMPLETED", performedById: userId, completedAt: { gte: start, lte: end } } })]);
    const byStatus = Object.fromEntries(await Promise.all(STATUSES.map(async (s: string) => [s, { count: await prisma.ticket.count({ where: { currentStatus: s as any } }), drillDown: { destination: "/staff/tickets", query: { status: s } } }] as const)));
    const byItPriority = Object.fromEntries(await Promise.all(PRIORITIES.map(async (p: string) => [p, { count: await prisma.ticket.count({ where: { ...active, itPriority: p as any } }), drillDown: { destination: "/staff/tickets", query: { statusGroup: "active", itPriority: p } } }] as const)));
    const [recentTickets, urgentTickets, actions] = await Promise.all([prisma.ticket.findMany({ where: recent, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5, select: ticketSelect }), prisma.ticket.findMany({ where: { ...active, itPriority: "HIGH" }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 5, select: ticketSelect }), (prisma.actionTaken as any).findMany({ where: { status: "COMPLETED", performedById: userId, completedAt: { gte: start, lte: end } }, orderBy: [{ completedAt: "desc" }, { id: "asc" }], take: 5, select: actionSelect })]);
    const dd = (query: any) => ({ destination: "/staff/tickets", query });
    return res.json({ asOf: end.toISOString(), window: { start: start.toISOString(), end: end.toISOString() }, displayTimeZone: "Asia/Bangkok", metrics: { unassignedTickets: { count: counts[0], drillDown: dd({ owner: "unassigned", statusGroup: "active" }) }, myTickets: { count: counts[1], drillDown: dd({ owner: "me", statusGroup: "active" }) }, recentlyUpdated: { count: counts[2], drillDown: dd({ updatedFrom: start.toISOString(), updatedTo: end.toISOString(), sortBy: "updatedAt", sortOrder: "desc" }) }, myActions: { count: counts[3], drillDown: { destination: "/staff/dashboard/actions", query: { completedFrom: start.toISOString(), completedTo: end.toISOString() } } }, byStatus, byItPriority }, recentTickets: recentTickets.map(t => summary(t)), urgentTickets: urgentTickets.map(t => summary(t)), myRecentActions: actions.map(actionSummary), urgentDrillDown: dd({ statusGroup: "active", itPriority: "HIGH" }) });
  } catch (e) { return internalServerError(res, "STAFF DASHBOARD ERROR:", e); }
});

router.get("/api/staff/dashboard/actions", async (req, res) => {
  if (!requireStaffOrAdministrator(req, res)) return;
  const allowed = ["completedFrom", "completedTo", "page", "pageSize"]; if (rejectQuery(req, allowed, 422, res)) return;
  const from = instant(req.query.completedFrom), to = instant(req.query.completedTo); const page = req.query.page === undefined ? 1 : Number(req.query.page); const pageSize = req.query.pageSize === undefined ? 20 : Number(req.query.pageSize);
  if (!from || !to || from > to || !Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return bad(res, 422);
  try { const where = { status: "COMPLETED", performedById: authenticatedUserId(req)!, completedAt: { gte: from, lte: to } }; const prisma = getPrisma(); const [items, totalItems] = await Promise.all([(prisma.actionTaken as any).findMany({ where, orderBy: [{ completedAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: actionSelect }), (prisma.actionTaken as any).count({ where })]); return res.json({ items: items.map(actionSummary), page, pageSize, totalItems, totalPages: totalItems ? Math.ceil(totalItems / pageSize) : 0 }); } catch (e) { return internalServerError(res, "STAFF ACTION DASHBOARD ERROR:", e); }
});

export default router;
