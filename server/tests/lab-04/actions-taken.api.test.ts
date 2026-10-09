import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "Lab4ActionsPassword1!";
let requester: any; let otherRequester: any; let staff: any; let admin: any; let inactive: any;
let ticket: any; let category: any; let system: any;
async function freshTicket(requesterId = requester.id) {
  const n = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return prisma.ticket.create({ data: { ticketNumber: `TKT-LAB4-${n}`, requesterId, categoryId: category.id, relatedSystemId: system.id, summary: "Isolated Actions fixture", description: "Isolated Actions fixture", currentStatus: "IN_PROGRESS" } });
}
function expectActionDto(action: any) {
  expect(Object.keys(action).sort()).toEqual([
    "actionDateTime", "actionDescription", "assignedTo", "attachmentNotes", "completedAt",
    "createdAt", "createdBy", "followUpNote", "followUpRequired", "id", "performedBy",
    "result", "status", "ticketId", "updatedAt", "version",
  ].sort());
  expect(action.requestKey).toBeUndefined();
  expect(action.createdById).toBeUndefined();
  expect(action.performedById).toBeUndefined();
  expect(action.assignedToUserId).toBeUndefined();
  expect(action.creator).toBeUndefined();
  expect(action.performer).toBeUndefined();
  expect(action.assignee).toBeUndefined();
}

