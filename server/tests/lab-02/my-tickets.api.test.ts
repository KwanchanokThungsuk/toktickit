import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "./auth-helper.js";

const password = "Regression Password 1";
describe("My Tickets API", () => {
  const prisma = getPrisma(); let a: { id: number; email: string }; let b: { id: number; email: string }; let categoryId: number; let systemId: number; let suffix: string;
  let ticketNumbers: string[]; let ticketIds: number[] = []; let extraCategoryIds: number[] = []; let extraSystemIds: number[] = [];
  beforeEach(async () => {
    suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    ticketNumbers = [`TKT-MY-${suffix}-1`, `TKT-MY-${suffix}-2`, `TKT-MY-${suffix}-3`, `TKT-MY-${suffix}-4`, `TKT-MY-${suffix}-5`, `TKT-MY-${suffix}-6`];
    const category = await prisma.category.create({ data: { name: `Hardware ${suffix}`, isActive: true } }); const system = await prisma.relatedSystem.create({ data: { name: `Campus Wi-Fi ${suffix}`, isActive: true } }); categoryId = category.id; systemId = system.id;
    a = await prisma.user.create({ data: { name: "Requester A", email: `tickets-a-${suffix}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } }); b = await prisma.user.create({ data: { name: "Requester B", email: `tickets-b-${suffix}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } });
  });
  afterEach(async () => {
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [a?.id, b?.id].filter(Boolean) as number[] } } });
    await prisma.category.deleteMany({ where: { id: { in: [categoryId, ...extraCategoryIds].filter(Boolean) } } });
    await prisma.relatedSystem.deleteMany({ where: { id: { in: [systemId, ...extraSystemIds].filter(Boolean) } } });
    ticketIds = []; extraCategoryIds = []; extraSystemIds = [];
  });
  async function ticket(requesterId: number, ticketNumber: string, summary: string, options: { categoryId?: number; relatedSystemId?: number; requestedPriority?: "LOW" | "MEDIUM" | "HIGH" } = {}) { const created = await prisma.ticket.create({ data: { ticketNumber, requesterId, categoryId, relatedSystemId: systemId, summary, description: "This is a test ticket description for My Tickets API.", requestedPriority: "MEDIUM", currentStatus: "NEW", ...options } }); ticketIds.push(created.id); return created; }
  it("returns only the authenticated requester's tickets", async () => { await ticket(a.id, ticketNumbers[0], "A cannot connect to Wi-Fi"); await ticket(b.id, ticketNumbers[1], "B cannot access email"); const { agent } = await authenticatedAgent(a.email, password); const res = await agent.get("/api/tickets"); expect(res.status).toBe(200); expect(res.body.meta.totalItems).toBe(1); expect(res.body.data[0].ticketNumber).toBe(ticketNumbers[0]); });
  it("isolates requester B from requester A", async () => { await ticket(a.id, ticketNumbers[2], "A private ticket"); await ticket(b.id, ticketNumbers[3], "B private ticket"); const { agent } = await authenticatedAgent(b.email, password); const res = await agent.get("/api/tickets"); expect(res.status).toBe(200); expect(res.body.data.map((x: any) => x.ticketNumber)).toEqual([ticketNumbers[3]]); });
  it("supports case-insensitive search and pagination", async () => { await ticket(a.id, ticketNumbers[4], "Cannot connect to Campus WiFi"); await ticket(a.id, ticketNumbers[5], "Printer is not working"); const { agent } = await authenticatedAgent(a.email, password); const search = await agent.get("/api/tickets").query({ search: "CAMPUS WIFI" }); expect(search.status).toBe(200); expect(search.body.data[0].ticketNumber).toBe(ticketNumbers[4]); const page = await agent.get("/api/tickets").query({ page: 1, pageSize: 10 }); expect(page.status).toBe(200); expect(page.body.meta.pageSize).toBe(10); });
  it("searches by ticket number and returns empty results", async () => { await ticket(a.id, ticketNumbers[4], "Searchable summary"); const { agent } = await authenticatedAgent(a.email, password); const found = await agent.get("/api/tickets").query({ search: ticketNumbers[4].toLowerCase() }); const empty = await agent.get("/api/tickets").query({ search: "no-match" }); expect(found.status).toBe(200); expect(found.body.data[0].ticketNumber).toBe(ticketNumbers[4]); expect(empty.status).toBe(200); expect(empty.body.data).toEqual([]); expect(empty.body.meta.totalPages).toBe(0); });
  it("rejects invalid query and status values after authentication", async () => { const { agent } = await authenticatedAgent(a.email, password); for (const query of [{ pageSize: 1 }, { page: 0 }, { sortBy: "invalid" }, { currentStatus: "CLOSED" }]) { const response = await agent.get("/api/tickets").query(query); expect(response.status).toBe(400); expect(response.body.error.code).toBe("INVALID_QUERY"); } });
  it("paginates 11 tickets with complete metadata and disjoint pages", async () => { for (let i = 0; i < 11; i += 1) await ticket(a.id, `TKT-MY-${Date.now()}-${i}`, `Pagination ticket ${i}`); const { agent } = await authenticatedAgent(a.email, password); const first = await agent.get("/api/tickets").query({ page: 1, pageSize: 10 }); const second = await agent.get("/api/tickets").query({ page: 2, pageSize: 10 }); expect(first.status).toBe(200); expect(second.status).toBe(200); expect(first.body.data).toHaveLength(10); expect(second.body.data).toHaveLength(1); expect(first.body.meta).toMatchObject({ page: 1, pageSize: 10, totalItems: 11, totalPages: 2 }); expect(second.body.meta.page).toBe(2); expect(first.body.data.map((x: any) => x.id)).not.toEqual(expect.arrayContaining(second.body.data.map((x: any) => x.id))); });
  it("sorts by ticket number in the requested order", async () => { const low = `TKT-MY-${suffix}-008`; const mid = `TKT-MY-${suffix}-009`; const high = `TKT-MY-${suffix}-010`; await ticket(a.id, high, "Ticket C"); await ticket(a.id, low, "Ticket A"); await ticket(a.id, mid, "Ticket B"); const { agent } = await authenticatedAgent(a.email, password); const response = await agent.get("/api/tickets").query({ sortBy: "ticketNumber", sortOrder: "asc" }); expect(response.status).toBe(200); expect(response.body.data.map((x: any) => x.ticketNumber)).toEqual([low, mid, high]); });
  it("filters currentStatus=NEW and rejects unsupported status", async () => { const number = `TKT-MY-${suffix}-status`; await ticket(a.id, number, "New ticket"); const { agent } = await authenticatedAgent(a.email, password); const valid = await agent.get("/api/tickets").query({ currentStatus: "NEW" }); const invalid = await agent.get("/api/tickets").query({ currentStatus: "CLOSED" }); expect(valid.status).toBe(200); expect(valid.body.data.map((x: any) => x.ticketNumber)).toContain(number); expect(invalid.status).toBe(400); });
  it("filters category, related system, priority, and all conditions together", async () => {
    const otherCategory = await prisma.category.create({ data: { name: `Other Category ${suffix}`, isActive: true } });
    const otherSystem = await prisma.relatedSystem.create({ data: { name: `Other System ${suffix}`, isActive: true } });
    extraCategoryIds.push(otherCategory.id); extraSystemIds.push(otherSystem.id);
    const match = `TKT-MY-${suffix}-match`;
    const categoryOnly = `TKT-MY-${suffix}-category`;
    const systemOnly = `TKT-MY-${suffix}-system`;
    const priorityOnly = `TKT-MY-${suffix}-priority`;
    await ticket(a.id, match, "Matching ticket", { categoryId: otherCategory.id, relatedSystemId: otherSystem.id, requestedPriority: "HIGH" });
    await ticket(a.id, categoryOnly, "Category ticket", { categoryId: otherCategory.id, requestedPriority: "HIGH" });
    await ticket(a.id, systemOnly, "System ticket", { relatedSystemId: otherSystem.id, requestedPriority: "HIGH" });
    await ticket(a.id, priorityOnly, "Priority ticket", { categoryId: otherCategory.id, relatedSystemId: otherSystem.id, requestedPriority: "LOW" });
    const { agent } = await authenticatedAgent(a.email, password);
    const category = await agent.get("/api/tickets").query({ categoryId: otherCategory.id });
    const system = await agent.get("/api/tickets").query({ relatedSystemId: otherSystem.id });
    const priority = await agent.get("/api/tickets").query({ requestedPriority: "HIGH" });
    expect(category.status).toBe(200); expect(category.body.data.map((x: any) => x.ticketNumber)).toEqual(expect.arrayContaining([match, categoryOnly, priorityOnly])); expect(category.body.data.map((x: any) => x.ticketNumber)).not.toContain(systemOnly);
    expect(system.status).toBe(200); expect(system.body.data.map((x: any) => x.ticketNumber)).toEqual(expect.arrayContaining([match, systemOnly, priorityOnly])); expect(system.body.data.map((x: any) => x.ticketNumber)).not.toContain(categoryOnly);
    expect(priority.status).toBe(200); expect(priority.body.data.map((x: any) => x.ticketNumber)).toEqual(expect.arrayContaining([match, categoryOnly, systemOnly])); expect(priority.body.data.map((x: any) => x.ticketNumber)).not.toContain(priorityOnly);
    const combined = await agent.get("/api/tickets").query({ categoryId: otherCategory.id, relatedSystemId: otherSystem.id, requestedPriority: "HIGH" });
    expect(combined.status).toBe(200); expect(combined.body.data.map((x: any) => x.ticketNumber)).toEqual([match]);
  });
});
