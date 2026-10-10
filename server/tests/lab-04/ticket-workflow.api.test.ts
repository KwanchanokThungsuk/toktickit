import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/auth.js";
import { getPrisma } from "../../src/prisma.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "WorkflowTestPassword1!";
let requester: any; let otherRequester: any; let staff: any; let admin: any; let category: any; let relatedSystem: any;
const tickets = new Set<number>();

async function makeTicket(status: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "REOPENED" | "RESOLVED" | "CLOSED" | "CANCELLED" = "IN_PROGRESS") {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-WORKFLOW-${suffix}`, requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: "Workflow fixture", description: "Workflow fixture", currentStatus: status } });
  tickets.add(ticket.id);
  return ticket;
}
async function transition(agent: any, csrfToken: string, ticketId: number, status: string, expectedVersion?: number) {
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, select: { version: true } });
  return agent.patch(`/api/staff/tickets/${ticketId}/status`).set("X-CSRF-Token", csrfToken).send({ status, expectedVersion: expectedVersion ?? ticket.version });
}
async function completedAction(ticketId: number, label = "completed") {
  return prisma.actionTaken.create({ data: { ticketId, createdById: staff.id, actionDescription: label, result: "Completed work", status: "COMPLETED", performedById: staff.id, completedAt: new Date(), followUpRequired: false, requestKey: `${label}-${ticketId}-${Date.now()}-${Math.random()}` } });
}

describe("Lab 4 Ticket workflow", () => {
  beforeAll(async () => {
    const suffix = Date.now(); const passwordHash = await hashPassword(password);
    [requester, otherRequester, staff, admin] = await Promise.all([
      prisma.user.create({ data: { name: "Workflow Requester", email: `workflow-requester-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Workflow Other", email: `workflow-other-${suffix}@example.com`, role: "REQUESTER", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Workflow Staff", email: `workflow-staff-${suffix}@example.com`, role: "IT_STAFF", passwordHash, mustChangePassword: false } }),
      prisma.user.create({ data: { name: "Workflow Admin", email: `workflow-admin-${suffix}@example.com`, role: "ADMINISTRATOR", passwordHash, mustChangePassword: false } }),
    ]);
    category = await prisma.category.create({ data: { name: `Workflow Category ${suffix}` } });
    relatedSystem = await prisma.relatedSystem.create({ data: { name: `Workflow System ${suffix}` } });
  });
  afterAll(async () => {
    const ids = [...tickets];
    await prisma.actionTaken.deleteMany({ where: { ticketId: { in: ids } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.relatedSystem.delete({ where: { id: relatedSystem.id } });
    await prisma.user.deleteMany({ where: { id: { in: [requester.id, otherRequester.id, staff.id, admin.id] } } });
  });

  it("enforces every documented transition and rejects unknown, forbidden, and requester writes", async () => {
    const staffAuth = await authenticatedAgent(staff.email, password);
    const administrator = await authenticatedAgent(admin.email, password);
    const requesterAuth = await authenticatedAgent(requester.email, password);
    const edges: Array<[any, any]> = [["NEW", "OPEN"], ["NEW", "CANCELLED"], ["OPEN", "IN_PROGRESS"], ["OPEN", "WAITING_FOR_REQUESTER"], ["OPEN", "CANCELLED"], ["IN_PROGRESS", "WAITING_FOR_REQUESTER"], ["IN_PROGRESS", "RESOLVED"], ["IN_PROGRESS", "CANCELLED"], ["WAITING_FOR_REQUESTER", "IN_PROGRESS"], ["WAITING_FOR_REQUESTER", "RESOLVED"], ["WAITING_FOR_REQUESTER", "CANCELLED"], ["RESOLVED", "CLOSED"], ["RESOLVED", "REOPENED"], ["CLOSED", "REOPENED"], ["REOPENED", "IN_PROGRESS"], ["REOPENED", "WAITING_FOR_REQUESTER"], ["REOPENED", "CANCELLED"], ["CANCELLED", "REOPENED"]];
    for (const [from, to] of edges) {
      const ticket = await makeTicket(from);
      if (to === "RESOLVED") await completedAction(ticket.id, `evidence-${from}`);
      const auth = from === "NEW" ? administrator : staffAuth;
      const response = await transition(auth.agent, auth.csrfToken, ticket.id, to);
      expect(response.status, `${from} -> ${to}`).toBe(200);
      expect(response.body.currentStatus).toBe(to);
    }
    const ticket = await makeTicket("NEW");
    const allStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"];
    for (const from of allStatuses) {
      const invalid = await makeTicket(from as any);
      const forbidden = allStatuses.find((candidate) => candidate === from || !edges.some(([edgeFrom, edgeTo]) => edgeFrom === from && edgeTo === candidate))!;
      const response = await transition(staffAuth.agent, staffAuth.csrfToken, invalid.id, forbidden);
      expect(response.status, `${from} -> ${forbidden}`).toBe(409);
      expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
    }
    const unknown = await staffAuth.agent.patch(`/api/staff/tickets/${ticket.id}/status`).set("X-CSRF-Token", staffAuth.csrfToken).send({ status: "UNKNOWN", expectedVersion: 1 });
    expect(unknown.status).toBe(422);
    const requesterWrite = await requesterAuth.agent.patch(`/api/staff/tickets/${ticket.id}/status`).set("X-CSRF-Token", requesterAuth.csrfToken).send({ status: "OPEN", expectedVersion: 1 });
    expect(requesterWrite.status).toBe(403);
  });

  it("enforces the resolution gate, persists resolvedAt, and preserves it through close/reopen/re-resolution", async () => {
    const auth = await authenticatedAgent(staff.email, password);
    const noActions = await makeTicket();
    const before = await prisma.ticket.findUniqueOrThrow({ where: { id: noActions.id } });
    const blocked = await transition(auth.agent, auth.csrfToken, noActions.id, "RESOLVED");
    expect(blocked.status).toBe(409); expect(blocked.body.error.code).toBe("RESOLUTION_BLOCKED");
    expect(await prisma.ticket.findUniqueOrThrow({ where: { id: noActions.id }, select: { version: true, currentStatus: true } })).toEqual({ version: before.version, currentStatus: "IN_PROGRESS" });
    const onlyCancelled = await makeTicket();
    await prisma.actionTaken.create({ data: { ticketId: onlyCancelled.id, createdById: staff.id, actionDescription: "cancelled", result: "No work", status: "CANCELLED", followUpRequired: false, requestKey: `cancelled-${onlyCancelled.id}` } });
    expect((await transition(auth.agent, auth.csrfToken, onlyCancelled.id, "RESOLVED")).body.error.code).toBe("RESOLUTION_BLOCKED");
    const withDraft = await makeTicket();
    await completedAction(withDraft.id); await prisma.actionTaken.create({ data: { ticketId: withDraft.id, createdById: staff.id, actionDescription: "draft", status: "DRAFT", followUpRequired: false, requestKey: `draft-${withDraft.id}` } });
    expect((await transition(auth.agent, auth.csrfToken, withDraft.id, "RESOLVED")).body.error.code).toBe("RESOLUTION_BLOCKED");
    await prisma.actionTaken.updateMany({ where: { ticketId: withDraft.id, status: "DRAFT" }, data: { status: "CANCELLED", result: "Cancelled manually" } });
    const resolved = await transition(auth.agent, auth.csrfToken, withDraft.id, "RESOLVED");
    expect(resolved.status).toBe(200); expect(resolved.body.resolvedAt).toBeTruthy();
    const firstResolvedAt = resolved.body.resolvedAt;
    expect((await transition(auth.agent, auth.csrfToken, withDraft.id, "CLOSED")).status).toBe(200);
    const reopened = await transition(auth.agent, auth.csrfToken, withDraft.id, "REOPENED");
    expect(reopened.body.resolvedAt).toBe(firstResolvedAt);
    await transition(auth.agent, auth.csrfToken, withDraft.id, "IN_PROGRESS");
    const resolvedAgain = await transition(auth.agent, auth.csrfToken, withDraft.id, "RESOLVED");
    expect(resolvedAgain.status).toBe(200); expect(new Date(resolvedAgain.body.resolvedAt).getTime()).toBeGreaterThanOrEqual(new Date(firstResolvedAt).getTime());
  });

  it("cancels Draft Actions only and records requester advice as a versioned advisory", async () => {
    const auth = await authenticatedAgent(staff.email, password);
    const ticket = await makeTicket();
    const draft = await prisma.actionTaken.create({ data: { ticketId: ticket.id, createdById: staff.id, actionDescription: "draft", followUpRequired: true, followUpNote: "follow up", status: "DRAFT", requestKey: `draft-cancel-${ticket.id}` } });
    const terminal = await completedAction(ticket.id, "terminal");
    const alreadyCancelled = await prisma.actionTaken.create({ data: { ticketId: ticket.id, createdById: staff.id, actionDescription: "already cancelled", result: "terminal cancellation", status: "CANCELLED", followUpRequired: false, requestKey: `already-cancelled-${ticket.id}` } });
    const cancelled = await transition(auth.agent, auth.csrfToken, ticket.id, "CANCELLED");
    expect(cancelled.status).toBe(200);
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: draft.id }, select: { status: true, result: true, followUpRequired: true, followUpNote: true } })).toEqual({ status: "CANCELLED", result: "Cancelled because the Ticket was cancelled.", followUpRequired: false, followUpNote: null });
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: terminal.id }, select: { status: true, result: true } })).toEqual({ status: "COMPLETED", result: "Completed work" });
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: alreadyCancelled.id }, select: { status: true, result: true } })).toEqual({ status: "CANCELLED", result: "terminal cancellation" });
    expect((await transition(auth.agent, auth.csrfToken, ticket.id, "REOPENED")).status).toBe(200);
    expect(await prisma.actionTaken.findUniqueOrThrow({ where: { id: draft.id }, select: { status: true } })).toEqual({ status: "CANCELLED" });
    const newAction = await auth.agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", auth.csrfToken).send({ actionDescription: "new after reopen", followUpRequired: false, expectedTicketVersion: (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { version: true } })).version, requestKey: `new-after-reopen-${ticket.id}` });
    expect(newAction.status).toBe(201);
    const advice = await makeTicket("WAITING_FOR_REQUESTER");
    const requesterAuth = await authenticatedAgent(requester.email, password);
    const advised = await requesterAuth.agent.post(`/api/tickets/${advice.id}/problem-resolved`).set("X-CSRF-Token", requesterAuth.csrfToken).send({ expectedVersion: 1 });
    expect(advised.status).toBe(200); expect(advised.body.currentStatus).toBe("WAITING_FOR_REQUESTER"); expect(advised.body.requesterResolutionIndicatedByUserId).toBe(requester.id); expect(advised.body.version).toBe(2);
    const duplicate = await requesterAuth.agent.post(`/api/tickets/${advice.id}/problem-resolved`).set("X-CSRF-Token", requesterAuth.csrfToken).send({ expectedVersion: 2 });
    expect(duplicate.status).toBe(409); expect(duplicate.body.error.code).toBe("ALREADY_INDICATED");
    const foreign = await authenticatedAgent(otherRequester.email, password);
    expect((await foreign.agent.post(`/api/tickets/${advice.id}/problem-resolved`).set("X-CSRF-Token", foreign.csrfToken).send({ expectedVersion: 2 })).status).toBe(404);
  });

  it("serializes a Draft Action create against resolution so a resolved Ticket has no Draft Action", async () => {
    const auth = await authenticatedAgent(staff.email, password);
    const ticket = await makeTicket(); await completedAction(ticket.id, "existing-resolution-evidence");
    const create = auth.agent.post(`/api/staff/tickets/${ticket.id}/actions-taken`).set("X-CSRF-Token", auth.csrfToken).send({ actionDescription: "racing draft", followUpRequired: false, expectedTicketVersion: 1, requestKey: `race-${ticket.id}` });
    const resolve = transition(auth.agent, auth.csrfToken, ticket.id, "RESOLVED", 1);
    const [created, resolved] = await Promise.all([create, resolve]);
    expect([created.status, resolved.status]).not.toContain(500);
    const persisted = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true } });
    const drafts = await prisma.actionTaken.count({ where: { ticketId: ticket.id, status: "DRAFT" } });
    if (persisted.currentStatus === "RESOLVED") {
      expect(resolved.status).toBe(200); expect(created.status).toBe(409); expect(drafts).toBe(0);
    } else {
      expect(created.status).toBe(201); expect(resolved.status).toBe(409); expect(drafts).toBe(1);
    }
  });

  it("returns stale-update without partial writes for competing transition and indication requests", async () => {
    const auth = await authenticatedAgent(staff.email, password);
    const ticket = await makeTicket(); await completedAction(ticket.id);
    const [first, second] = await Promise.all([transition(auth.agent, auth.csrfToken, ticket.id, "RESOLVED", 1), transition(auth.agent, auth.csrfToken, ticket.id, "RESOLVED", 1)]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, select: { currentStatus: true, version: true } })).currentStatus).toBe("RESOLVED");
    const advice = await makeTicket("IN_PROGRESS"); const requesterAuth = await authenticatedAgent(requester.email, password);
    const stale = await requesterAuth.agent.post(`/api/tickets/${advice.id}/problem-resolved`).set("X-CSRF-Token", requesterAuth.csrfToken).send({ expectedVersion: 99 });
    expect(stale.status).toBe(409); expect(await prisma.ticket.findUniqueOrThrow({ where: { id: advice.id }, select: { requesterResolutionIndicatedAt: true, version: true } })).toEqual({ requesterResolutionIndicatedAt: null, version: 1 });
  });
});
