import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";
import { setDashboardClockForTests } from "../../src/routes/dashboards.js";

const prisma = getPrisma();
const password = "Lab4DashboardPassword1!";
let requester: any; let foreign: any; let staff: any; let admin: any; let category: any; let system: any;
let owned: any[] = []; let foreignTicket: any;

beforeAll(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`; const passwordHash = await hashPassword(password);
  [requester, foreign, staff, admin] = await Promise.all([
    prisma.user.create({ data: { name: "Dashboard Requester", email: `dash-r-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
    prisma.user.create({ data: { name: "Dashboard Foreign", email: `dash-f-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
    prisma.user.create({ data: { name: "Dashboard Staff", email: `dash-s-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } }),
    prisma.user.create({ data: { name: "Dashboard Admin", email: `dash-a-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } }),
  ]);
  category = await prisma.category.create({ data: { name: `Dashboard Category ${suffix}` } });
  system = await prisma.relatedSystem.create({ data: { name: `Dashboard System ${suffix}` } });
  for (const [i, status] of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"].entries()) {
    owned.push(await prisma.ticket.create({ data: { ticketNumber: `TKT-DASH-${suffix}-${i}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: `Dashboard ${i}`, description: "dashboard fixture", currentStatus: status as any, itPriority: i === 0 ? "HIGH" : "LOW" } }));
  }
  foreignTicket = await prisma.ticket.create({ data: { ticketNumber: `TKT-DASH-${suffix}-foreign`, requesterId: foreign.id, categoryId: category.id, relatedSystemId: system.id, summary: "Foreign", description: "dashboard fixture", currentStatus: "OPEN" } });
});

afterAll(async () => {
  const categoryTickets = category ? await prisma.ticket.findMany({ where: { categoryId: category.id }, select: { id: true } }) : [];
  const ids = [...owned.map(t => t.id), foreignTicket?.id, ...categoryTickets.map((ticket) => ticket.id)].filter(Boolean);
  if (ids.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ids } } });
  if (ids.length) await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  if (category) await prisma.category.delete({ where: { id: category.id } }); if (system) await prisma.relatedSystem.delete({ where: { id: system.id } });
  if (requester && foreign && staff && admin) await prisma.user.deleteMany({ where: { id: { in: [requester.id, foreign.id, staff.id, admin.id] } } });
});
afterEach(() => setDashboardClockForTests());

