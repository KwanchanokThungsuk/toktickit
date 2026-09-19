import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent } from "../lab-02/auth-helper.js";

const prisma = getPrisma();
const password = "CommentsNotesTest1!";
let requester: { id: number; email: string }; let staff: { id: number; email: string }; let admin: { id: number; email: string };
let ticketId: number; let categoryId: number; let systemId: number;

describe("Issue #22 comments and internal notes", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const passwordHash = await hashPassword(password);
    requester = await prisma.user.create({ data: { name: "Comment Requester", email: `comment-requester-${suffix}@example.test`, passwordHash, role: "REQUESTER", mustChangePassword: false } });
    staff = await prisma.user.create({ data: { name: "Comment Staff", email: `comment-staff-${suffix}@example.test`, passwordHash, role: "IT_STAFF", mustChangePassword: false } });
    admin = await prisma.user.create({ data: { name: "Comment Admin", email: `comment-admin-${suffix}@example.test`, passwordHash, role: "ADMINISTRATOR", mustChangePassword: false } });
    categoryId = (await prisma.category.create({ data: { name: `Comment Category ${suffix}` } })).id;
    systemId = (await prisma.relatedSystem.create({ data: { name: `Comment System ${suffix}` } })).id;
    ticketId = (await prisma.ticket.create({ data: { ticketNumber: `TKT-COMMENT-${suffix}`, requesterId: requester.id, categoryId, relatedSystemId: systemId, summary: "Communication fixture", description: "Communication fixture description", requestedPriority: "MEDIUM", itPriority: "MEDIUM" } })).id;
  });
  afterAll(async () => { if (requester && staff && admin) { await prisma.publicComment.deleteMany({ where: { ticketId } }).catch(() => undefined); await prisma.internalNote.deleteMany({ where: { ticketId } }).catch(() => undefined); await prisma.ticket.delete({ where: { id: ticketId } }).catch(() => undefined); await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined); await prisma.relatedSystem.delete({ where: { id: systemId } }).catch(() => undefined); await prisma.user.deleteMany({ where: { id: { in: [requester.id, staff.id, admin.id] } } }).catch(() => undefined); } await prisma.$disconnect(); });

  it("allows owned Requester and IT Staff comments and preserves backend attribution", async () => {
    const requesterSession = await authenticatedAgent(requester.email, password);
    const created = await requesterSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", requesterSession.csrfToken).send({ body: "  A public update  ", authorId: admin.id, createdAt: "2000-01-01T00:00:00.000Z" });
    expect(created.status).toBe(201); expect(created.body.body).toBe("A public update"); expect(created.body.author.id).toBe(requester.id); expect(created.body.createdAt).not.toBe("2000-01-01T00:00:00.000Z");
    const staffSession = await authenticatedAgent(staff.email, password);
    const staffComment = await staffSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", staffSession.csrfToken).send({ body: "Staff update" });
    expect(staffComment.status).toBe(201);
    expect((await requesterSession.agent.get(`/api/tickets/${ticketId}/comments`)).status).toBe(200);
  });

  it("enforces Internal Note permissions and protects Requesters before lookup", async () => {
    const requesterSession = await authenticatedAgent(requester.email, password);
    expect((await requesterSession.agent.get(`/api/staff/tickets/${ticketId}/internal-notes`)).status).toBe(403);
    expect((await requesterSession.agent.post(`/api/staff/tickets/99999999/internal-notes`).set("X-CSRF-Token", requesterSession.csrfToken).send({ body: "hidden" })).status).toBe(403);
    const staffSession = await authenticatedAgent(staff.email, password);
    const created = await staffSession.agent.post(`/api/staff/tickets/${ticketId}/internal-notes`).set("X-CSRF-Token", staffSession.csrfToken).send({ body: "Staff-only note" });
    expect(created.status).toBe(201); expect((await staffSession.agent.get(`/api/staff/tickets/${ticketId}/internal-notes`)).body[0].body).toBe("Staff-only note");
    const adminSession = await authenticatedAgent(admin.email, password);
    expect((await adminSession.agent.get(`/api/staff/tickets/${ticketId}/internal-notes`)).status).toBe(200);
    expect((await adminSession.agent.post(`/api/staff/tickets/${ticketId}/internal-notes`).set("X-CSRF-Token", adminSession.csrfToken).send({ body: "no" })).status).toBe(403);
  });

  it("rejects blank and over-limit communication bodies without creating rows", async () => {
    const session = await authenticatedAgent(staff.email, password);
    for (const body of ["", "   ", "😀".repeat(2001)]) { expect((await session.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", session.csrfToken).send({ body })).status).toBe(422); expect((await session.agent.post(`/api/staff/tickets/${ticketId}/internal-notes`).set("X-CSRF-Token", session.csrfToken).send({ body })).status).toBe(422); }
    expect(await prisma.publicComment.count({ where: { ticketId, body: "" } })).toBe(0);
  });

  it("returns documented authorization and not-found responses for comments", async () => {
    const staffSession = await authenticatedAgent(staff.email, password);
    expect((await staffSession.agent.post("/api/tickets/99999999/comments").set("X-CSRF-Token", staffSession.csrfToken).send({ body: "missing" })).status).toBe(404);
    expect((await staffSession.agent.get("/api/tickets/99999999/comments")).status).toBe(404);
    const other = await prisma.user.create({ data: { name: "Other Comment Requester", email: `other-comment-${Date.now()}@example.test`, passwordHash: await hashPassword(password), role: "REQUESTER", mustChangePassword: false } });
    const otherSession = await authenticatedAgent(other.email, password);
    expect((await otherSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", otherSession.csrfToken).send({ body: "foreign" })).status).toBe(404);
    const adminSession = await authenticatedAgent(admin.email, password);
    expect((await adminSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", adminSession.csrfToken).send({ body: "forbidden" })).status).toBe(403);
    await prisma.user.delete({ where: { id: other.id } });
  });

  it("enforces the exact Unicode code-point boundaries for comments", async () => {
    const staffSession = await authenticatedAgent(staff.email, password);
    const accepted = await staffSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", staffSession.csrfToken).send({ body: "😀".repeat(2000) });
    expect(accepted.status).toBe(201);
    const rejected = await staffSession.agent.post(`/api/tickets/${ticketId}/comments`).set("X-CSRF-Token", staffSession.csrfToken).send({ body: "😀".repeat(2001) });
    expect(rejected.status).toBe(422);
  });

  it("rejects unauthenticated comment access", async () => {
    expect((await request(app).get(`/api/tickets/${ticketId}/comments`)).status).toBe(401);
    expect((await request(app).post(`/api/tickets/${ticketId}/comments`).send({ body: "anonymous" })).status).toBe(401);
  });
});
