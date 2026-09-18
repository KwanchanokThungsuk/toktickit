import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { requireStaff } from "../auth.js";

const router = Router();
const statuses = ["NEW", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH"];
const sortFields = ["ticketNumber", "createdAt", "updatedAt"];

router.get("/api/staff/tickets", async (req: Request, res: Response): Promise<any> => {
  if (!requireStaff(req, res)) return;
  const allowed = ["page", "pageSize", "search", "status", "itPriority", "sortBy", "sortOrder"];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) return res.status(422).json({ error: { code: "INVALID_QUERY", message: "Invalid query parameters." } });
  const value = (key: string) => req.query[key];
  const page = value("page") === undefined ? 1 : Number(value("page"));
  const pageSize = value("pageSize") === undefined ? 20 : Number(value("pageSize"));
  const search = value("search");
  const status = value("status");
  const itPriority = value("itPriority");
  const sortBy = value("sortBy") === undefined ? "updatedAt" : String(value("sortBy"));
  const sortOrder = value("sortOrder") === undefined ? "desc" : String(value("sortOrder"));
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100 || (search !== undefined && typeof search !== "string") || (status !== undefined && !statuses.includes(String(status))) || (itPriority !== undefined && !priorities.includes(String(itPriority))) || !sortFields.includes(sortBy) || !["asc", "desc"].includes(sortOrder)) return res.status(422).json({ error: { code: "INVALID_QUERY", message: "Invalid query parameters." } });
  try {
    const prisma = getPrisma();
    const where: any = {};
    if (search) where.OR = [{ ticketNumber: { contains: search, mode: "insensitive" } }, { summary: { contains: search, mode: "insensitive" } }];
    if (status !== undefined) where.currentStatus = String(status);
    if (itPriority !== undefined) where.itPriority = String(itPriority);
    const orderBy: any[] = [{ [sortBy]: sortOrder }, { id: "asc" }];
    const [rows, totalItems] = await Promise.all([
      prisma.ticket.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, ticketNumber: true, createdAt: true, updatedAt: true, summary: true, requestedPriority: true, itPriority: true, currentStatus: true, category: { select: { id: true, name: true } }, relatedSystem: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true, email: true } } } }),
      prisma.ticket.count({ where }),
    ]);
    return res.json({ items: rows, page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) });
  } catch (error) { return internalServerError(res, "GET /api/staff/tickets ERROR:", error); }
});
export default router;