describe("Issue 31 dashboard contracts", () => {
  async function trackedTicket(data: any) {
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-DASH-EVIDENCE-${Date.now()}-${Math.random().toString(16).slice(2)}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Dashboard evidence fixture", description: "Dashboard evidence fixture", currentStatus: "NEW", ...data } });
    owned.push(ticket); return ticket;
  }
  async function executeTicketDrillDown(agent: any, drillDown: any) {
    const response = await agent.get(`/api${drillDown.destination}`).query(drillDown.query);
    expect(response.status).toBe(200);
    return response;
  }
  async function executeActionDrillDown(agent: any, drillDown: any) {
    const response = await agent.get(`/api${drillDown.destination}`).query(drillDown.query);
    expect(response.status).toBe(200);
    return response;
  }
  it("requires authentication for requester and staff dashboards", async () => {
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
    expect((await request(app).get("/api/staff/dashboard")).status).toBe(401);
    expect((await request(app).get("/api/staff/dashboard/actions").query({ completedFrom: "2026-10-01T00:00:00Z", completedTo: "2026-10-02T00:00:00Z" })).status).toBe(401);
  });

  it("rejects unauthenticated dashboard identity overrides", async () => {
    const requester = await request(app).get("/api/dashboard/requester").query({ requesterId: "1" });
    const staff = await request(app).get("/api/staff/dashboard").query({ userId: "1" });
    expect(requester.status).toBe(401);
    expect(staff.status).toBe(401);
  });

  it("requires authentication before validating action drill-down windows", async () => {
    const response = await request(app).get("/api/staff/dashboard/actions").query({ completedFrom: "2026-10-01T00:00:00Z" });
    expect(response.status).toBe(401);
  });

  it("scopes requester metrics to owned Tickets and includes every active status", async () => {
    const { agent } = await authenticatedAgent(requester.email, password);
    const response = await agent.get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    expect(response.body.metrics.openTickets.count).toBe(5);
    expect(response.body.metrics.waitingForRequester.count).toBe(1);
    expect(response.body.attentionRequired.every((t: any) => t.id !== foreignTicket.id)).toBe(true);
    expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
  });

  it("returns all staff status and priority buckets for the authenticated operator", async () => {
    const { agent } = await authenticatedAgent(staff.email, password);
    const response = await agent.get("/api/staff/dashboard");
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.metrics.byStatus).sort()).toEqual(["CANCELLED", "CLOSED", "IN_PROGRESS", "NEW", "OPEN", "REOPENED", "RESOLVED", "WAITING_FOR_REQUESTER"].sort());
    expect(Object.keys(response.body.metrics.byItPriority).sort()).toEqual(["HIGH", "LOW", "MEDIUM"].sort());
    expect(response.body.recentTickets.length).toBeLessThanOrEqual(5);
    expect(response.body.urgentTickets.every((t: any) => t.itPriority === "HIGH")).toBe(true);
  });

  it("enforces the authenticated requester dashboard query contract", async () => {
    const { agent } = await authenticatedAgent(requester.email, password);
    for (const query of [{ requesterId: "1" }, { userId: "1" }, { unsupported: "x" }, { userId: ["1", "2"] }]) {
      const response = await agent.get("/api/dashboard/requester").query(query);
      expect(response.status).toBe(400); expect(response.body.error.code).toBe("INVALID_QUERY");
    }
  });

  it("enforces authenticated staff and administrator dashboard query contracts", async () => {
    const staffSession = await authenticatedAgent(staff.email, password);
    for (const query of [{ userId: "1" }, { unsupported: "x" }, { userId: ["1", "2"] }]) {
      const response = await staffSession.agent.get("/api/staff/dashboard").query(query);
      expect(response.status).toBe(422); expect(response.body.error.code).toBe("INVALID_QUERY");
    }
    const adminSession = await authenticatedAgent(admin.email, password);
    const response = await adminSession.agent.get("/api/staff/dashboard").query({ userId: "1" });
    expect(response.status).toBe(422); expect(response.body.error.code).toBe("INVALID_QUERY");
  });

  it("enforces the authenticated Actions dashboard query matrix", async () => {
    const { agent } = await authenticatedAgent(staff.email, password);
    const base = { completedFrom: "2026-10-01T00:00:00Z", completedTo: "2026-10-02T00:00:00Z" };
    for (const query of [{ completedTo: base.completedTo }, { completedFrom: base.completedFrom }, { ...base, completedFrom: "2026-10-01" }, { ...base, completedFrom: "2026-10-03T00:00:00Z" }, { ...base, userId: "1" }, { ...base, performerId: "1" }, { ...base, page: "0" }, { ...base, pageSize: "101" }]) {
      const response = await agent.get("/api/staff/dashboard/actions").query(query);
      expect(response.status).toBe(422); expect(response.body.error.code).toBe("INVALID_QUERY");
    }
  });

  it("uses one deterministic seven-day window for dashboard responses", async () => {
    const fixed = new Date("2026-10-10T12:00:00.000Z");
    setDashboardClockForTests(() => new Date(fixed));
    const { agent } = await authenticatedAgent(requester.email, password);
    const response = await agent.get("/api/dashboard/requester");
    expect(response.status).toBe(200);
    expect(response.body.asOf).toBe(fixed.toISOString());
    expect(response.body.window).toEqual({ start: new Date(fixed.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: fixed.toISOString() });
  });

  it("uses injected time for requester updatedAt boundaries", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const lower = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
    const boundary = await prisma.user.create({ data: { name: "Clock Boundary Requester", email: `dash-clock-${Date.now()}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } });
    const times = [lower, new Date(lower.getTime() - 1), asOf, new Date(asOf.getTime() + 1)]; const rows: any[] = [];
    try {
      for (const [i, updatedAt] of times.entries()) rows.push(await prisma.ticket.create({ data: { ticketNumber: `TKT-CLOCK-${Date.now()}-${i}`, requesterId: boundary.id, categoryId: category.id, relatedSystemId: system.id, summary: `Clock updated ${i}`, description: "clock fixture", currentStatus: "NEW", updatedAt } }));
      const { agent } = await authenticatedAgent(boundary.email, password); setDashboardClockForTests(() => new Date(asOf)); const response = await agent.get("/api/dashboard/requester"); const drill = await agent.get(`/api${response.body.metrics.recentlyUpdated.drillDown.destination}`).query(response.body.metrics.recentlyUpdated.drillDown.query);
      expect(response.body.asOf).toBe(asOf.toISOString()); expect(response.body.metrics.recentlyUpdated.count).toBe(2); expect(drill.body.data.map((row: any) => row.id).sort()).toEqual([rows[0].id, rows[2].id].sort());
    } finally { if (rows.length) await prisma.ticket.deleteMany({ where: { id: { in: rows.map(row => row.id) } } }); await prisma.user.delete({ where: { id: boundary.id } }); }
  });


  it("returns zero metrics and empty previews for an empty requester", async () => {
    const empty = await prisma.user.create({ data: { name: "Empty Dashboard Requester", email: `dash-empty-${Date.now()}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } });
    try {
      const { agent } = await authenticatedAgent(empty.email, password); const response = await agent.get("/api/dashboard/requester");
      expect(response.status).toBe(200); expect(response.body.metrics.openTickets.count).toBe(0); expect(response.body.metrics.waitingForRequester.count).toBe(0); expect(response.body.metrics.recentlyUpdated.count).toBe(0); expect(response.body.metrics.recentlyResolved.count).toBe(0); expect(response.body.attentionRequired).toEqual([]); expect(response.body.recentTickets).toEqual([]); expect(response.body.resolvedTickets).toEqual([]);
    } finally { await prisma.user.delete({ where: { id: empty.id } }); }
  });

  it("includes only formal resolutions at the inclusive seven-day boundaries", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const lower = new Date(asOf.getTime() - 7 * 86400000);
    const user = await prisma.user.create({ data: { name: "Formal Resolution Boundary Requester", email: `dash-formal-resolution-${Date.now()}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }); const tickets: any[] = [];
    const make = async (label: string, resolvedAt: Date) => {
      const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-FORMAL-RES-${Date.now()}-${label}`, requesterId: user.id, categoryId: category.id, relatedSystemId: system.id, summary: label, description: "formal resolution boundary", currentStatus: "RESOLVED" } });
      const dated = await prisma.ticket.update({ where: { id: ticket.id }, data: { resolvedAt, updatedAt: new Date("2020-01-01T00:00:00.000Z") } }); tickets.push(dated); return dated;
    };
    try {
      const rows = [await make("A", lower), await make("B", new Date(lower.getTime() - 1)), await make("C", asOf), await make("D", new Date(asOf.getTime() + 1))];
      const { agent } = await authenticatedAgent(user.email, password); setDashboardClockForTests(() => new Date(asOf));
      const dashboard = await agent.get("/api/dashboard/requester"); const drill = await agent.get(`/api${dashboard.body.metrics.recentlyResolved.drillDown.destination}`).query(dashboard.body.metrics.recentlyResolved.drillDown.query);
      expect(dashboard.body.metrics.recentlyResolved.count).toBe(2); expect(drill.body.meta.totalItems).toBe(2); expect(drill.body.data.map((x: any) => x.id).sort((a: number, b: number) => a - b)).toEqual([rows[0].id, rows[2].id].sort((a, b) => a - b));
    } finally { if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(t => t.id) } } }); await prisma.user.delete({ where: { id: user.id } }); }
  });

  it("uses legacy updatedAt boundaries and excludes reopened Tickets from resolution evidence", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const lower = new Date(asOf.getTime() - 7 * 86400000);
    const user = await prisma.user.create({ data: { name: "Legacy Resolution Boundary Requester", email: `dash-legacy-resolution-${Date.now()}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }); const tickets: any[] = [];
    const make = async (label: string, status: any, resolvedAt: Date | null, updatedAt: Date) => {
      const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-LEGACY-RES-${Date.now()}-${label}`, requesterId: user.id, categoryId: category.id, relatedSystemId: system.id, summary: label, description: "legacy resolution boundary", currentStatus: status } });
      const dated = await prisma.ticket.update({ where: { id: ticket.id }, data: { resolvedAt, updatedAt } }); tickets.push(dated); return dated;
    };
    try {
      const rows = [await make("A", "RESOLVED", null, lower), await make("B", "CLOSED", null, new Date(lower.getTime() - 1)), await make("C", "RESOLVED", null, asOf), await make("D", "CLOSED", null, new Date(asOf.getTime() + 1))];
      const reopened = await make("REOPENED", "REOPENED", asOf, asOf);
      const { agent } = await authenticatedAgent(user.email, password); setDashboardClockForTests(() => new Date(asOf));
      const dashboard = await agent.get("/api/dashboard/requester"); const drill = await agent.get(`/api${dashboard.body.metrics.recentlyResolved.drillDown.destination}`).query(dashboard.body.metrics.recentlyResolved.drillDown.query);
      const expected = [rows[0].id, rows[2].id].sort((a, b) => a - b);
      expect(dashboard.body.metrics.recentlyResolved.count).toBe(2); expect(drill.body.meta.totalItems).toBe(2); expect(drill.body.data.map((x: any) => x.id).sort((a: number, b: number) => a - b)).toEqual(expected); expect(drill.body.data.map((x: any) => x.id)).not.toContain(reopened.id); expect(dashboard.body.resolvedTickets.map((x: any) => x.id)).not.toContain(reopened.id);
      expect(dashboard.body.resolvedTickets.filter((x: any) => expected.includes(x.id)).every((x: any) => x.resolutionTimeSource === "LEGACY_UPDATED_AT")).toBe(true);
    } finally { if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(t => t.id) } } }); await prisma.user.delete({ where: { id: user.id } }); }
  });

  it("uses staff updatedAt and completedAt boundaries", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"), lower = new Date(asOf.getTime() - 7 * 86400000); const user = await prisma.user.create({ data: { name: "Clock Boundary Staff", email: `dash-staff-clock-${Date.now()}@example.com`, role: "IT_STAFF", passwordHash: await hashPassword(password), mustChangePassword: false } }); const tickets:any[]=[];
    try {
      for (const [i,time] of [lower,new Date(lower.getTime()-1),asOf,new Date(asOf.getTime()+1)].entries()) tickets.push(await prisma.ticket.create({ data: { ticketNumber:`TKT-STF-${Date.now()}-${i}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary:`staff boundary ${i}`, description:"staff boundary", currentStatus:i%2?"CLOSED":"OPEN", updatedAt:time, assignedToUserId:user.id } }));
      const actions = await Promise.all([lower,new Date(lower.getTime()-1),asOf,new Date(asOf.getTime()+1)].map((completedAt,i)=>prisma.actionTaken.create({ data:{ ticketId:tickets[0].id, actionDescription:`clock action ${i}`, result:"done", createdById:user.id, performedById:user.id, status:"COMPLETED", followUpRequired:false, completedAt, requestKey:`clock-${Date.now()}-${i}` } })));
      const {agent}=await authenticatedAgent(user.email,password); setDashboardClockForTests(()=>new Date(asOf)); const dashboard=await agent.get("/api/staff/dashboard"); const recent=await agent.get(`/api${dashboard.body.metrics.recentlyUpdated.drillDown.destination}`).query(dashboard.body.metrics.recentlyUpdated.drillDown.query); const actionsDrill=await agent.get(`/api${dashboard.body.metrics.myActions.drillDown.destination}`).query(dashboard.body.metrics.myActions.drillDown.query);
      const allRecent = await agent.get(`/api${dashboard.body.metrics.recentlyUpdated.drillDown.destination}`).query({ ...dashboard.body.metrics.recentlyUpdated.drillDown.query, pageSize: 100 });
      const recentIds = allRecent.body.items.map((x: any) => x.id);
      expect(recent.status).toBe(200); expect(recentIds).toEqual(expect.arrayContaining([tickets[0].id, tickets[2].id])); expect(recentIds).not.toEqual(expect.arrayContaining([tickets[1].id, tickets[3].id])); expect(dashboard.body.metrics.myActions.count).toBe(2); expect(actionsDrill.body.totalItems).toBe(2); expect(actionsDrill.body.items.map((x:any)=>x.id).sort()).toEqual([actions[0].id,actions[2].id].sort()); expect(dashboard.body.myRecentActions.map((x: any) => x.id).sort()).toEqual([actions[0].id, actions[2].id].sort());
    } finally { if(tickets.length) await prisma.actionTaken.deleteMany({where:{ticketId:{in:tickets.map(t=>t.id)}}}); if(tickets.length) await prisma.ticket.deleteMany({where:{id:{in:tickets.map(t=>t.id)}}}); await prisma.user.delete({where:{id:user.id}}); }
  });

  it("separates Staff Ticket ownership from Action performer identity", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z");
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const [fixtureRequester, staffA, staffB] = await Promise.all([
      prisma.user.create({ data: { name: "Owner Performer Requester", email: `dash-owner-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Owner Performer Staff A", email: `dash-owner-a-${suffix}@example.com`, role: "IT_STAFF", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Owner Performer Staff B", email: `dash-owner-b-${suffix}@example.com`, role: "IT_STAFF", passwordHash: await hashPassword(password), mustChangePassword: false } }),
    ]);
    const tickets: any[] = [];
    try {
      const ownedByA = await prisma.ticket.create({ data: { ticketNumber: `TKT-OWNER-A-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Assigned to Staff A", description: "identity fixture", currentStatus: "OPEN", assignedToUserId: staffA.id } });
      const ownedByB = await prisma.ticket.create({ data: { ticketNumber: `TKT-OWNER-B-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Assigned to Staff B", description: "identity fixture", currentStatus: "OPEN", assignedToUserId: staffB.id } });
      tickets.push(ownedByA, ownedByB);
      const [performedByB, performedByA] = await Promise.all([
        prisma.actionTaken.create({ data: { ticketId: ownedByA.id, actionDescription: "Action by Staff B", result: "done", createdById: staffB.id, performedById: staffB.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `owner-action-b-${suffix}` } }),
        prisma.actionTaken.create({ data: { ticketId: ownedByB.id, actionDescription: "Action by Staff A", result: "done", createdById: staffA.id, performedById: staffA.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `owner-action-a-${suffix}` } }),
      ]);
      setDashboardClockForTests(() => new Date(asOf));
      const { agent } = await authenticatedAgent(staffA.email, password); const dashboard = await agent.get("/api/staff/dashboard");
      const ticketsDrill = await agent.get(`/api${dashboard.body.metrics.myTickets.drillDown.destination}`).query(dashboard.body.metrics.myTickets.drillDown.query);
      const actionsDrill = await agent.get(`/api${dashboard.body.metrics.myActions.drillDown.destination}`).query(dashboard.body.metrics.myActions.drillDown.query);
      expect(dashboard.body.metrics.myTickets.count).toBe(1); expect(ticketsDrill.body.items.map((item: any) => item.id)).toContain(ownedByA.id); expect(ticketsDrill.body.items.map((item: any) => item.id)).not.toContain(ownedByB.id);
      expect(dashboard.body.metrics.myActions.count).toBe(1); expect(actionsDrill.body.items.map((item: any) => item.id)).toEqual([performedByA.id]); expect(dashboard.body.myRecentActions.map((item: any) => item.id)).toEqual([performedByA.id]); expect(dashboard.body.myRecentActions.map((item: any) => item.id)).not.toContain(performedByB.id);
    } finally {
      if (tickets.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets.map(ticket => ticket.id) } } });
      if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: [fixtureRequester.id, staffA.id, staffB.id] } } });
    }
  });

  it("uses the Administrator's own identity for personal dashboard metrics", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z");
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const [fixtureRequester, fixtureAdmin, fixtureStaff] = await Promise.all([
      prisma.user.create({ data: { name: "Admin Identity Requester", email: `dash-admin-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Admin Identity Administrator", email: `dash-admin-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Admin Identity Staff", email: `dash-admin-staff-${suffix}@example.com`, role: "IT_STAFF", passwordHash: await hashPassword(password), mustChangePassword: false } }),
    ]);
    const tickets: any[] = [];
    try {
      const adminTicket = await prisma.ticket.create({ data: { ticketNumber: `TKT-ADMIN-OWN-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Administrator owned", description: "identity fixture", currentStatus: "OPEN", assignedToUserId: fixtureAdmin.id } });
      const staffTicket = await prisma.ticket.create({ data: { ticketNumber: `TKT-ADMIN-STAFF-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Staff owned", description: "identity fixture", currentStatus: "OPEN", assignedToUserId: fixtureStaff.id } });
      tickets.push(adminTicket, staffTicket);
      const [adminAction, staffAction] = await Promise.all([
        prisma.actionTaken.create({ data: { ticketId: adminTicket.id, actionDescription: "Administrator performed", result: "done", createdById: fixtureAdmin.id, performedById: fixtureAdmin.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `admin-action-${suffix}` } }),
        prisma.actionTaken.create({ data: { ticketId: staffTicket.id, actionDescription: "Staff performed", result: "done", createdById: fixtureStaff.id, performedById: fixtureStaff.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `staff-action-${suffix}` } }),
      ]);
      setDashboardClockForTests(() => new Date(asOf));
      const { agent } = await authenticatedAgent(fixtureAdmin.email, password); const dashboard = await agent.get("/api/staff/dashboard");
      const ticketsDrill = await agent.get(`/api${dashboard.body.metrics.myTickets.drillDown.destination}`).query(dashboard.body.metrics.myTickets.drillDown.query);
      const actionsDrill = await agent.get(`/api${dashboard.body.metrics.myActions.drillDown.destination}`).query(dashboard.body.metrics.myActions.drillDown.query);
      expect(ticketsDrill.status).toBe(200); expect(actionsDrill.status).toBe(200); expect(dashboard.body.metrics.myTickets.count).toBe(1); expect(ticketsDrill.body.items.map((item: any) => item.id)).toEqual([adminTicket.id]); expect(dashboard.body.metrics.myActions.count).toBe(1); expect(actionsDrill.body.items.map((item: any) => item.id)).toEqual([adminAction.id]); expect(dashboard.body.myRecentActions.map((item: any) => item.id)).toEqual([adminAction.id]); expect(actionsDrill.body.items.map((item: any) => item.id)).not.toContain(staffAction.id);
    } finally {
      if (tickets.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets.map(ticket => ticket.id) } } });
      if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: [fixtureRequester.id, fixtureAdmin.id, fixtureStaff.id] } } });
    }
  });

  it("counts terminal Tickets by exact status but excludes them from active priority buckets", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const { agent } = await authenticatedAgent(staff.email, password); setDashboardClockForTests(() => new Date("2026-10-10T12:00:00.000Z"));
    const before = await agent.get("/api/staff/dashboard"); const tickets: any[] = [];
    try {
      const active = await prisma.ticket.create({ data: { ticketNumber: `TKT-PRIORITY-ACTIVE-${suffix}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: `Active high ${suffix}`, description: "priority fixture", currentStatus: "OPEN", itPriority: "HIGH" } });
      const resolved = await prisma.ticket.create({ data: { ticketNumber: `TKT-PRIORITY-RESOLVED-${suffix}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: `Resolved high ${suffix}`, description: "priority fixture", currentStatus: "RESOLVED", itPriority: "HIGH" } });
      const closed = await prisma.ticket.create({ data: { ticketNumber: `TKT-PRIORITY-CLOSED-${suffix}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: `Closed high ${suffix}`, description: "priority fixture", currentStatus: "CLOSED", itPriority: "HIGH" } });
      tickets.push(active, resolved, closed);
      const after = await agent.get("/api/staff/dashboard");
      expect(after.body.metrics.byItPriority.HIGH.count).toBe(before.body.metrics.byItPriority.HIGH.count + 1); expect(after.body.metrics.byStatus.OPEN.count).toBe(before.body.metrics.byStatus.OPEN.count + 1); expect(after.body.metrics.byStatus.RESOLVED.count).toBe(before.body.metrics.byStatus.RESOLVED.count + 1); expect(after.body.metrics.byStatus.CLOSED.count).toBe(before.body.metrics.byStatus.CLOSED.count + 1);
      expect(Object.keys(after.body.metrics.byStatus).sort()).toEqual(["CANCELLED", "CLOSED", "IN_PROGRESS", "NEW", "OPEN", "REOPENED", "RESOLVED", "WAITING_FOR_REQUESTER"].sort()); expect(Object.keys(after.body.metrics.byItPriority).sort()).toEqual(["HIGH", "LOW", "MEDIUM"].sort());
      const highDrill = await agent.get(`/api${after.body.metrics.byItPriority.HIGH.drillDown.destination}`).query({ ...after.body.metrics.byItPriority.HIGH.drillDown.query, pageSize: 100 });
      const resolvedDrill = await agent.get(`/api${after.body.metrics.byStatus.RESOLVED.drillDown.destination}`).query({ ...after.body.metrics.byStatus.RESOLVED.drillDown.query, pageSize: 100 });
      const closedDrill = await agent.get(`/api${after.body.metrics.byStatus.CLOSED.drillDown.destination}`).query({ ...after.body.metrics.byStatus.CLOSED.drillDown.query, pageSize: 100 });
      expect(highDrill.body.items.map((item: any) => item.id)).toContain(active.id); expect(highDrill.body.items.map((item: any) => item.id)).not.toEqual(expect.arrayContaining([resolved.id, closed.id])); expect(resolvedDrill.body.items.map((item: any) => item.id)).toContain(resolved.id); expect(closedDrill.body.items.map((item: any) => item.id)).toContain(closed.id);
    } finally { if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } }); }
  });

  it("keeps every requester dashboard metric in parity with its emitted drill-down", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const lower = new Date(asOf.getTime() - 7 * 86400000);
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const fixtureRequester = await prisma.user.create({ data: { name: "Requester Parity", email: `dash-requester-parity-${suffix}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } });
    const tickets: any[] = [];
    const make = async (label: string, status: any, updatedAt: Date, resolvedAt: Date | null = null) => {
      const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-REQUESTER-PARITY-${suffix}-${label}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: label, description: "requester parity fixture", currentStatus: status } });
      const dated = await prisma.ticket.update({ where: { id: ticket.id }, data: { updatedAt, resolvedAt } }); tickets.push(dated); return dated;
    };
    try {
      await make("open-in-window", "OPEN", asOf);
      await make("waiting-in-window", "WAITING_FOR_REQUESTER", asOf);
      await make("active-outside-window", "IN_PROGRESS", new Date(lower.getTime() - 1));
      await make("formal-resolution", "RESOLVED", new Date("2020-01-01T00:00:00.000Z"), asOf);
      await make("legacy-resolution", "CLOSED", asOf);
      setDashboardClockForTests(() => new Date(asOf));
      const { agent } = await authenticatedAgent(fixtureRequester.email, password); const dashboard = await agent.get("/api/dashboard/requester");
      expect(dashboard.status).toBe(200);
      for (const metricName of ["openTickets", "waitingForRequester", "recentlyUpdated", "recentlyResolved"] as const) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics[metricName].drillDown);
        expect(drill.body.meta.totalItems).toBe(dashboard.body.metrics[metricName].count);
      }
    } finally {
      if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } });
      await prisma.user.delete({ where: { id: fixtureRequester.id } });
    }
  });

  it("keeps every IT Staff dashboard metric and bucket in parity with its emitted drill-down", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const [fixtureRequester, fixtureStaff] = await Promise.all([
      prisma.user.create({ data: { name: "Staff Parity Requester", email: `dash-staff-parity-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Staff Parity", email: `dash-staff-parity-${suffix}@example.com`, role: "IT_STAFF", passwordHash: await hashPassword(password), mustChangePassword: false } }),
    ]);
    const tickets: any[] = [];
    try {
      const mine = await prisma.ticket.create({ data: { ticketNumber: `TKT-STAFF-PARITY-MINE-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Staff parity mine", description: "staff parity fixture", currentStatus: "OPEN", assignedToUserId: fixtureStaff.id, updatedAt: asOf } });
      const unassigned = await prisma.ticket.create({ data: { ticketNumber: `TKT-STAFF-PARITY-UNASSIGNED-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Staff parity unassigned", description: "staff parity fixture", currentStatus: "NEW", updatedAt: asOf } });
      tickets.push(mine, unassigned);
      await prisma.actionTaken.create({ data: { ticketId: mine.id, actionDescription: "Staff parity action", result: "done", createdById: fixtureStaff.id, performedById: fixtureStaff.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `staff-parity-action-${suffix}` } });
      setDashboardClockForTests(() => new Date(asOf));
      const { agent } = await authenticatedAgent(fixtureStaff.email, password); const dashboard = await agent.get("/api/staff/dashboard");
      expect(dashboard.status).toBe(200);
      for (const metricName of ["unassignedTickets", "myTickets", "recentlyUpdated"] as const) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics[metricName].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics[metricName].count);
      }
      const actionDrill = await executeActionDrillDown(agent, dashboard.body.metrics.myActions.drillDown);
      expect(actionDrill.body.totalItems).toBe(dashboard.body.metrics.myActions.count);
      for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"]) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics.byStatus[status].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics.byStatus[status].count);
      }
      for (const priority of ["LOW", "MEDIUM", "HIGH"]) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics.byItPriority[priority].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics.byItPriority[priority].count);
      }
    } finally {
      if (tickets.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets.map(ticket => ticket.id) } } });
      if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: [fixtureRequester.id, fixtureStaff.id] } } });
    }
  });

  it("keeps every Administrator dashboard metric and bucket in parity with its emitted drill-down", async () => {
    const asOf = new Date("2026-10-10T12:00:00.000Z"); const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const [fixtureRequester, fixtureAdmin] = await Promise.all([
      prisma.user.create({ data: { name: "Admin Parity Requester", email: `dash-admin-parity-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash: await hashPassword(password), mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Admin Parity", email: `dash-admin-parity-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash: await hashPassword(password), mustChangePassword: false } }),
    ]);
    const tickets: any[] = [];
    try {
      const mine = await prisma.ticket.create({ data: { ticketNumber: `TKT-ADMIN-PARITY-MINE-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Admin parity mine", description: "admin parity fixture", currentStatus: "OPEN", assignedToUserId: fixtureAdmin.id, updatedAt: asOf } });
      const unassigned = await prisma.ticket.create({ data: { ticketNumber: `TKT-ADMIN-PARITY-UNASSIGNED-${suffix}`, requesterId: fixtureRequester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Admin parity unassigned", description: "admin parity fixture", currentStatus: "NEW", updatedAt: asOf } });
      tickets.push(mine, unassigned);
      await prisma.actionTaken.create({ data: { ticketId: mine.id, actionDescription: "Admin parity action", result: "done", createdById: fixtureAdmin.id, performedById: fixtureAdmin.id, status: "COMPLETED", followUpRequired: false, completedAt: asOf, requestKey: `admin-parity-action-${suffix}` } });
      setDashboardClockForTests(() => new Date(asOf));
      const { agent } = await authenticatedAgent(fixtureAdmin.email, password); const dashboard = await agent.get("/api/staff/dashboard");
      expect(dashboard.status).toBe(200);
      for (const metricName of ["unassignedTickets", "myTickets", "recentlyUpdated"] as const) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics[metricName].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics[metricName].count);
      }
      const actionDrill = await executeActionDrillDown(agent, dashboard.body.metrics.myActions.drillDown);
      expect(actionDrill.body.totalItems).toBe(dashboard.body.metrics.myActions.count);
      for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"]) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics.byStatus[status].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics.byStatus[status].count);
      }
      for (const priority of ["LOW", "MEDIUM", "HIGH"]) {
        const drill = await executeTicketDrillDown(agent, dashboard.body.metrics.byItPriority[priority].drillDown);
        expect(drill.body.totalItems).toBe(dashboard.body.metrics.byItPriority[priority].count);
      }
    } finally {
      if (tickets.length) await prisma.actionTaken.deleteMany({ where: { ticketId: { in: tickets.map(ticket => ticket.id) } } });
      if (tickets.length) await prisma.ticket.deleteMany({ where: { id: { in: tickets.map(ticket => ticket.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: [fixtureRequester.id, fixtureAdmin.id] } } });
    }
  });

});
