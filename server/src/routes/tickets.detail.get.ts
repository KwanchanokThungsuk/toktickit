import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { authenticatedUserId, requireRequester } from "../auth.js";

const router = Router();

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    if (!req.auth) return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required." } });
    if (req.auth.role !== "REQUESTER" && req.auth.role !== "ADMINISTRATOR") return res.status(403).json({ error: { code: "FORBIDDEN", message: "Ticket inspection forbidden." } });
    const authenticatedId = authenticatedUserId(req)!;
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId < 1) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        attachments: req.auth.role === "REQUESTER" ? {
          orderBy: { uploadedAt: "asc" },
          select: {
            id: true,
            originalFilename: true,
            contentType: true,
            fileSize: true,
            uploadedAt: true,
            isRemoved: true,
            removedAt: true,
            removedReason: true,
          },
        } : false,
        actionsTaken: { select: { status: true, result: true } },
        publicComments: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, ticketId: true, body: true, createdAt: true, author: { select: { id: true, name: true, role: true } } } },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    if (req.auth.role === "REQUESTER" && ticket.requesterId !== authenticatedId) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "That ticket could not be found." },
      });
    }

    const { actionsTaken, ...detail } = ticket;
    const resolutionReady = !actionsTaken.some((action) => action.status === "DRAFT") && actionsTaken.some((action) => action.status === "COMPLETED" && action.result?.trim());
    return res.status(200).json({ ...detail, resolutionReady });
  } catch (error) {
    return internalServerError(res, "GET /api/tickets/:id ERROR:", error);
  }
});

export default router;
