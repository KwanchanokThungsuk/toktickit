import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("Lab 2 - Attachment Upload API (Issue 10)", () => {
  let testTicketId: number;
  let requesterId: number;
  let otherRequesterId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    
    // เคลียร์ข้อมูลเก่าและสร้างข้อมูลจำลองสำหรับทดสอบ
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.requesterUser.deleteMany({});

    // 1. สร้าง Requester หลักสำหรับทดสอบเจ้าของตั๋ว
    const owner = await prisma.requesterUser.create({
      data: { name: "Test Owner", email: "owner@example.com", isActive: true },
    });
    requesterId = owner.id;

    // 2. สร้าง Requester สำรองสำหรับทดสอบกรณี Cross-requester (แอบอัปโหลดตั๋วคนอื่น)
    const other = await prisma.requesterUser.create({
      data: { name: "Other User", email: "other@example.com", isActive: true },
    });
    otherRequesterId = other.id;

    // 3. สร้าง Category และ RelatedSystem จำลองแบบใช้ upsert ป้องกันชื่อซ้ำ
    const category = await prisma.category.upsert({
      where: { name: "Test Category Attachment" },
      update: {},
      create: { name: "Test Category Attachment" },
    });
    
    const system = await prisma.relatedSystem.upsert({
      where: { name: "Test System Attachment" },
      update: {},
      create: { name: "Test System Attachment" },
    });

    // 4. สร้าง Ticket สำหรับทดสอบอัปโหลดไฟล์
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: "TKT-2026-0001",
        requesterId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Test ticket for attachments validation",
        description: "This is a long enough description for testing purposes.",
        requestedPriority: "MEDIUM",
        currentStatus: "NEW",
      },
    });
    testTicketId = ticket.id;
  });

  it("API-18 & API-19: uploads a valid attachment successfully (201)", async () => {
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", requesterId.toString())
      .attach("file", Buffer.from("fake image content"), {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.originalFilename).toBe("screenshot.png");
    expect(response.body.ticketId).toBe(testTicketId);
  });

  it("returns 401 Unauthorized if X-Requester-Id header is missing", async () => {
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .attach("file", Buffer.from("dummy data"), "test.png");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 Not Found if ticket does not exist or unauthorized (Cross-requester block)", async () => {
    // พยายามเอาไฟล์ไปแนบตั๋วของคนอื่นโดยใช้ Header ของตนเอง
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", otherRequesterId.toString())
      .attach("file", Buffer.from("dummy data"), "test.png");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 if no file is attached in the request", async () => {
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", requesterId.toString());

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("API-18: returns 413 if the file exceeds the 5 MB limit", async () => {
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, "a");
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", requesterId.toString())
      .attach("file", largeBuffer, "large.png");

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("API-19: returns 400 if the file type is unsupported", async () => {
    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", requesterId.toString())
      .attach("file", Buffer.from("dummy data"), "test.txt");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("API-20: returns 409 if the ticket already has 5 active attachments", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post(`/api/tickets/${testTicketId}/attachments`)
        .set("X-Requester-Id", requesterId.toString())
        .attach("file", Buffer.from("fake data"), `file${i}.png`);
    }

    const response = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", requesterId.toString())
      .attach("file", Buffer.from("dummy data"), "file6.png");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");
  });
});