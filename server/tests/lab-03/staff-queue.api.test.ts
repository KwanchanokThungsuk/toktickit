import request from "supertest";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "QueueTestPassword1!";
let requester: { id: number; email: string };
let staff: { id: number; email: string };
let admin: { id: number; email: string };
let categoryId: number;
let relatedSystemId: number;
const ticketIds: number[] = [];
let fixtureSearch = "";

describe("Issue #19 Staff Ticket Queue", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    fixtureSearch = `TKT-QUEUE-${suffix}`;
    const passwordHash = await hashPassword(password);
    requester = await prisma.user.create({ data: { name: "Queue Requester", email: `queue-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } });
    staff = await prisma.user.create({ data: { name: "Queue Staff", email: `queue-staff-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    admin = await prisma.user.create({ data: { name: "Queue Admin", email: `queue-admin-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } });
    const category = await prisma.category.create({ data: { name: `Queue Category ${suffix}` } }); categoryId = category.id;
    const system = await prisma.relatedSystem.create({ data: { name: `Queue System ${suffix}` } }); relatedSystemId = system.id;
    for (const [index, data] of [
      { number: `TKT-QUEUE-${suffix}-1`, summary: "Email access issue", status: "OPEN" as const, priority: "HIGH" as const, assignedToUserId: staff.id },
      { number: `TKT-QUEUE-${suffix}-2`, summary: "Laptop network problem", status: "NEW" as const, priority: "LOW" as const, assignedToUserId: null },
      { number: `TKT-QUEUE-${suffix}-3`, summary: "VPN account request", status: "IN_PROGRESS" as const, priority: "MEDIUM" as const, assignedToUserId: staff.id },
    ].entries()) {
      const ticket = await prisma.ticket.create({ data: { ticketNumber: data.number, requesterId: requester.id, categoryId, relatedSystemId, summary: data.summary, description: "Queue fixture ticket description.", requestedPriority: data.priority, itPriority: data.priority, currentStatus: data.status, assignedToUserId: data.assignedToUserId, createdAt: new Date(Date.now() - (3 - index) * 1000), updatedAt: new Date(Date.now() - (3 - index) * 1000) } });
      ticketIds.push(ticket.id);
    }
  });
  afterAll(async () => { if (!requester) return; await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } }).catch(() => undefined); await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } }).catch(() => undefined); await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined); await prisma.relatedSystem.delete({ where: { id: relatedSystemId } }).catch(() => undefined); await prisma.user.deleteMany({ where: { id: { in: [requester.id, staff.id, admin.id] } } }).catch(() => undefined); });

  it("allows IT Staff and rejects unauthenticated, Requester, and Administrator callers", async () => {
    expect((await request(app).get("/api/staff/tickets")).status).toBe(401);
    await expect((await authenticatedAgent(requester.email, password)).agent.get("/api/staff/tickets")).resolves.toMatchObject({ status: 403 });
    await expect((await authenticatedAgent(admin.email, password)).agent.get("/api/staff/tickets")).resolves.toMatchObject({ status: 403 });
    await expect((await authenticatedAgent(staff.email, password)).agent.get("/api/staff/tickets")).resolves.toMatchObject({ status: 200 });
  });
  it("searches by ticket number and case-insensitive summary", async () => { const { agent } = await authenticatedAgent(staff.email, password); expect((await agent.get("/api/staff/tickets").query({ search: "queue-" })).body.items.length).toBe(3); expect((await agent.get("/api/staff/tickets").query({ search: "EMAIL ACCESS" })).body.items[0].summary).toBe("Email access issue"); });
  it("filters status and IT Priority", async () => { const { agent } = await authenticatedAgent(staff.email, password); expect((await agent.get("/api/staff/tickets").query({ status: "OPEN" })).body.items.every((item: any) => item.currentStatus === "OPEN")).toBe(true); expect((await agent.get("/api/staff/tickets").query({ itPriority: "LOW" })).body.items.every((item: any) => item.itPriority === "LOW")).toBe(true); });
  it("accepts the documented CANCELLED status", async () => { const { agent } = await authenticatedAgent(staff.email, password); const response = await agent.get("/api/staff/tickets").query({ status: "CANCELLED" }); expect(response.status).toBe(200); expect(response.body.items.every((item: any) => item.currentStatus === "CANCELLED")).toBe(true); });
  it("sorts, applies default ordering, and returns pagination metadata", async () => {
    const { agent } = await authenticatedAgent(staff.email, password);
    for (const sortBy of ["ticketNumber", "createdAt", "updatedAt"] as const) {
      const response = await agent.get("/api/staff/tickets").query({ sortBy, sortOrder: "asc", pageSize: 100 });
      expect(response.status).toBe(200);
      const values = response.body.items.map((item: any) => sortBy === "ticketNumber" ? item.ticketNumber : Date.parse(item[sortBy]));
      expect(values).toEqual([...values].sort((a, b) => a < b ? -1 : a > b ? 1 : 0));
      const descending = await agent.get("/api/staff/tickets").query({ sortBy, sortOrder: "desc", pageSize: 100 });
      expect(descending.status).toBe(200);
      const descendingValues = descending.body.items.map((item: any) => sortBy === "ticketNumber" ? item.ticketNumber : Date.parse(item[sortBy]));
      expect(descendingValues).toEqual([...descendingValues].sort((a, b) => a > b ? -1 : a < b ? 1 : 0));
    }
    const response = await agent.get("/api/staff/tickets").query({ page: 1, pageSize: 2 });
    expect(response.body.page).toBe(1);
    expect(response.body.pageSize).toBe(2);
    expect(response.body.totalItems).toBeGreaterThanOrEqual(3);
    expect(response.body.totalPages).toBe(Math.ceil(response.body.totalItems / response.body.pageSize));
    expect(response.body.items).toHaveLength(2);
    const defaultItems = response.body.items;
    for (let index = 1; index < defaultItems.length; index += 1) {
      const previous = defaultItems[index - 1];
      const current = defaultItems[index];
      expect(new Date(previous.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(current.updatedAt).getTime());
      if (previous.updatedAt === current.updatedAt) expect(previous.id).toBeLessThan(current.id);
    }
  });
  it("rejects invalid queue parameters and returns queue-safe fields", async () => { const { agent } = await authenticatedAgent(staff.email, password); for (const query of [{ page: "0" }, { pageSize: "101" }, { sortBy: "bad" }, { sortOrder: "sideways" }, { status: "INVALID" }, { itPriority: "INVALID" }]) expect((await agent.get("/api/staff/tickets").query(query)).status).toBe(422); const item = (await agent.get("/api/staff/tickets")).body.items[0]; expect(item).toEqual(expect.objectContaining({ id: expect.any(Number), ticketNumber: expect.any(String), summary: expect.any(String), requestedPriority: expect.any(String), itPriority: expect.any(String), currentStatus: expect.any(String) })); expect(item).not.toHaveProperty("description"); expect(item).not.toHaveProperty("internalNotes"); });
  it("represents assigned and unassigned tickets", async () => { const { agent } = await authenticatedAgent(staff.email, password); const items = (await agent.get("/api/staff/tickets")).body.items; expect(items.some((item: any) => item.assignedTo?.name === "Queue Staff")).toBe(true); expect(items.some((item: any) => item.assignedTo === null)).toBe(true); });
  it("supports page-size boundaries and empty pages", async () => { const { agent } = await authenticatedAgent(staff.email, password); const defaults = await agent.get("/api/staff/tickets").query({ search: fixtureSearch }); expect(defaults.body.pageSize).toBe(20); const one = await agent.get("/api/staff/tickets").query({ search: fixtureSearch, pageSize: 1 }); expect(one.status).toBe(200); expect(one.body.items).toHaveLength(1); const hundred = await agent.get("/api/staff/tickets").query({ search: fixtureSearch, pageSize: 100 }); expect(hundred.body.pageSize).toBe(100); expect(hundred.body.totalItems).toBeGreaterThanOrEqual(3); expect(hundred.body.totalPages).toBe(Math.ceil(hundred.body.totalItems / hundred.body.pageSize)); const beyond = await agent.get("/api/staff/tickets").query({ search: fixtureSearch, page: 999999, pageSize: 20 }); expect(beyond.body.items).toEqual([]); expect(beyond.body.totalItems).toBe(hundred.body.totalItems); expect(beyond.body.totalPages).toBe(Math.ceil(beyond.body.totalItems / beyond.body.pageSize)); });
  it("returns a valid empty queue result", async () => { const { agent } = await authenticatedAgent(staff.email, password); const response = await agent.get("/api/staff/tickets").query({ search: `no-such-queue-ticket-${Date.now()}` }); expect(response.status).toBe(200); expect(response.body.items).toEqual([]); expect(response.body.totalItems).toBe(0); expect(response.body.totalPages).toBe(0); });
  it("denies an Administrator even when assigned as Ticket Owner", async () => { await prisma.ticket.update({ where: { id: ticketIds[0] }, data: { assignedToUserId: admin.id } }); const { agent } = await authenticatedAgent(admin.email, password); await expect(agent.get("/api/staff/tickets")).resolves.toMatchObject({ status: 403 }); await prisma.ticket.update({ where: { id: ticketIds[0] }, data: { assignedToUserId: staff.id } }); });
});
