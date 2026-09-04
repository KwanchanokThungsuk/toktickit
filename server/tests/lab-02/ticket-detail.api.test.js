import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app.ts";
import { getPrisma } from "../../src/prisma.ts";

describe("Requester Ticket Detail API", () => {
  const prisma = getPrisma();
  let requesterA;
  let requesterB;
  let ticket;

  beforeEach(async () => {
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.requesterUser.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.relatedSystem.deleteMany({});
    const category = await prisma.category.create({ data: { name: "Hardware", isActive: true } });
    const system = await prisma.relatedSystem.create({ data: { name: "Laptop", isActive: true } });
    requesterA = await prisma.requesterUser.create({ data: { name: "Requester A", email: "detail-a@example.com", isActive: true } });
    requesterB = await prisma.requesterUser.create({ data: { name: "Requester B", email: "detail-b@example.com", isActive: true } });
    ticket = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-900001", requesterId: requesterA.id, categoryId: category.id, relatedSystemId: system.id, summary: "Private ticket", description: "A private ticket description.", requestedPriority: "MEDIUM", currentStatus: "NEW" } });
  });

  it("returns an owned ticket", async () => {
    const response = await request(app).get(`/api/tickets/${ticket.id}`).set("X-Requester-Id", String(requesterA.id));
    expect(response.status).toBe(200);
    expect(response.body.ticketNumber).toBe(ticket.ticketNumber);
  });

  it("returns 403 without exposing another requester's ticket", async () => {
    const response = await request(app).get(`/api/tickets/${ticket.id}`).set("X-Requester-Id", String(requesterB.id));
    expect(response.status).toBe(403);
    expect(response.body.ticketNumber).toBeUndefined();
  });

  it("returns 404 for a nonexistent ticket", async () => {
    const response = await request(app).get("/api/tickets/999999").set("X-Requester-Id", String(requesterA.id));
    expect(response.status).toBe(404);
  });
});