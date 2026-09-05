import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getPrisma } from "./prisma.js";
import ticketGetRouter from "./routes/tickets.get.js";
import ticketDetailGetRouter from "./routes/tickets.detail.get.js";
import ticketPostRouter from "./routes/tickets.post.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use(ticketGetRouter);
app.use(ticketDetailGetRouter);
app.use(ticketPostRouter);

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_ACTIVE_ATTACHMENTS = 5;
const ATTACHMENT_STORAGE_DIR = path.resolve(process.cwd(), ".data", "attachments");
const allowedAttachmentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

// Keep uploads in memory until requester, ownership, count, size, and type checks pass.
// This prevents rejected files from being persisted.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
});

const attachmentMetadataSelect = {
  id: true,
  ticketId: true,
  originalFilename: true,
  contentType: true,
  fileSize: true,
  uploadedAt: true,
  isRemoved: true,
  removedAt: true,
  removedById: true,
  removedReason: true,
} as const;

function attachmentError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message } });
}

async function getRequesterId(req: Request, res: Response): Promise<number | null> {
  const header = req.header("X-Requester-Id");
  if (!header || !/^\d+$/.test(header)) {
    attachmentError(res, 400, "REQUESTER_CONTEXT_MISSING", "Missing or invalid X-Requester-Id header");
    return null;
  }

  const requesterId = Number(header);
  const requester = await getPrisma().requesterUser.findFirst({
    where: { id: requesterId, isActive: true },
    select: { id: true },
  });
  if (!requester) {
    attachmentError(res, 400, "REQUESTER_INVALID", "Requester is unknown or inactive");
    return null;
  }

  return requesterId;
}

function attachmentExtensionMatches(file: Express.Multer.File) {
  const extension = path.extname(file.originalname).toLowerCase();
  return allowedAttachmentTypes[extension] === file.mimetype ? extension : null;
}

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
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
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
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
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    res.status(200).json(requesters);
  } catch (error) {
    console.error("DATABASE ERROR:", error);

    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Related System list
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();

    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    res.status(200).json(relatedSystems);
  } catch (error) {
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch related systems",
      },
    });
  }
});

// ---------------------------------------------------------------------------
// Attachment lifecycle — Issue #14
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
  try {
    const requesterId = await getRequesterId(req, res);
    if (requesterId === null) return;

    const ticketId = Number(req.params.id);
    const prisma = getPrisma();
    const ticket = Number.isInteger(ticketId) && ticketId > 0
      ? await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } })
      : null;
    if (!ticket) return attachmentError(res, 404, "NOT_FOUND", "Ticket not found");

    const activeCount = await prisma.attachment.count({ where: { ticketId, isRemoved: false } });
    if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
      return attachmentError(res, 409, "ATTACHMENT_LIMIT_REACHED", "Maximum 5 active attachments allowed");
    }

    upload.single("file")(req, res, async (uploadError) => {
      if (uploadError instanceof multer.MulterError && uploadError.code === "LIMIT_FILE_SIZE") {
        return attachmentError(res, 413, "FILE_TOO_LARGE", "File exceeds 5 MB limit");
      }
      if (uploadError) return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to upload attachment");
      if (!req.file) return attachmentError(res, 422, "VALIDATION_ERROR", "No file uploaded");

      const extension = attachmentExtensionMatches(req.file);
      if (!extension) {
        return attachmentError(res, 400, "UNSUPPORTED_FILE_TYPE", "File extension and content type must be JPG, PNG, WEBP, or PDF and must match");
      }

      const storedFilename = `${randomUUID()}${extension}`;
      const storedPath = path.join(ATTACHMENT_STORAGE_DIR, storedFilename);
      try {
        await mkdir(ATTACHMENT_STORAGE_DIR, { recursive: true });
        await writeFile(storedPath, req.file.buffer);
        const attachment = await prisma.attachment.create({
          data: {
            ticketId,
            originalFilename: req.file.originalname,
            storedFilename,
            contentType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedById: requesterId,
          },
          select: attachmentMetadataSelect,
        });
        return res.status(201).json(attachment);
      } catch (error) {
        await unlink(storedPath).catch(() => undefined);
        console.error("ATTACHMENT UPLOAD ERROR:", error);
        return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to upload attachment");
      }
    });
  } catch (error) {
    console.error("ATTACHMENT UPLOAD ERROR:", error);
    return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to upload attachment");
  }
});

app.get("/api/tickets/:id/attachments", async (req: Request, res: Response) => {
  try {
    const requesterId = await getRequesterId(req, res);
    if (requesterId === null) return;
    const ticketId = Number(req.params.id);
    const prisma = getPrisma();
    const ticket = Number.isInteger(ticketId) && ticketId > 0
      ? await prisma.ticket.findFirst({ where: { id: ticketId, requesterId }, select: { id: true } })
      : null;
    if (!ticket) return attachmentError(res, 404, "NOT_FOUND", "Ticket not found");

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: "asc" },
      select: attachmentMetadataSelect,
    });
    return res.status(200).json(attachments);
  } catch (error) {
    console.error("ATTACHMENT LIST ERROR:", error);
    return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to load attachments");
  }
});

app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const requesterId = await getRequesterId(req, res);
    if (requesterId === null) return;
    const attachmentId = Number(req.params.id);
    const attachment = Number.isInteger(attachmentId) && attachmentId > 0
      ? await getPrisma().attachment.findFirst({
        where: { id: attachmentId, isRemoved: false, ticket: { requesterId } },
      })
      : null;
    if (!attachment) return attachmentError(res, 404, "NOT_FOUND", "Attachment not found");

    const storedPath = path.join(ATTACHMENT_STORAGE_DIR, attachment.storedFilename);
    try {
      await stat(storedPath);
    } catch {
      return attachmentError(res, 500, "INTERNAL_ERROR", "Attachment file is unavailable");
    }
    res.type(attachment.contentType);
    return res.download(storedPath, attachment.originalFilename);
  } catch (error) {
    console.error("ATTACHMENT DOWNLOAD ERROR:", error);
    return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to download attachment");
  }
});

app.patch("/api/attachments/:id/remove", async (req: Request, res: Response) => {
  try {
    const requesterId = await getRequesterId(req, res);
    if (requesterId === null) return;
    const attachmentId = Number(req.params.id);
    const prisma = getPrisma();
    const attachment = Number.isInteger(attachmentId) && attachmentId > 0
      ? await prisma.attachment.findFirst({ where: { id: attachmentId, ticket: { requesterId } } })
      : null;
    if (!attachment) return attachmentError(res, 404, "NOT_FOUND", "Attachment not found");
    if (attachment.isRemoved) {
      return attachmentError(res, 409, "ATTACHMENT_ALREADY_REMOVED", "Attachment has already been removed");
    }

    const removedReason = typeof req.body?.removedReason === "string" ? req.body.removedReason.trim() : "";
    if (removedReason.length < 5 || removedReason.length > 200) {
      return res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Removal reason must be between 5 and 200 characters.",
          fields: { removedReason: "Removal reason must be between 5 and 200 characters." },
        },
      });
    }

    const removed = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedAt: new Date(), removedById: requesterId, removedReason },
      select: attachmentMetadataSelect,
    });
    return res.status(200).json(removed);
  } catch (error) {
    console.error("ATTACHMENT REMOVE ERROR:", error);
    return attachmentError(res, 500, "INTERNAL_ERROR", "Unable to remove attachment");
  }
});

export default app;
