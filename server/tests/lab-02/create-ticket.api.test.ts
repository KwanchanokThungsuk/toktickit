import { describe, it, expect, beforeEach } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent, csrfHeaders } from "./auth-helper.js";

let validPayload: { categoryId: number; relatedSystemId: number; summary: string; description: string; requestedPriority: string };
const password = "Regression Password 1";

describe("Create Ticket API", () => {
  let email: string;
  beforeEach(async () => {
    const prisma = getPrisma();
    const suffix = Date.now().toString();
    const category = await prisma.category.create({ data: { name: `Create Ticket Category ${suffix}`, isActive: true } });
    const system = await prisma.relatedSystem.create({ data: { name: `Create Ticket System ${suffix}`, isActive: true } });
    validPayload = { categoryId: category.id, relatedSystemId: system.id, summary: "Cannot connect to campus Wi-Fi", description: "The connection drops immediately after entering password and won't reconnect.", requestedPriority: "HIGH" };
    email = `create-${suffix}@example.com`;
    await prisma.user.create({ data: { name: "Create Requester", email, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } });
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
    const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
    expect(res.body.requesterId).toBe(user.id);
  });
});
