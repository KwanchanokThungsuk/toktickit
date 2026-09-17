import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();

describe("GET /api/categories includes the required seeded categories in deterministic relative order", () => {
  beforeEach(async () => {
    for (const name of ["Account and Access", "Hardware", "Software", "Network"]) {
      await prisma.category.upsert({ where: { name }, update: { isActive: true }, create: { name, isActive: true } });
    }
  });

  it("returns all required seeded categories in id order relative to one another", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);

    const required = [
      "Account and Access", "Hardware", "Software", "Network",
    ];
    const names = res.body.map((category: { name: string }) => category.name);
    expect(names).toEqual(expect.arrayContaining(required));
    expect(names.filter((name: string) => required.includes(name))).toEqual(required);
  });
});
