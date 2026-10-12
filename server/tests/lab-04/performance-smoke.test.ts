import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";
import { setDashboardClockForTests } from "../../src/routes/dashboards.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "Lab4PerformanceSmokePassword1!";
const namespace = "PERF-L4-SMOKE";
const requesterEmail = "perf-l4-smoke-requester@example.test";
const staffEmail = "perf-l4-smoke-staff@example.test";
const asOf = new Date("2026-10-10T12:00:00.000Z");
const recent = new Date("2026-10-09T12:00:00.000Z");
const older = new Date("2026-10-02T12:00:00.000Z");

let requester: any;
let staff: any;
let category: any;
let relatedSystem: any;
let tickets: any[] = [];
let actionTicket: any;
let countingQueries = false;
let queryCount = 0;

async function cleanupFixture() {
  const fixtureTickets = await prisma.ticket.findMany({
    where: { ticketNumber: { startsWith: `TKT-${namespace}-` } },
    select: { id: true },
  });
  const ticketIds = fixtureTickets.map((ticket) => ticket.id);
  if (ticketIds.length) {
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  }
  await prisma.category.deleteMany({ where: { name: `Category ${namespace}` } });
  await prisma.relatedSystem.deleteMany({ where: { name: `System ${namespace}` } });
  await prisma.user.deleteMany({ where: { email: { in: [requesterEmail, staffEmail] } } });
}

async function createTicket(index: number, status: any, updatedAt = recent) {
  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber: `TKT-${namespace}-${String(index).padStart(3, "0")}`,
      requesterId: requester.id,
      categoryId: category.id,
      relatedSystemId: relatedSystem.id,
      summary: `${namespace} Ticket ${index}`,
      description: "Dedicated deterministic performance smoke fixture.",
      currentStatus: status,
      requestedPriority: ["LOW", "MEDIUM", "HIGH"][index % 3] as any,
      itPriority: ["LOW", "MEDIUM", "HIGH"][index % 3] as any,
      assignedToUserId: index % 2 === 0 ? staff.id : null,
      updatedAt,
      ...(status === "RESOLVED" ? { resolvedAt: recent } : {}),
    },
  });
  tickets.push(ticket);
  return ticket;
}

async function dashboardQueryCount(agent: any) {
  queryCount = 0;
  countingQueries = true;
  try {
    const response = await agent.get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    return { response, queries: queryCount };
  } finally {
    countingQueries = false;
  }
}

