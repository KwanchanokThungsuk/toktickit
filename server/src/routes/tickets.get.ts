import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

router.get("/api/tickets", async (req: Request, res: Response): Promise<any> => {
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

    const requesterId = Number(requesterIdHeader);

    const allowedQueryParams = [
      "search",
      "categoryId",
      "relatedSystemId",
      "requestedPriority",
      "currentStatus",
      "sortBy",
      "sortOrder",
      "page",
      "pageSize",
    ];

    const unknownParams = Object.keys(req.query).filter(
      (key) => !allowedQueryParams.includes(key)
    );

    if (unknownParams.length > 0) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    const {
      search,
      categoryId,
      relatedSystemId,
      requestedPriority,
      currentStatus,
      sortBy,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    if (
      search !== undefined &&
      (typeof search !== "string" || search.length > 150)
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      categoryId !== undefined &&
      (typeof categoryId !== "string" || !/^\d+$/.test(categoryId))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      relatedSystemId !== undefined &&
      (typeof relatedSystemId !== "string" || !/^\d+$/.test(relatedSystemId))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      requestedPriority !== undefined &&
      !["LOW", "MEDIUM", "HIGH"].includes(String(requestedPriority))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      currentStatus !== undefined &&
      String(currentStatus) !== "NEW"
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      sortBy !== undefined &&
      !["ticketNumber", "createdAt", "updatedAt"].includes(String(sortBy))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      sortOrder !== undefined &&
      !["asc", "desc"].includes(String(sortOrder))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      page !== undefined &&
      (typeof page !== "string" || !/^[1-9]\d*$/.test(page))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    if (
      pageSize !== undefined &&
      !["10", "20", "50"].includes(String(pageSize))
    ) {
      return res.status(400).json({
        error: {
          code: "INVALID_QUERY",
          message: "Invalid query parameters",
        },
      });
    }

    const prisma = getPrisma();

    const requester = await prisma.requesterUser.findUnique({
      where: {
        id: requesterId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: {
          code: "REQUESTER_INVALID",
          message: "Requester is invalid or inactive",
        },
      });
    }

    const where: any = {
      requesterId,
    };

    if (search !== undefined && search !== "") {
      where.OR = [
        {
          ticketNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          summary: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (categoryId !== undefined) {
      where.categoryId = Number(categoryId);
    }

    if (relatedSystemId !== undefined) {
      where.relatedSystemId = Number(relatedSystemId);
    }

    if (requestedPriority !== undefined) {
      where.requestedPriority = requestedPriority;
    }

    if (currentStatus !== undefined) {
      where.currentStatus = currentStatus;
    }

    const currentPage = page !== undefined ? Number(page) : 1;
    const currentPageSize = pageSize !== undefined ? Number(pageSize) : 10;

    const skip = (currentPage - 1) * currentPageSize;
    const take = currentPageSize;

    const effectiveSortBy =
      sortBy !== undefined ? String(sortBy) : "createdAt";

    const effectiveSortOrder =
      sortOrder !== undefined ? String(sortOrder) : "desc";

    const orderBy: any[] = [];

    if (effectiveSortBy === "ticketNumber") {
      orderBy.push({
        ticketNumber: effectiveSortOrder,
      });
    } else {
      orderBy.push({
        [effectiveSortBy]: effectiveSortOrder,
      });

      orderBy.push({
        ticketNumber: "desc",
      });
    }

    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take,
        select: {
          id: true,
          ticketNumber: true,
          summary: true,

          category: {
            select: {
              id: true,
              name: true,
            },
          },

          relatedSystem: {
            select: {
              id: true,
              name: true,
            },
          },

          requestedPriority: true,
          currentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.ticket.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(totalItems / currentPageSize);

    return res.status(200).json({
      data: tickets,
      meta: {
        page: currentPage,
        pageSize: currentPageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/tickets ERROR:", error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
});

export default router;