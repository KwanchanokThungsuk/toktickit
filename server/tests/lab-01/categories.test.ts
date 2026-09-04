import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("GET /api/categories", () => {
  beforeEach(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.category.deleteMany({});

    await prisma.category.createMany({
      data: [
        { name: "Account and Access", isActive: true },
        { name: "Hardware", isActive: true },
        { name: "Software", isActive: true },
        { name: "Network", isActive: true },
      ],
    });
  });

  it("returns the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);

    expect(res.body).toHaveLength(4);

    expect(res.body.map((category: { name: string }) => category.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});