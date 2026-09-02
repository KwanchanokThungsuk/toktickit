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
    const { requesterId, categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

    // 1. ตรวจสอบข้อมูล Summary (AC-09, AC-10)
    if (!summary || summary.trim().length === 0) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Summary is required" });
    }
    if (summary.trim().length < 10) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Summary must be at least 10 characters long" });
    }

    const prisma = getPrisma();

    // 2. ตรวจสอบว่า Requester มีอยู่จริงและสถานะ Active (API-05)
    const requester = await prisma.requesterUser.findUnique({ where: { id: Number(requesterId) } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({ error: "REQUESTER_INVALID", message: "Invalid or inactive requester" });
    }

    // 3. ตรวจสอบว่า Category มีอยู่จริง (API-04)
    const category = await prisma.category.findUnique({ where: { id: Number(categoryId) } });
    if (!category) {
      return res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid category" });
    }

    // 4. รันหมายเลขตั๋วใหม่ (BR-04)
    const ticketNumber = await generateTicketNumber(prisma);

    // 5. บันทึกตั๋วลงฐานข้อมูล (AC-01, AC-12)
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: Number(requesterId),
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: summary.trim(),
        description: description?.trim() || "",
        requestedPriority: requestedPriority || "MEDIUM",
        currentStatus: "NEW" // สถานะเริ่มต้น (BR-02)
      }
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" }); // Safe error (AC-34)
  }
});

export default app;