beforeAll(async () => {
  await cleanupFixture();
  const passwordHash = await hashPassword(password);
  requester = await prisma.user.create({ data: { name: "Performance Smoke Requester", email: requesterEmail, role: "REQUESTER", passwordHash, mustChangePassword: false } });
  staff = await prisma.user.create({ data: { name: "Performance Smoke Staff", email: staffEmail, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
  category = await prisma.category.create({ data: { name: `Category ${namespace}` } });
  relatedSystem = await prisma.relatedSystem.create({ data: { name: `System ${namespace}` } });

  for (const [index, status] of ["OPEN", "OPEN", "WAITING_FOR_REQUESTER", "WAITING_FOR_REQUESTER", ...Array(6).fill("RESOLVED"), "CLOSED", "CANCELLED"].entries()) {
    await createTicket(index, status, index >= 10 ? older : recent);
  }
  actionTicket = tickets[0];
  await prisma.actionTaken.createMany({
    data: Array.from({ length: 25 }, (_, index) => ({
      ticketId: actionTicket.id,
      actionDateTime: new Date(recent.getTime() + index),
      actionDescription: `${namespace} Action ${index}`,
      createdById: staff.id,
      status: "DRAFT" as any,
      followUpRequired: false,
      requestKey: `${namespace.toLowerCase()}-action-${index}`,
    })),
  });
  (prisma as any).$on("query", () => {
    if (countingQueries) queryCount += 1;
  });
  setDashboardClockForTests(() => new Date(asOf));
});

afterEach(() => setDashboardClockForTests(() => new Date(asOf)));

afterAll(async () => {
  setDashboardClockForTests();
  await cleanupFixture();
});

describe("Lab 4 deterministic performance smoke", () => {
  it("keeps requester dashboard query growth independent of fixture row count while counts and capped previews remain correct", async () => {
    const { agent } = await authenticatedAgent(requesterEmail, password);
    const small = await dashboardQueryCount(agent);
    expect(small.response.body.metrics.openTickets.count).toBe(4);
    expect(small.response.body.metrics.waitingForRequester.count).toBe(2);
    expect(small.response.body.metrics.recentlyUpdated.count).toBe(10);
    expect(small.response.body.metrics.recentlyResolved.count).toBe(6);
    expect(small.response.body.attentionRequired).toHaveLength(2);
    expect(small.response.body.recentTickets).toHaveLength(5);
    expect(small.response.body.resolvedTickets).toHaveLength(5);

    for (const [offset, status] of [...Array(6).fill("OPEN"), ...Array(6).fill("WAITING_FOR_REQUESTER"), ...Array(6).fill("IN_PROGRESS")].entries()) {
      await createTicket(12 + offset, status);
    }

    const large = await dashboardQueryCount(agent);
    expect(large.response.body.metrics.openTickets.count).toBe(22);
    expect(large.response.body.metrics.waitingForRequester.count).toBe(8);
    expect(large.response.body.metrics.recentlyUpdated.count).toBe(28);
    expect(large.response.body.metrics.recentlyResolved.count).toBe(6);
    expect(large.response.body.attentionRequired).toHaveLength(5);
    expect(large.response.body.recentTickets).toHaveLength(5);
    expect(large.response.body.resolvedTickets).toHaveLength(5);
    expect(small.queries).toBe(12);
    expect(large.queries).toBe(small.queries);
  });

  it("keeps requester, staff, and Action list responses paginated at their documented bounds", async () => {
    const requesterSession = await authenticatedAgent(requesterEmail, password);
    const requesterList = await requesterSession.agent.get("/api/tickets");
    expect(requesterList.status).toBe(200);
    expect(requesterList.body.data).toHaveLength(10);
    expect(requesterList.body.meta).toMatchObject({ page: 1, pageSize: 10, totalItems: 30, totalPages: 3 });
    expect((await requesterSession.agent.get("/api/tickets").query({ pageSize: 100 })).status).toBe(400);

    const actions = await requesterSession.agent.get(`/api/tickets/${actionTicket.id}/actions-taken`).query({ page: 1, pageSize: 20 });
    expect(actions.status).toBe(200);
    expect(actions.body.items).toHaveLength(20);
    expect(actions.body).toMatchObject({ page: 1, pageSize: 20, totalItems: 25, totalPages: 2 });
    const actionPageTwo = await requesterSession.agent.get(`/api/tickets/${actionTicket.id}/actions-taken`).query({ page: 2, pageSize: 20 });
    expect(actionPageTwo.status).toBe(200);
    expect(actionPageTwo.body.items).toHaveLength(5);
    expect((await requesterSession.agent.get(`/api/tickets/${actionTicket.id}/actions-taken`).query({ pageSize: 101 })).status).toBe(422);

    const staffSession = await authenticatedAgent(staffEmail, password);
    const staffList = await staffSession.agent.get("/api/staff/tickets").query({ search: namespace, page: 1, pageSize: 20 });
    expect(staffList.status).toBe(200);
    expect(staffList.body.items).toHaveLength(20);
    expect(staffList.body).toMatchObject({ page: 1, pageSize: 20, totalItems: 30, totalPages: 2 });
    expect((await staffSession.agent.get("/api/staff/tickets").query({ search: namespace, pageSize: 101 })).status).toBe(422);
  });

  it("keeps the health endpoint at its existing safe payload", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", service: "TokTickIT API" });
  });
});
