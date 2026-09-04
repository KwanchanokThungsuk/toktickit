import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { generateTicketNumber } from "../utils/ticketNumber.js";

const router = Router();

router.post("/api/tickets", async (req: Request, res: Response): Promise<any> => {
  try {
    // 1. Validate requester context
    const requesterIdHeader = req.header("X-Requester-Id");

    if (!requesterIdHeader || !/^\d+$/.test(requesterIdHeader)) {
      return res.status(400).json({
        error: {
          code: "REQUESTER_CONTEXT_MISSING",
          message: "Missing or invalid X-Requester-Id header",
        },
      });
    }

    const requesterId = Number(requesterIdHeader);

    // 2. Read request body
    const {
      categoryId,
      relatedSystemId,
      summary,
      description,
      requestedPriority,
    } = req.body;

    // 3. Validate summary
    if (
      typeof summary !== "string" ||
      summary.trim().length < 10 ||
      summary.trim().length > 150
    ) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Summary must be 10-150 characters",
        },
      });
    }

    // 4. Validate description
    if (
      typeof description !== "string" ||
      description.trim().length < 20 ||
      description.trim().length > 5000
    ) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Description must be 20-5000 characters",
        },
      });
    }

    // 5. Validate priority
    const validPriorities = ["LOW", "MEDIUM", "HIGH"];

    if (
      typeof requestedPriority !== "string" ||
      !validPriorities.includes(requestedPriority)
    ) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Priority must be LOW, MEDIUM, or HIGH",
        },
      });
    }

    // 6. Validate categoryId
    if (
      categoryId === undefined ||
      categoryId === null ||
      !Number.isInteger(Number(categoryId))
    ) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid categoryId",
        },
      });
    }

    // 7. Validate relatedSystemId
    if (
      relatedSystemId === undefined ||
      relatedSystemId === null ||
      !Number.isInteger(Number(relatedSystemId))
    ) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid relatedSystemId",
        },
      });
    }

    const prisma = getPrisma();

    // 8. Validate requester exists and is active
    const requester = await prisma.requesterUser.findUnique({
      where: {
        id: requesterId,
      },
    });

    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: {
          code: "REQUESTER_INVALID",
          message: "Invalid or inactive requester",
        },
      });
    }

    // 9. Validate category exists and is active
    const category = await prisma.category.findUnique({
      where: {
        id: Number(categoryId),
      },
    });

    if (!category || !category.isActive) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid or inactive category",
        },
      });
    }

    // 10. Validate related system exists and is active
    const relatedSystem = await prisma.relatedSystem.findUnique({
      where: {
        id: Number(relatedSystemId),
      },
    });

    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid or inactive related system",
        },
      });
    }

    // 11. Create ticket inside transaction
    const newTicket = await prisma.$transaction(async (tx: any) => {
      const ticketNumber = await generateTicketNumber(tx);

      return await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
          currentStatus: "NEW",
        },
      });
    });

    // 12. Return created ticket
    return res.status(201).json(newTicket);
  } catch (error) {
    console.error("POST /api/tickets ERROR:", error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
});

export default router;