describe("Lab 4 Actions Taken API", () => {
  beforeAll(async () => {
    const suffix = Date.now(); const passwordHash = await hashPassword(password);
    [requester, otherRequester, staff, admin, inactive] = await Promise.all([
      prisma.user.create({ data: { name: "Lab4 Requester", email: `lab4-r-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Lab4 Other", email: `lab4-o-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Lab4 Staff", email: `lab4-s-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Lab4 Admin", email: `lab4-a-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Lab4 Inactive", email: `lab4-i-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false, isActive: false } }),
    ]);
    category = await prisma.category.create({ data: { name: `Lab4 Category ${suffix}` } });
    system = await prisma.relatedSystem.create({ data: { name: `Lab4 System ${suffix}` } });
    ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-LAB4-${suffix}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: system.id, summary: "Lab 4 Actions", description: "Actions fixture", currentStatus: "IN_PROGRESS" } });
  });
  afterAll(async () => {
    if (!ticket) return;
    await prisma.actionTaken.deleteMany({ where: { ticketId: ticket.id } }).catch(() => undefined);
    await prisma.ticket.delete({ where: { id: ticket.id } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: category.id } }).catch(() => undefined);
    await prisma.relatedSystem.delete({ where: { id: system.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: [requester.id, otherRequester.id, staff.id, admin.id, inactive.id] } } }).catch(() => undefined);
  });

  it("creates Draft and Completed Actions and makes same-key retry idempotent", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const draft = await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "Draft work", followUpRequired: false, expectedTicketVersion: 1, requestKey: "test-draft-1" });
    expect(draft.status).toBe(201); expect(draft.body.action.result).toBeNull();
    const retry = await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "Different body is still same logical create", result: "ignored", followUpRequired: true, followUpNote: "ignored", expectedTicketVersion: 1, requestKey: "test-draft-1" });
    expect(retry.status).toBe(200); expect(retry.body.action.id).toBe(draft.body.action.id);
    expectActionDto(retry.body.action);
    const completed = await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "Completed work", result: "Done", followUpRequired: false, expectedTicketVersion: 2, requestKey: "test-completed-1", status: "COMPLETED" });
    expect(completed.status).toBe(201); expect(completed.body.action.performedBy.id).toBe(staff.id);
    expect(completed.body.action.createdBy.id).toBe(staff.id);
    expect(completed.body.action.assignedTo).toBeNull();
    expectActionDto(completed.body.action);
    expect(await prisma.actionTaken.count({ where: { ticketId: ticket.id, requestKey: "test-draft-1" } })).toBe(1);
  });

  it("clears a submitted follow-up note when followUpRequired is false", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const version = (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version;
    const created = await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "Normalize note", followUpRequired: false, followUpNote: "discard this", expectedTicketVersion: version, requestKey: "test-normalize-note" });
    expect(created.status).toBe(201); expect(created.body.action.followUpNote).toBeNull();
  });

  it("validates follow-up, assignment, and server-controlled fields", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const base = { actionDescription: "Validation", followUpRequired: true, expectedTicketVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version, requestKey: "test-validation-1" };
    expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send(base)).status).toBe(422);
    for (const badId of ["abc", 0, -1]) expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ ...base, requestKey: `test-validation-${badId}`, followUpNote: "note", assignedToUserId: badId })).status).toBe(422);
    expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ ...base, requestKey: "test-validation-3", followUpNote: "note", createdById: admin.id })).status).toBe(422);
  });

  it("enforces Requester ownership and write restrictions", async () => {
    const own = await authenticatedAgent(requester.email, password); const other = await authenticatedAgent(otherRequester.email, password);
    expect((await own.agent.get(`/api/tickets/${ticket.id}/actions-taken`)).status).toBe(200);
    expect((await other.agent.get(`/api/tickets/${ticket.id}/actions-taken`)).status).toBe(404);
    expect((await own.agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).send({})).status).toBe(403);
    expect((await own.agent.patch(`/api/staff/tickets/${ticket.id}/actions-taken/1`).send({})).status).toBe(403);
  });

  it("supports Draft cancellation/unassignment and rejects terminal edits", async () => {
    const { agent, csrfToken } = await authenticatedAgent(admin.email, password);
    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const created = await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "Cancelable", followUpRequired: true, followUpNote: "later", expectedTicketVersion: current.version, requestKey: "test-cancel-1", assignedToUserId: staff.id });
    expect(created.status).toBe(201);
    const cancelled = await agent.patch(`/api/staff/tickets/${ticket.id}/actions-taken/${created.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: current.version + 1, expectedVersion: 1, status: "CANCELLED", result: "Cancelled explanation", assignedToUserId: null });
    expect(cancelled.status).toBe(200); expect(cancelled.body.action.followUpRequired).toBe(false); expect(cancelled.body.action.followUpNote).toBeNull();
    const terminal = await agent.patch(`/api/staff/tickets/${ticket.id}/actions-taken/${cancelled.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: current.version + 2, expectedVersion: 2, result: "edit" });
    expect(terminal.status).toBe(409);
  });

  it("requires CSRF and rejects inactive assignees", async () => {
    const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const version = (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).version;
    expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "bad assignee", followUpRequired: false, expectedTicketVersion: version, requestKey: "test-bad-assignee", assignedToUserId: inactive.id })).status).toBe(422);
    expect((await request(app).post(`/api/staff/tickets/${ticket.id}/actions-taken`).send({})).status).toBe(401);
    expect((await agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", "wrong-token").send({ actionDescription: "csrf", followUpRequired: false, expectedTicketVersion: version, requestKey: "wrong-csrf" })).status).toBe(403);
  });

  it("rejects missing requestKey and creates a distinct Action for a new key", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const base = { actionDescription: "new action", followUpRequired: false, expectedTicketVersion: 1 };
    expect((await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send(base)).status).toBe(422);
    const first = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ ...base, requestKey: "key-a" });
    const second = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ ...base, requestKey: "key-b" , expectedTicketVersion: 2 });
    expect(first.status).toBe(201); expect(second.status).toBe(201); expect(second.body.action.id).not.toBe(first.body.action.id);
  });

  it("runs concurrent same-key creates as one logical mutation", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const payload = { actionDescription: "concurrent create", followUpRequired: false, expectedTicketVersion: 1, requestKey: `concurrent-${isolated.id}` };
    const responses = await Promise.all([agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send(payload), agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send(payload)]);
    expect(responses.every(r => r.status === 201 || r.status === 200)).toBe(true); expect(responses.some(r => r.status === 201)).toBe(true);
    expect(await prisma.actionTaken.count({ where: { ticketId: isolated.id } })).toBe(1);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: isolated.id } })).version).toBe(2);
  });

  it("rejects stale Ticket and Action versions without partial mutation", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const staleCreate = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "stale", followUpRequired: false, expectedTicketVersion: 99, requestKey: "stale-create" });
    expect(staleCreate.status).toBe(409); expect(staleCreate.body.error.code).toBe("STALE_UPDATE"); expect(await prisma.actionTaken.count({ where: { ticketId: isolated.id } })).toBe(0);
    const created = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "draft", followUpRequired: false, expectedTicketVersion: 1, requestKey: "stale-patch" });
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: isolated.id } });
    const updated = await agent.patch(`/api/staff/tickets/${isolated.id}/actions-taken/${created.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: before.version, expectedVersion: 1, actionDescription: "updated" });
    expect(updated.status).toBe(200);
    const stale = await agent.patch(`/api/staff/tickets/${isolated.id}/actions-taken/${created.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: before.version, expectedVersion: 1, actionDescription: "stale" });
    expect(stale.status).toBe(409); expect(stale.body.error.code).toBe("STALE_UPDATE");
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: isolated.id } })).version).toBe(before.version + 1);
    expect((await prisma.actionTaken.findUniqueOrThrow({ where: { id: created.body.action.id } })).actionDescription).toBe("updated");
  });

  it("supports Draft editing, completion, and assignment validation", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const created = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "draft", followUpRequired: false, expectedTicketVersion: 1, requestKey: `lifecycle-${isolated.id}` });
    const edit = await agent.patch(`/api/staff/tickets/${isolated.id}/actions-taken/${created.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: 2, expectedVersion: 1, actionDescription: "edited", assignedToUserId: admin.id });
    expect(edit.status).toBe(200); expect(edit.body.action.version).toBe(2); expectActionDto(edit.body.action);
    const complete = await agent.patch(`/api/staff/tickets/${isolated.id}/actions-taken/${created.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: 3, expectedVersion: 2, status: "COMPLETED", result: "completed" });
    expect(complete.status).toBe(200); expect(complete.body.action.performedBy.id).toBe(staff.id); expect(complete.body.action.completedAt).toBeTruthy();
    for (const bad of [requester.id, inactive.id, "abc", 0, -1]) {
      const fresh = await freshTicket(); const made = await agent.post(`/api/staff/tickets/${fresh.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "assign", followUpRequired: false, expectedTicketVersion: 1, requestKey: `assign-${fresh.id}` });
      expect((await agent.patch(`/api/staff/tickets/${fresh.id}/actions-taken/${made.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: 2, expectedVersion: 1, assignedToUserId: bad })).status).toBe(422);
    }
  });

  it("rejects terminal edits and exposes no Action DELETE route", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    const made = await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: "terminal", result: "done", followUpRequired: false, status: "COMPLETED", expectedTicketVersion: 1, requestKey: `terminal-${isolated.id}` });
    const before = await prisma.actionTaken.findUniqueOrThrow({ where: { id: made.body.action.id } });
    const response = await agent.patch(`/api/staff/tickets/${isolated.id}/actions-taken/${made.body.action.id}`).set("X-CSRF-Token", csrfToken).send({ expectedTicketVersion: 2, expectedVersion: 1, result: "changed" });
    expect(response.status).toBe(409); expect(response.body.error.code).toBe("ACTION_IMMUTABLE"); expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: before.id } })).toMatchObject({ result: before.result, version: before.version });
    expect((await agent.delete(`/api/staff/tickets/${isolated.id}/actions-taken/${before.id}`)).status).toBe(404);
  });

  it("returns Actions in stable order with pagination", async () => {
    const isolated = await freshTicket(); const { agent, csrfToken } = await authenticatedAgent(staff.email, password);
    for (const [index, key] of ["order-a", "order-b", "order-c"].entries()) await agent.post(`/api/staff/tickets/${isolated.id}/actions-taken`).set("X-CSRF-Token", csrfToken).send({ actionDescription: `order ${index}`, followUpRequired: false, expectedTicketVersion: index + 1, requestKey: key });
    const page = await agent.get(`/api/tickets/${isolated.id}/actions-taken?page=1&pageSize=2`); expect(page.status).toBe(200); expect(page.body.items).toHaveLength(2); expect(page.body.totalItems).toBe(3); expectActionDto(page.body.items[0]);
    expect((await agent.get(`/api/tickets/${isolated.id}/actions-taken?page=0`)).status).toBe(422); expect((await agent.get(`/api/tickets/${isolated.id}/actions-taken?pageSize=101`)).status).toBe(422);
  });
});
