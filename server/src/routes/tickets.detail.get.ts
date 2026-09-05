import { Router, type Request, type Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const requesterIdHeader = req.header("X-Requester-Id");
    if (!requesterIdHeader || !/^\d+$/.test(requesterIdHeader)) {
      return res.status(400).json({
        error: {
          code: "REQUESTER_CONTEXT_MISSING",
          message: "Missing or invalid X-Requester-Id header",
        },
      });
    }

    const ticketId = Number(req.params.id);
    const requesterId = Number(requesterIdHeader);
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
        attachments: {
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
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Ticket not found" },
      });
    }

    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "You cannot access this ticket" },
      });
    }

    return res.status(200).json(ticket);
  } catch (error) {
    console.error("GET /api/tickets/:id ERROR:", error);
    return res.status(500).json({
      error: { code: "INTERNAL_ERROR", message: "Unable to load ticket" },
    });
  }
});

export default router;
