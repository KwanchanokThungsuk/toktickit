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
    const claim = await agent.post(`/api/staff/tickets/${ticketId}/claim`).set("X-CSRF-Token", csrfToken);
    expect(claim.status).toBe(200);
    expect(claim.body.id).toBe(staff.id);
    const reassign = await agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", csrfToken).send({ ownerId: staffB.id });
    expect(reassign.status).toBe(200);
    expect(reassign.body.id).toBe(staffB.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    const administratorOwner = await agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", csrfToken).send({ ownerId: admin.id });
    expect(administratorOwner.status).toBe(200);
    expect(administratorOwner.body.id).toBe(admin.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(admin.id);
  });

  it("rejects invalid owner targets without changing ownership and enforces staff authorization", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const requesterAgent = await authenticatedAgent(requester.email, password);
    const establishOwner = await agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", csrfToken).send({ ownerId: staffB.id });
    expect(establishOwner.status).toBe(200);
    expect(establishOwner.body.id).toBe(staffB.id);
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    expect((await requesterAgent.agent.get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    expect((await requesterAgent.agent.post(`/api/staff/tickets/${ticketId}/claim`).set("X-CSRF-Token", requesterAgent.csrfToken)).status).toBe(403);
    expect((await requesterAgent.agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", requesterAgent.csrfToken).send({ ownerId: staff.id })).status).toBe(403);
    for (const ownerId of [requester.id, inactive.id, 99999999]) {
      const response = await agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", csrfToken).send({ ownerId });
      expect(response.status).toBe(422);
      expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { assignedToUserId: true } }))?.assignedToUserId).toBe(staffB.id);
    }
    const adminAgent = await authenticatedAgent(admin.email, password);
    expect((await adminAgent.agent.get(`/api/staff/tickets/${ticketId}`)).status).toBe(403);
    expect((await adminAgent.agent.patch(`/api/staff/tickets/${ticketId}/owner`).set("X-CSRF-Token", adminAgent.csrfToken).send({ ownerId: staff.id })).status).toBe(403);
  });

  it("rejects missing-ticket claim and reassign requests", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    expect((await agent.post("/api/staff/tickets/99999999/claim").set("X-CSRF-Token", csrfToken)).status).toBe(404);
    expect((await agent.patch("/api/staff/tickets/99999999/owner").set("X-CSRF-Token", csrfToken).send({ ownerId: staffB.id })).status).toBe(404);
  });

  it("rejects resolution indication for another requester's ticket", async () => {
    const { agent, csrfToken } = await authenticatedAgent(otherRequester.email, password);
    const response = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken);
    expect(response.status).toBe(404);
  });

  it("rejects resolution indication in a disallowed status and rejects duplicates", async () => {
    const { agent, csrfToken } = await authenticatedAgent(requester.email, password);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW", requesterResolutionIndicatedAt: null, requesterResolutionIndicatedByUserId: null } });
    const invalidStatus = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken);
    expect(invalidStatus.status).toBe(409);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "IN_PROGRESS" } });
    const response = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken);
    expect(response.status).toBe(200);
    expect(response.body.requesterResolutionIndicatedByUserId).toBe(requester.id);
    expect(response.body.requesterResolutionIndicatedAt).toBeTruthy();
    const duplicate = await agent.post(`/api/tickets/${ticketId}/problem-resolved`).set("X-CSRF-Token", csrfToken);
    expect(duplicate.status).toBe(409);
  });

  it("updates IT Priority without changing Requested Priority", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const response = await agent.patch(`/api/staff/tickets/${ticketId}/priority`).set("X-CSRF-Token", csrfToken).send({ itPriority: "HIGH" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: ticketId, requestedPriority: "MEDIUM", itPriority: "HIGH" });
    expect((await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requestedPriority: true, itPriority: true } }))).toEqual({ requestedPriority: "MEDIUM", itPriority: "HIGH" });
  });

  it("allows an Administrator to update IT Priority but not status", async () => {
    const administrator = await authenticatedAgent(admin.email, password);
    const priority = await administrator.agent.patch(`/api/staff/tickets/${ticketId}/priority`).set("X-CSRF-Token", administrator.csrfToken).send({ itPriority: "LOW" });
    expect(priority.status).toBe(200);
    const status = await administrator.agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", administrator.csrfToken).send({ status: "OPEN" });
    expect(status.status).toBe(403);
  });

  it("enforces the status transition matrix and rejects invalid values", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
    const valid = await agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", csrfToken).send({ status: "OPEN" });
    expect(valid.status).toBe(200);
    const invalid = await agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", csrfToken).send({ status: "CLOSED" });
    expect(invalid.status).toBe(409);
    const unsupported = await agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", csrfToken).send({ status: "NOT_A_STATUS" });
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
      const response = await agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", csrfToken).send({ status: nextStatus });
      expect(response.status, `${currentStatus} -> ${nextStatus}`).toBe(200);
      expect(response.body.currentStatus).toBe(nextStatus);
    }
  });

  it("covers priority and status authorization and validation boundaries", async () => {
    const requesterAgent = await authenticatedAgent(requester.email, password);
    const administratorAgent = await authenticatedAgent(admin.email, password);
    const staffAgent = await authenticatedAgent(staff.email, password);
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { itPriority: true, requestedPriority: true, currentStatus: true } });
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "HIGH" })).status).toBe(401);
    expect((await request(app).patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "OPEN" })).status).toBe(401);
    expect((await requesterAgent.agent.patch(`/api/staff/tickets/${ticketId}/priority`).set("X-CSRF-Token", requesterAgent.csrfToken).send({ itPriority: "HIGH" })).status).toBe(403);
    expect((await requesterAgent.agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", requesterAgent.csrfToken).send({ status: "OPEN" })).status).toBe(403);
    expect((await administratorAgent.agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", administratorAgent.csrfToken).send({ status: "OPEN" })).status).toBe(403);
    expect((await staffAgent.agent.patch(`/api/staff/tickets/${ticketId}/priority`).set("X-CSRF-Token", staffAgent.csrfToken).send({ itPriority: "INVALID" })).status).toBe(422);
    expect((await staffAgent.agent.patch(`/api/staff/tickets/99999999/priority`).set("X-CSRF-Token", staffAgent.csrfToken).send({ itPriority: "HIGH" })).status).toBe(404);
    expect((await staffAgent.agent.patch(`/api/staff/tickets/99999999/status`).set("X-CSRF-Token", staffAgent.csrfToken).send({ status: "OPEN" })).status).toBe(404);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW", itPriority: before.itPriority } });
    const invalidTransition = await staffAgent.agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", staffAgent.csrfToken).send({ status: "RESOLVED" });
    expect(invalidTransition.status).toBe(409);
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { currentStatus: true, itPriority: true } })).toEqual({ currentStatus: "NEW", itPriority: before.itPriority });
  });
});
