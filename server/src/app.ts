import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { generateTicketNumber } from "./utils/ticketNumber.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json());
import multer from "multer";

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
  },
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    res.status(500).json(
      {
        error: { 
          code: "INTERNAL_ERROR", 
          message: "Internal server error" 
        },
    });
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — Requester list
// ---------------------------------------------------------------------------
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    res.status(500).json({
      error: { 
        code: "INTERNAL_ERROR", 
        message: "Internal server error" 
      },
    });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (error) {
    res.status(500).json({
      error: { 
        code: "INTERNAL_ERROR", 
        message: "Failed to fetch related systems" 
      },
    });
  }
});

app.post("/api/tickets", async (req: Request, res: Response): Promise<any> => {
  try {
    const requesterIdHeader = req.header("X-Requester-Id");
    if (!requesterIdHeader) {
      return res.status(401).json({
        error: { 
          code: "UNAUTHORIZED", 
          message: "Missing X-Requester-Id header" 
        },
      });
    }
    const requesterId = Number(requesterIdHeader);

    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    if (!summary || summary.trim().length < 10 || summary.trim().length > 150) {
      return res.status(422).json({
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Summary must be 10-150 characters" 
        },
      });
    }

    if (!description || description.trim().length < 20 || description.trim().length > 5000) {
      return res.status(422).json({
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Description must be 20-5000 characters" 
        },
      });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH"];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      return res.status(422).json({
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Priority must be LOW, MEDIUM, or HIGH" 
        },
      });
    }

    const prisma = getPrisma();

    const requester = await prisma.requesterUser.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({
        error: { 
          code: "REQUESTER_INVALID", 
          message: "Invalid or inactive requester" 
        },
      });
    }

    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category || !category.isActive) {
      return res.status(422).json({
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Invalid or inactive category" 
        },
      });
    }

    const relatedSystem = await prisma.relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } });
    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(422).json({
        error: { 
          code: "VALIDATION_ERROR", 
          message: "Invalid or inactive related system" 
        },
      });
    }

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
          currentStatus: "NEW"
        }
      });
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    return res.status(500).json({
      error: { 
        code: "INTERNAL_ERROR", 
        message: "Internal server error" 
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Attachment Upload Endpoint (Lab 2 / Issue 10)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", (req: Request, res: Response, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: {
            code: "FILE_TOO_LARGE",
            message: "File exceeds 5 MB limit"
          }
        });
      }
      return res.status(400).json({
        error: { 
          code: "UPLOAD_ERROR", 
          message: err.message 
        },
      });
    } else if (err) {
      if (err.message === "UNSUPPORTED_FILE_TYPE") {
        return res.status(400).json({
          error: { 
            code: "UNSUPPORTED_FILE_TYPE", 
            message: "Allowed types: JPG, PNG, WEBP, PDF" 
          },
        });
      }
      return res.status(500).json({
        error: { 
          code: "INTERNAL_ERROR", 
          message: "Internal server error" 
        },
      });
    }
    next();
  });
}, async (req: Request, res: Response): Promise<any> => {
  try {
    const requesterIdHeader = req.header("X-Requester-Id");
    if (!requesterIdHeader) {
      return res.status(401).json({
        error: { 
          code: "UNAUTHORIZED", 
          message: "Missing X-Requester-Id header" },
      });
    }
    const requesterId = Number(requesterIdHeader);
    const ticketId = Number(req.params.id);

    const prisma = getPrisma();

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({
        error: { 
          code: "NOT_FOUND", 
          message: "Ticket not found or unauthorized" 
        },
      });
    }

    const activeCount = await prisma.attachment.count({
      where: {
        ticketId: ticketId,
        isRemoved: false
      }
    });

    if (activeCount >= 5) {
      return res.status(409).json({
        error: { 
          code: "ATTACHMENT_LIMIT_REACHED", 
          message: "Maximum 5 attachments allowed" },
      });
    }

    if (!req.file) {
      return res.status(422).json({
        error: { code: "VALIDATION_ERROR", 
          message: "No file uploaded" 
        },
      });
    }

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedById: requesterId,
      },
    });

    return res.status(201).json(attachment);
  } catch (error) {
    console.error("ATTACHMENT UPLOAD ERROR:", error);
    return res.status(500).json({
      error: { 
        code: "INTERNAL_ERROR", 
        message: "Internal server error" 
      },
    });
  }
});

export default app;