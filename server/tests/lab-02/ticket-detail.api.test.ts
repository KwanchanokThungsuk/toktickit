import { beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "./auth-helper.js";

const password = "Regression Password 1";
describe("Requester Ticket Detail API", () => {
  const prisma = getPrisma(); let a: { id: number; email: string }; let b: { id: number; email: string }; let ticket: { id: number; ticketNumber: string };
  beforeEach(async () => {
    const suffix = Date.now().toString();
    const category = await prisma.category.create({ data: { name: `Hardware ${suffix}`, isActive: true } }); const system = await prisma.relatedSystem.create({ data: { name: `Laptop ${suffix}`, isActive: true } });
    a = await prisma.user.create({ data: { name: "Requester A", email: `detail-a-${Date.now()}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } });
    b = await prisma.user.create({ data: { name: "Requester B", email: `detail-b-${Date.now()}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } });
    ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-DETAIL-${suffix}`, requesterId: a.id, categoryId: category.id, relatedSystemId: system.id, summary: "Private ticket", description: "A private ticket description.", requestedPriority: "MEDIUM", currentStatus: "NEW" } });
  });
  it("returns an owned ticket", async () => { const { agent } = await authenticatedAgent(a.email, password); const response = await agent.get(`/api/tickets/${ticket.id}`); expect(response.status).toBe(200); expect(response.body.ticketNumber).toBe(ticket.ticketNumber); });
  it("does not expose another requester's ticket", async () => { const { agent } = await authenticatedAgent(b.email, password); const response = await agent.get(`/api/tickets/${ticket.id}`); expect(response.status).toBe(404); expect(response.body.ticketNumber).toBeUndefined(); });
  it("returns 404 for a nonexistent ticket", async () => { const { agent } = await authenticatedAgent(a.email, password); expect((await agent.get("/api/tickets/999999")).status).toBe(404); });
});
