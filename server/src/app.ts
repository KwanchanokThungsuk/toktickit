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

const upload = multer({ dest: "uploads/" });

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  // TODO(Issue 2): replace this stub with the required 200 response.
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 — Category list
// Add:  GET /api/categories
//   -> read categories from PostgreSQL via getPrisma().category.findMany(...)
//   -> return each { id, name } in a predictable (id) order
//   -> on failure, respond 500 with a safe message (no internal details)
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({
      where: { isActive: true }, // เพิ่มเงื่อนไขนี้เพื่อดึงเฉพาะ Active issue 9
      orderBy: { name: "asc" },  // เปลี่ยนมาเรียงตามชื่อตามข้อกำหนด UI issue 9
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Issue 8 — Requester list
// Add:  GET /api/requesters
//   -> read active requesters from PostgreSQL via getPrisma().requesterUser.findMany(...)
//   -> filter where isActive = true
//   -> return each { id, name, email } ordered by name ascending
//   -> on failure, respond 500 with a safe message (no internal details)
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
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    // แก้จาก category เป็น relatedSystem (เช็กชื่อโมเดลใน schema.prisma อีกรอบว่าชื่อนี้ไหม)
    const relatedSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(relatedSystems);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

app.post("/api/tickets", async (req: Request, res: Response): Promise<any> => {
  try {
    // 1. ดึง requesterId จาก Header (ป้องกันการสวมรอยจาก req.body)
    const requesterIdHeader = req.header("X-Requester-Id");
    if (!requesterIdHeader) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing X-Requester-Id header" });
    }
    const requesterId = Number(requesterIdHeader);

    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    // 2. ตรวจสอบ Validation อย่างละเอียดตามสเปก
    if (!summary || summary.trim().length < 10 || summary.trim().length > 150) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Summary must be 10-150 characters" });
    }

    if (!description || description.trim().length < 20 || description.trim().length > 5000) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Description must be 20-5000 characters" });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH"];
    if (!requestedPriority || !validPriorities.includes(requestedPriority)) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Priority must be LOW, MEDIUM, or HIGH" });
    }

    const prisma = getPrisma();

    // 3. ตรวจสอบสถานะ Active ของข้อมูลที่อ้างอิง
    const requester = await prisma.requesterUser.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({ error: "REQUESTER_INVALID", message: "Invalid or inactive requester" });
    }

    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category || !category.isActive) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid or inactive category" });
    }

    const relatedSystem = await prisma.relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } });
    if (!relatedSystem || !relatedSystem.isActive) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid or inactive related system" });
    }

    // 4. ใช้ $transaction เพื่อจัดการ Concurrency (BR-05)
    // ส่ง tx เข้าไปใน generateTicketNumber แทน prisma ตัวหลัก
    const newTicket = await prisma.$transaction(async (tx: any) => {
      const ticketNumber = await generateTicketNumber(tx);

      return await tx.ticket.create({
        data: {
          ticketNumber,
          requesterId, // ใช้จาก Header
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
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Attachment Upload Endpoint (Lab 2 / Issue 10)
// ---------------------------------------------------------------------------
app.post("/api/tickets/:id/attachments", upload.single("file"), async (req: Request, res: Response): Promise<any> => {
  try {
    const requesterIdHeader = req.header("X-Requester-Id");
    if (!requesterIdHeader) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Missing X-Requester-Id header" });
    }
    const requesterId = Number(requesterIdHeader);
    const ticketId = Number(req.params.id);

    const prisma = getPrisma();

    // 1. ตรวจสอบว่ามี Ticket นี้จริงและเป็นของผู้ใช้คนนี้จริงไหม
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== requesterId) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found or unauthorized" });
    }

    // 2. ตรวจสอบว่ามีไฟล์ถูกส่งมาหรือไม่
    if (!req.file) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "No file uploaded" });
    }

    // 3. บันทึกข้อมูลไฟล์ลงตาราง Attachment ตาม Prisma Schema
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
    return res.status(500).json({ error: "Internal server error" });
  }
});
export default app;
