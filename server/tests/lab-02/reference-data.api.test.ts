import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("GET /api/requesters", () => {
  beforeEach(async () => {
    const prisma = getPrisma();
    
    // เคลียร์ข้อมูลที่อาจตีกับเทสต์อื่น แล้วสร้างข้อมูลจำลองให้ตรงกับที่โจทย์แล็บต้องการเป๊ะๆ (Active 4 คน, Inactive 1 คน)
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.requesterUser.deleteMany({});

    // สร้าง Active Requesters 4 คนตาม requirement
    for (let i = 1; i <= 4; i++) {
      await prisma.requesterUser.create({
        data: { name: `Active User ${i}`, email: `active${i}@example.com`, isActive: true },
      });
    }
    // สร้าง Inactive Requester 1 คน เพื่อทดสอบว่าระบบกรองออกจริงไหม
    await prisma.requesterUser.create({
      data: { name: "Inactive User", email: "inactive@example.com", isActive: false },
    });
  });

  it("returns only active requesters with id, name, and email (Test API-06)", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);

    // Lab requires at least 4 active requesters
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    // Inactive requester must not appear
    expect(
      res.body.some(
        (requester: { name: string }) => requester.name === "Inactive User"
      )
    ).toBe(false);

    for (const requester of res.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");
    }
  });
});