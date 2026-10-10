import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "DetailTestPassword1!";
let staff: { id: number; email: string };
let staffB: { id: number; email: string };
let admin: { id: number; email: string };
let inactive: { id: number; email: string };
let requester: { id: number; email: string };
let otherRequester: { id: number; email: string };
let ticketId: number;
let categoryId: number;
let systemId: number;

async function updateStatus(agent: any, csrfToken: string, id: number, status: string) {
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id }, select: { version: true } });
  return agent.patch(`/api/staff/tickets/${id}/status`).set("X-CSRF-Token", csrfToken).send({ status, expectedVersion: ticket.version });
}
async function version(id = ticketId) { return (await prisma.ticket.findUniqueOrThrow({ where: { id }, select: { version: true } })).version; }
async function updateOwner(agent: any, csrfToken: string, ownerId: number | null, id = ticketId, expectedVersion?: number) { return agent.patch(`/api/staff/tickets/${id}/owner`).set("X-CSRF-Token", csrfToken).send({ ownerId, expectedVersion: expectedVersion ?? await version(id) }); }
async function claim(agent: any, csrfToken: string, id = ticketId, expectedVersion?: number) { return agent.post(`/api/staff/tickets/${id}/claim`).set("X-CSRF-Token", csrfToken).send({ expectedVersion: expectedVersion ?? await version(id) }); }
async function updatePriority(agent: any, csrfToken: string, itPriority: string, id = ticketId, expectedVersion?: number) { return agent.patch(`/api/staff/tickets/${id}/priority`).set("X-CSRF-Token", csrfToken).send({ itPriority, expectedVersion: expectedVersion ?? await version(id) }); }

