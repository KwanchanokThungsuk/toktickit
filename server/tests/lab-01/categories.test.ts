import { afterEach, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const prisma = getPrisma();
const requiredNames = ["Account and Access", "Hardware", "Software", "Network"];
const createdCategoryIds: number[] = [];
const previousActiveStates = new Map<number, boolean>();

describe("GET /api/categories includes the required seeded categories in deterministic relative order", () => {
  beforeEach(async () => {
    for (const name of requiredNames) {
      const existing = await prisma.category.findUnique({ where: { name }, select: { id: true, isActive: true } });
      if (existing) {
        previousActiveStates.set(existing.id, existing.isActive);
        await prisma.category.update({ where: { id: existing.id }, data: { isActive: true } });
      } else {
        const created = await prisma.category.create({ data: { name, isActive: true } });
        createdCategoryIds.push(created.id);
      }
    }
  });
  afterEach(async () => {
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds.splice(0) } } });
    for (const [id, isActive] of previousActiveStates.entries()) {
      await prisma.category.update({ where: { id }, data: { isActive } });
    }
    previousActiveStates.clear();
  });

  it("returns all required seeded categories in id order relative to one another", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);

    const required = [
      ...requiredNames,
    ];
    const names = res.body.map((category: { name: string }) => category.name);
    expect(names).toEqual(expect.arrayContaining(required));
    expect(names.filter((name: string) => required.includes(name))).toEqual(required);
  });
});
