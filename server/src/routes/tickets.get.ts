import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { internalServerError } from "../internal-error.js";
import { authenticatedUserId, requireRequester } from "../auth.js";

const router = Router();

router.get("/api/tickets", async (req: Request, res: Response): Promise<any> => {
  try {
    if (!requireRequester(req, res)) return;
    const authenticatedId = authenticatedUserId(req)!;
    const requesterId = authenticatedId;

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
      "statusGroup", "updatedFrom", "updatedTo", "recentlyResolvedFrom", "recentlyResolvedTo",
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
      statusGroup, updatedFrom, updatedTo, recentlyResolvedFrom, recentlyResolvedTo,
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
      !["NEW","OPEN","IN_PROGRESS","WAITING_FOR_REQUESTER","REOPENED","RESOLVED","CLOSED","CANCELLED"].includes(String(currentStatus))
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

    const activeStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
    const parseInstant = (v: unknown) => typeof v === "string" && /T\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && !Number.isNaN(Date.parse(v)) ? new Date(v) : null;
    if (statusGroup !== undefined && statusGroup !== "active") return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Invalid query parameters" } });
    if (statusGroup !== undefined && currentStatus !== undefined) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Conflicting status filters" } });
    const from = updatedFrom === undefined ? null : parseInstant(updatedFrom); const to = updatedTo === undefined ? null : parseInstant(updatedTo);
    const rfrom = recentlyResolvedFrom === undefined ? null : parseInstant(recentlyResolvedFrom); const rto = recentlyResolvedTo === undefined ? null : parseInstant(recentlyResolvedTo);
    if ((updatedFrom !== undefined && !from) || (updatedTo !== undefined && !to) || (updatedFrom === undefined) !== (updatedTo === undefined) || (from && to && from > to) || (recentlyResolvedFrom !== undefined && !rfrom) || (recentlyResolvedTo !== undefined && !rto) || (recentlyResolvedFrom === undefined) !== (recentlyResolvedTo === undefined) || (rfrom && rto && rfrom > rto)) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Invalid date range" } });
    if (recentlyResolvedFrom !== undefined && (statusGroup !== undefined || currentStatus !== undefined || sortBy !== undefined || sortOrder !== undefined)) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Conflicting recently resolved filters" } });

    const prisma = getPrisma();

    const requester = await prisma.user.findUnique({
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
    if (statusGroup !== undefined) where.currentStatus = { in: activeStatuses };
    if (from && to) where.updatedAt = { gte: from, lte: to };
    if (rfrom && rto) {
      where.currentStatus = { in: ["RESOLVED", "CLOSED"] };
      const resolutionOr = [{ resolvedAt: { gte: rfrom, lte: rto } }, { resolvedAt: null, updatedAt: { gte: rfrom, lte: rto } }];
      if (where.OR) { where.AND = [{ OR: where.OR }, { OR: resolutionOr }]; delete where.OR; } else where.OR = resolutionOr;
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
    if (from && to && effectiveSortBy === "updatedAt" && effectiveSortOrder === "desc") orderBy.splice(1, 1, { id: "asc" });
    if (rfrom && rto) { orderBy.length = 0; orderBy.push({ resolvedAt: "desc" }, { updatedAt: "desc" }, { id: "asc" }); }

    const recentlyResolvedMode = Boolean(rfrom && rto);
    let recentIds: number[] | null = null;
    if (recentlyResolvedMode) {
      // Ticket timestamps are stored as PostgreSQL TIMESTAMP(3). Bind the UTC wall-clock
      // representation explicitly so this raw query has the same endpoint semantics as
      // Prisma's DateTime predicate used for the dashboard aggregate.
      const sqlTimestamp = (value: Date) => value.toISOString().slice(0, -1).replace("T", " ");
      const conditions: Prisma.Sql[] = [Prisma.sql`"requesterId" = ${requesterId}`, Prisma.sql`"currentStatus"::text IN ('RESOLVED','CLOSED')`, Prisma.sql`(("resolvedAt" BETWEEN ${sqlTimestamp(rfrom!)}::timestamp(3) AND ${sqlTimestamp(rto!)}::timestamp(3)) OR ("resolvedAt" IS NULL AND "updatedAt" BETWEEN ${sqlTimestamp(rfrom!)}::timestamp(3) AND ${sqlTimestamp(rto!)}::timestamp(3)))`];
      if (search && typeof search === "string") conditions.push(Prisma.sql`("ticketNumber" ILIKE ${`%${search}%`} OR "summary" ILIKE ${`%${search}%`})`);
      if (categoryId !== undefined) conditions.push(Prisma.sql`"categoryId" = ${Number(categoryId)}`);
      if (relatedSystemId !== undefined) conditions.push(Prisma.sql`"relatedSystemId" = ${Number(relatedSystemId)}`);
      if (requestedPriority !== undefined) conditions.push(Prisma.sql`"requestedPriority" = ${String(requestedPriority)}`);
      const predicate = conditions.slice(1).reduce((sql, condition) => Prisma.sql`${sql} AND ${condition}`, conditions[0]);
      const rows = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`SELECT "id" FROM "Ticket" WHERE ${predicate} ORDER BY COALESCE("resolvedAt", "updatedAt") DESC, "id" ASC OFFSET ${skip} LIMIT ${take}`);
      recentIds = rows.map((row) => row.id);
    }
    const [tickets, totalItems] = await Promise.all([
      prisma.ticket.findMany({
        where: recentlyResolvedMode && recentIds ? { id: { in: recentIds } } : where,
        orderBy: recentlyResolvedMode ? [{ id: "asc" }] : orderBy,
        skip: recentlyResolvedMode ? 0 : skip,
        take: recentlyResolvedMode && recentIds ? recentIds.length : take,
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
          resolvedAt: true,
        },
      }),

      prisma.ticket.count({
        where,
      }),
    ]);

    const outputTickets = recentlyResolvedMode && recentIds ? recentIds.map((id) => tickets.find((ticket: any) => ticket.id === id)).filter(Boolean) : tickets;
    const totalPages = Math.ceil(totalItems / currentPageSize);

    return res.status(200).json({
      data: outputTickets,
      meta: {
        page: currentPage,
        pageSize: currentPageSize,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    return internalServerError(res, "GET /api/tickets ERROR:", error);
  }
});

export default router;
