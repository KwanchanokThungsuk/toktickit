import { afterEach, describe, it, expect, beforeEach } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent, csrfHeaders } from "./auth-helper.js";

const prisma = getPrisma();

let validPayload: { categoryId: number; relatedSystemId: number; summary: string; description: string; requestedPriority: string };
const password = "Regression Password 1";

describe("Create Ticket API", () => {
  let email: string;
  let userId: number | undefined;
  let categoryId: number | undefined;
  let relatedSystemId: number | undefined;
  let ticketId: number | undefined;
  beforeEach(async () => {
    const prisma = getPrisma();
    const suffix = Date.now().toString();
    const category = await prisma.category.create({ data: { name: `Create Ticket Category ${suffix}`, isActive: true } });
    const system = await prisma.relatedSystem.create({ data: { name: `Create Ticket System ${suffix}`, isActive: true } });
    categoryId = category.id;
    relatedSystemId = system.id;
    validPayload = { categoryId: category.id, relatedSystemId: system.id, summary: "Cannot connect to campus Wi-Fi", description: "The connection drops immediately after entering password and won't reconnect.", requestedPriority: "HIGH" };
    email = `create-${suffix}@example.com`;
    userId = (await prisma.user.create({ data: { name: "Create Requester", email, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } })).id;
  });
  afterEach(async () => {
    if (ticketId) await prisma.ticket.deleteMany({ where: { id: ticketId } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
    if (relatedSystemId) await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
    ticketId = userId = categoryId = relatedSystemId = undefined;
  });

  it("rejects missing summary after authentication", async () => {
    const { agent, csrfToken } = await authenticatedAgent(email, password);
    const res = await agent.post("/api/tickets").set(csrfHeaders(csrfToken)).send({ ...validPayload, summary: "" });
    expect(res.status).toBe(422); expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a summary under 10 characters after authentication", async () => {
    const { agent, csrfToken } = await authenticatedAgent(email, password);
    const res = await agent.post("/api/tickets").set(csrfHeaders(csrfToken)).send({ ...validPayload, summary: "Too short" });
    expect(res.status).toBe(422); expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("creates a valid ticket for the authenticated requester", async () => {
    const { agent, csrfToken } = await authenticatedAgent(email, password);
    const res = await agent.post("/api/tickets").set(csrfHeaders(csrfToken)).send(validPayload);
    expect(res.status).toBe(201); expect(res.body).toHaveProperty("ticketNumber"); expect(res.body.currentStatus).toBe("NEW");
    ticketId = (await getPrisma().ticket.findUniqueOrThrow({ where: { ticketNumber: res.body.ticketNumber }, select: { id: true } })).id;
    const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
    expect(res.body.requesterId).toBe(user.id);
  });
});