describe("Issue #20 staff ticket detail and ownership", () => {
  beforeAll(async () => {
    const suffix = Date.now();
    const passwordHash = await hashPassword(password);
    requester = await prisma.user.create({ data: { name: "Detail Requester", email: `detail-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } });
    otherRequester = await prisma.user.create({ data: { name: "Other Requester", email: `detail-other-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } });
    staff = await prisma.user.create({ data: { name: "Detail Staff", email: `detail-staff-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    staffB = await prisma.user.create({ data: { name: "Detail Staff B", email: `detail-staff-b-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } });
    admin = await prisma.user.create({ data: { name: "Detail Admin", email: `detail-admin-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } });
    inactive = await prisma.user.create({ data: { name: "Detail Inactive", email: `detail-inactive-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false, isActive: false } });
    categoryId = (await prisma.category.create({ data: { name: `Detail Category ${suffix}` } })).id;
    systemId = (await prisma.relatedSystem.create({ data: { name: `Detail System ${suffix}` } })).id;
    ticketId = (await prisma.ticket.create({ data: { ticketNumber: `TKT-DETAIL-${suffix}`, requesterId: requester.id, categoryId, relatedSystemId: systemId, summary: "Detail fixture ticket", description: "A sufficiently long detail fixture description.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS" } })).id;
  });
  afterAll(async () => { if (!requester) return; await prisma.ticket.deleteMany({ where: { id: ticketId } }).catch(() => undefined); await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined); await prisma.relatedSystem.delete({ where: { id: systemId } }).catch(() => undefined); await prisma.user.deleteMany({ where: { id: { in: [requester.id, otherRequester.id, staff.id, staffB.id, admin.id, inactive.id] } } }).catch(() => undefined); });

  it("requires IT Staff for detail and supports claim and real reassignment", async () => {
    expect((await request(app).get(`/api/staff/tickets/${ticketId}`)).status).toBe(401);
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const detail = await agent.get(`/api/staff/tickets/${ticketId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(ticketId);
    expect(detail.body.assignedTo).toBeNull();
    const claimed = await claim(agent, csrfToken);
    expect(claimed.status).toBe(200);
    expect(claimed.body.id).toBe(staff.id);
    const reassign = await updateOwner(agent, csrfToken, staffB.id);
    expect(reassign.status).toBe(200);
    expect(reassign.body.id).toBe(staffB.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    const administratorOwner = await updateOwner(agent, csrfToken, admin.id);
    expect(administratorOwner.status).toBe(200);
    expect(administratorOwner.body.id).toBe(admin.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(admin.id);
  });

  it("rejects invalid owner targets without changing ownership and enforces staff authorization", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const requesterAgent = await authenticatedAgent(requester.email, password);
    const establishOwner = await updateOwner(agent, csrfToken, staffB.id);
    expect(establishOwner.status).toBe(200);
    expect(establishOwner.body.id).toBe(staffB.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    expect((await requesterAgent.agent.get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    expect((await claim(requesterAgent.agent, requesterAgent.csrfToken)).status).toBe(403);
    expect((await updateOwner(requesterAgent.agent, requesterAgent.csrfToken, staff.id)).status).toBe(403);
    for (const ownerId of [requester.id, inactive.id, 99999999]) {
      const response = await updateOwner(agent, csrfToken, ownerId);
      expect(response.status).toBe(422);
      expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    }
    const adminAgent = await authenticatedAgent(admin.email, password);
    expect((await adminAgent.agent.get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    expect((await updateOwner(adminAgent.agent, adminAgent.csrfToken, staff.id)).status).toBe(200);
  });

  it("rejects missing-ticket claim and reassign requests", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    expect((await claim(agent, csrfToken, 99999999, 1)).status).toBe(404);
    expect((await updateOwner(agent, csrfToken, staffB.id, 99999999, 1)).status).toBe(404);
  });

  it("rejects resolution indication for another requester's ticket", async () => {
    const { agent, csrfToken } = await authenticatedAgent(otherRequester.email, password);
    const response = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken).send({ expectedVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
    expect(response.status).toBe(404);
  });

  it("rejects resolution indication in a disallowed status and rejects duplicates", async () => {
    const { agent, csrfToken } = await authenticatedAgent(requester.email, password);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW", requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null } });
    const invalidStatus = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken).send({ expectedVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
    expect(invalidStatus.status).toBe(409);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "IN_PROGRESS" } });
    const response = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken).send({ expectedVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
    expect(response.status).toBe(200);
    expect(response.body.requesterResolutionIndicatedByUserId).toBe(requester.id);
    expect(response.body.requesterResolutionIndicatedAt).toBeTruthy();
    const duplicate = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken).send({ expectedVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } })).version });
    expect(duplicate.status).toBe(409);
  });

  it("updates IT Priority without changing Requested Priority", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const response = await updatePriority(agent, csrfToken, "HIGH");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: ticketId, requestedPriority: "MEDIUM", itPriority: "HIGH" });
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requestedPriority: true, itPriority: true } }))).toEqual({ requestedPriority: "MEDIUM", itPriority: "HIGH" });
  });

  it("allows an Administrator to update IT Priority but not status", async () => {
    const administrator = await authenticatedAgent(admin.email, password);
    const priority = await updatePriority(administrator.agent, administrator.csrfToken, "LOW");
    expect(priority.status).toBe(200);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
    const status = await updateStatus(administrator.agent, administrator.csrfToken, ticketId, "OPEN");
    expect(status.status).toBe(200);
  });

  it("requires expected versions and atomically rejects stale owner, claim, and priority writes", async () => {
    const staffAuth = await authenticatedAgent(staff.email, password);
    const adminAuth = await authenticatedAgent(admin.email, password);
    await prisma.ticket.update({ where: { id: ticketId }, data: { assignedToUserId: null, itPriority: "MEDIUM" } });
    expect((await staffAuth.agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", staffAuth.csrfToken).send({ ownerId: staff.id })).status).toBe(422);
    expect((await staffAuth.agent.post(`/api/staff/tickets/${ticketId}/claim`).set("X-CSRF-Token", staffAuth.csrfToken).send({ expectedVersion: "1" })).status).toBe(422);
    expect((await staffAuth.agent.patch(`/api/staff/tickets/${ticketId}/priority`).set("X-CSRF-Token", staffAuth.csrfToken).send({ itPriority: "HIGH" })).status).toBe(422);
    const initial = await version();
    const [ownerA, ownerB] = await Promise.all([updateOwner(staffAuth.agent, staffAuth.csrfToken, staff.id, ticketId, initial), updateOwner(adminAuth.agent, adminAuth.csrfToken, staffB.id, ticketId, initial)]);
    expect([ownerA.status, ownerB.status].sort()).toEqual([200, 409]);
    const afterOwner = await version();
    const [claimA, claimB] = await Promise.all([claim(staffAuth.agent, staffAuth.csrfToken, ticketId, afterOwner), claim(adminAuth.agent, adminAuth.csrfToken, ticketId, afterOwner)]);
    expect([claimA.status, claimB.status].sort()).toEqual([200, 409]);
    const afterClaim = await version();
    const [priorityA, priorityB] = await Promise.all([updatePriority(staffAuth.agent, staffAuth.csrfToken, "HIGH", ticketId, afterClaim), updatePriority(adminAuth.agent, adminAuth.csrfToken, "LOW", ticketId, afterClaim)]);
    expect([priorityA.status, priorityB.status].sort()).toEqual([200, 409]);
    expect(await version()).toBe(afterClaim + 1);
  });

  it("enforces the status transition matrix and rejects invalid values", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
    const valid = await updateStatus(agent, csrfToken, ticketId, "OPEN");
    expect(valid.status).toBe(200);
    const invalid = await updateStatus(agent, csrfToken, ticketId, "CLOSED");
    expect(invalid.status).toBe(409);
    const unsupported = await updateStatus(agent, csrfToken, ticketId, "NOT_A_STATUS");
    expect(unsupported.status).toBe(422);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { currentStatus: true } }))?.currentStatus).toBe("OPEN");
  });

  it("covers every permitted status transition", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const transitions: Array<[string, string]> = [
      ["NEW", "OPEN"], ["NEW", "CANCELLED"],
      ["OPEN", "IN_PROGRESS"], ["OPEN", "WAITING_FOR_REQUESTER"], ["OPEN", "CANCELLED"],
      ["IN_PROGRESS", "WAITING_FOR_REQUESTER"], ["IN_PROGRESS", "RESOLVED"], ["IN_PROGRESS", "CANCELLED"],
      ["WAITING_FOR_REQUESTER", "IN_PROGRESS"], ["WAITING_FOR_REQUESTER", "RESOLVED"], ["WAITING_FOR_REQUESTER", "CANCELLED"],
      ["RESOLVED", "CLOSED"], ["RESOLVED", "REOPENED"], ["CLOSED", "REOPENED"],
      ["REOPENED", "IN_PROGRESS"], ["REOPENED", "WAITING_FOR_REQUESTER"], ["REOPENED", "CANCELLED"],
      ["CANCELLED", "REOPENED"],
    ];
    for (const [currentStatus, nextStatus] of transitions) {
      await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: currentStatus as never } });
      if (nextStatus === "RESOLVED") await prisma.actionTaken.create({ data: { ticketId, createdById: staff.id, actionDescription: "Resolution evidence", result: "Done", status: "COMPLETED", performedById: staff.id, completedAt: new Date(), followUpRequired: false, requestKey: `matrix-${currentStatus}-${nextStatus}` } });
      const response = await updateStatus(agent, csrfToken, ticketId, nextStatus);
      expect(response.status, `${currentStatus} -> ${nextStatus}`).toBe(200);
      expect(response.body.currentStatus).toBe(nextStatus);
    }
  });

  it("covers priority and status authorization and validation boundaries", async () => {
    const requesterAgent = await authenticatedAgent(requester.email, password);
    const administratorAgent = await authenticatedAgent(admin.email, password);
    const staffAgent = await authenticatedAgent(staff.email, password);
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { itPriority: true, requestedPriority: true, currentStatus: true } });
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "HIGH", expectedVersion: 1 })).status).toBe(401);
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "OPEN" })).status).toBe(401);
    expect((await updatePriority(requesterAgent.agent, requesterAgent.csrfToken, "HIGH")).status).toBe(403);
    expect((await requesterAgent.agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", requesterAgent.csrfToken).send({ status: "OPEN" })).status).toBe(403);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
    expect((await updateStatus(administratorAgent.agent, administratorAgent.csrfToken, ticketId, "OPEN")).status).toBe(200);
    expect((await updatePriority(staffAgent.agent, staffAgent.csrfToken, "INVALID")).status).toBe(422);
    expect((await updatePriority(staffAgent.agent, staffAgent.csrfToken, "HIGH", 99999999, 1)).status).toBe(404);
    expect((await staffAgent.agent.patch(`/api/staff/tickets/99999999/status`).set("X-CSRF-Token", staffAgent.csrfToken).send({ status: "OPEN", expectedVersion: 1 })).status).toBe(404);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW", itPriority: before.itPriority } });
    const invalidTransition = await updateStatus(staffAgent.agent, staffAgent.csrfToken, ticketId, "RESOLVED");
    expect(invalidTransition.status).toBe(409);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { currentStatus: true, itPriority: true } })).toEqual({ currentStatus: "NEW", itPriority: before.itPriority });
  });
});
