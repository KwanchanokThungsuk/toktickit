import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/auth.js";
import { authenticatedAgent, csrfHeaders } from "./auth-helper.js";

const password = "Regression Password 1";
describe("Attachment lifecycle API", () => {
  const prisma = getPrisma(); let ticketId: number; let ownerEmail: string; let otherEmail: string; let ownerId: number; let otherId: number; let categoryId: number; let relatedSystemId: number; const extraUserIds: number[] = [];
  beforeEach(async () => {
    const suffix = Date.now().toString();
    const [owner, other, category, system] = await Promise.all([
      prisma.user.create({ data: { name: "Attachment Owner", email: `attachment-owner-${suffix}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } }),
      prisma.user.create({ data: { name: "Other Requester", email: `attachment-other-${suffix}@example.com`, role: "REQUESTER", isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } }),
      prisma.category.create({ data: { name: `Attachment Category ${suffix}`, isActive: true } }), prisma.relatedSystem.create({ data: { name: `Attachment System ${suffix}`, isActive: true } }),
    ]);
    ownerEmail = owner.email; otherEmail = other.email;
    ownerId = owner.id; otherId = other.id; categoryId = category.id; relatedSystemId = system.id;
    const ticket = await prisma.ticket.create({ data: { ticketNumber: `TKT-${suffix}`, requesterId: owner.id, categoryId: category.id, relatedSystemId: system.id, summary: "Attachment lifecycle test ticket", description: "This description is long enough for attachment lifecycle testing.", requestedPriority: "MEDIUM", currentStatus: "NEW" } }); ticketId = ticket.id;
  });
  afterEach(async () => {
    const attachments = ticketId ? await prisma.attachment.findMany({ where: { ticketId }, select: { id: true, storedFilename: true } }) : [];
    await prisma.attachment.deleteMany({ where: { id: { in: attachments.map((attachment) => attachment.id) } } });
    await Promise.all(attachments.map((attachment) => unlink(path.resolve(process.cwd(), ".data", "attachments", attachment.storedFilename)).catch(() => undefined)));
    if (ticketId) await prisma.ticket.deleteMany({ where: { id: ticketId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, otherId, ...extraUserIds.splice(0)] } } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
    await prisma.relatedSystem.deleteMany({ where: { id: relatedSystemId } });
  });
  async function ownerSession() { return authenticatedAgent(ownerEmail, password); }
  it("uploads and lists metadata, then preserves original filename on download", async () => { const { agent, csrfToken } = await ownerSession(); const created = await agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(csrfToken)).attach("file", Buffer.from("image data"), { filename: "screenshot.png", contentType: "image/png" }); expect(created.status).toBe(201); expect(created.body).toMatchObject({ ticketId, originalFilename: "screenshot.png", isRemoved: false }); expect(created.body.storedFilename).toBeUndefined(); const list = await agent.get(`/api/tickets/${ticketId}/attachments`); expect(list.status).toBe(200); expect(list.body[0].storedFilename).toBeUndefined(); const download = await agent.get(`/api/attachments/${created.body.id}/download`); expect(download.status).toBe(200); expect(download.headers["content-disposition"]).toContain('filename="screenshot.png"'); });
  it("rejects unsupported types and oversized files", async () => {
    const { agent, csrfToken } = await ownerSession();

    const unsupported = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(csrfHeaders(csrfToken))
      .attach("file", Buffer.from("text"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(unsupported.status).toBe(400); expect(unsupported.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");

    const large = await agent
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(csrfHeaders(csrfToken))
      .attach(
        "file",
        Buffer.alloc(5 * 1024 * 1024 + 1),
        {
          filename: "large.png",
          contentType: "image/png",
        },
      );

    expect(large.status).toBe(413);
  });
  it("rejects extension/content-type mismatches with the contract error", async () => { const { agent, csrfToken } = await ownerSession(); const response = await agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(csrfToken)).attach("file", Buffer.from("not a pdf"), { filename: "report.pdf", contentType: "image/png" }); expect(response.status).toBe(400); expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE"); expect(await prisma.attachment.count({ where: { ticketId } })).toBe(0); });
  it("enforces five active attachments and allows replacement after removal", async () => { const owner = await ownerSession(); for (let i = 0; i < 5; i += 1) { expect((await owner.agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(owner.csrfToken)).attach("file", Buffer.from(String(i)), { filename: `file-${i}.png`, contentType: "image/png" })).status).toBe(201); } const sixth = await owner.agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(owner.csrfToken)).attach("file", Buffer.from("sixth"), { filename: "sixth.png", contentType: "image/png" }); expect(sixth.status).toBe(409); expect(sixth.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED"); const first = await prisma.attachment.findFirstOrThrow({ where: { ticketId } }); expect((await owner.agent.patch(`/api/attachments/${first.id}/remove`).set(csrfHeaders(owner.csrfToken)).send({ removedReason: "Replacement" })).status).toBe(200); expect((await owner.agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(owner.csrfToken)).attach("file", Buffer.from("replacement"), { filename: "replacement.png", contentType: "image/png" })).status).toBe(201); });
  it("validates and soft-removes, preserves the row, and blocks repeat/download/foreign access", async () => { const owner = await ownerSession(); const created = await owner.agent.post(`/api/tickets/${ticketId}/attachments`).set(csrfHeaders(owner.csrfToken)).attach("file", Buffer.from("image"), { filename: "report.png", contentType: "image/png" }); const missing = await owner.agent.patch(`/api/attachments/${created.body.id}/remove`).set(csrfHeaders(owner.csrfToken)).send({ removedReason: " " }); expect(missing.status).toBe(422); expect(missing.body.error.code).toBe("VALIDATION_ERROR"); const removed = await owner.agent.patch(`/api/attachments/${created.body.id}/remove`).set(csrfHeaders(owner.csrfToken)).send({ removedReason: "Uploaded the wrong screenshot" }); expect(removed.status).toBe(200); expect(removed.body.isRemoved).toBe(true); expect(await prisma.attachment.findUnique({ where: { id: created.body.id } })).not.toBeNull(); expect((await owner.agent.get(`/api/attachments/${created.body.id}/download`)).status).toBe(404); const repeat = await owner.agent.patch(`/api/attachments/${created.body.id}/remove`).set(csrfHeaders(owner.csrfToken)).send({ removedReason: "Again" }); expect(repeat.status).toBe(409); const other = await authenticatedAgent(otherEmail, password); expect((await other.agent.get(`/api/attachments/${created.body.id}/download`)).status).toBe(404); });
  it.each([["IT_STAFF"], ["ADMINISTRATOR"]])("rejects %s attachment access", async (role) => { const user = await prisma.user.create({ data: { name: `Attachment ${role}`, email: `attachment-${role.toLowerCase()}-${Date.now()}@example.com`, role, isActive: true, mustChangePassword: false, passwordHash: await hashPassword(password) } }); extraUserIds.push(user.id); const session = await authenticatedAgent(user.email, password); expect((await session.agent.get(`/api/tickets/${ticketId}/attachments`)).status).toBe(403); });
});
