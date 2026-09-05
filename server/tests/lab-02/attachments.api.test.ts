import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Attachment lifecycle API", () => {
  let ticketId: number;
  let requesterId: number;
  let otherRequesterId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.attachment.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.requesterUser.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.relatedSystem.deleteMany({});
    const [owner, other, category, relatedSystem] = await Promise.all([
      prisma.requesterUser.create({ data: { name: "Attachment Owner", email: "attachment-owner@example.com", isActive: true } }),
      prisma.requesterUser.create({ data: { name: "Other Requester", email: "attachment-other@example.com", isActive: true } }),
      prisma.category.create({ data: { name: "Attachment Category", isActive: true } }),
      prisma.relatedSystem.create({ data: { name: "Attachment System", isActive: true } }),
    ]);
    requesterId = owner.id;
    otherRequesterId = other.id;
    const ticket = await prisma.ticket.create({ data: { ticketNumber: "TKT-2026-000001", requesterId, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: "Attachment lifecycle test ticket", description: "This description is long enough for attachment lifecycle testing.", requestedPriority: "MEDIUM", currentStatus: "NEW" } });
    ticketId = ticket.id;
  });

  function upload(filename = "screenshot.png", contentType = "image/png", body = Buffer.from("image data")) {
    return request(app).post(`/api/tickets/${ticketId}/attachments`).set("X-Requester-Id", String(requesterId)).attach("file", body, { filename, contentType });
  }

  it("AC-14 uploads a valid file and rejects an oversized file without a metadata row", async () => {
    const valid = await upload();
    expect(valid.status).toBe(201);
    expect(valid.body).toMatchObject({ ticketId, originalFilename: "screenshot.png", isRemoved: false });
    expect(valid.body.storedFilename).toBeUndefined();

    const oversized = await upload("large.png", "image/png", Buffer.alloc(5 * 1024 * 1024 + 1));
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe("FILE_TOO_LARGE");
    expect(await getPrisma().attachment.count({ where: { ticketId } })).toBe(1);
  });

  it("AC-15 rejects unsupported types and extension/content-type mismatches", async () => {
    const unsupported = await upload("notes.txt", "text/plain");
    expect(unsupported.status).toBe(400);
    expect(unsupported.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");

    const mismatch = await upload("report.pdf", "image/png");
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(await getPrisma().attachment.count({ where: { ticketId } })).toBe(0);
  });

  it("AC-16 counts only active attachments", async () => {
    for (let index = 0; index < 5; index += 1) expect((await upload(`file-${index}.png`)).status).toBe(201);
    const sixth = await upload("sixth.png");
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe("ATTACHMENT_LIMIT_REACHED");

    const firstAttachment = await getPrisma().attachment.findFirstOrThrow({ where: { ticketId } });
    await getPrisma().attachment.update({ where: { id: firstAttachment.id }, data: { isRemoved: true, removedAt: new Date(), removedById: requesterId, removedReason: "Wrong attachment" } });
    expect((await upload("replacement.png")).status).toBe(201);
  });

  it("AC-17 lists metadata and downloads an active owned attachment using the original filename", async () => {
    const created = await upload("battery-report.pdf", "application/pdf", Buffer.from("pdf content"));
    const metadata = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("X-Requester-Id", String(requesterId));
    expect(metadata.status).toBe(200);
    expect(metadata.body).toHaveLength(1);
    expect(metadata.body[0].storedFilename).toBeUndefined();

    const download = await request(app).get(`/api/attachments/${created.body.id}/download`).set("X-Requester-Id", String(requesterId));
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.headers["content-disposition"]).toContain('filename="battery-report.pdf"');
  });

  it("AC-18 and AC-20 soft-remove with a valid reason and reject a missing reason", async () => {
    const created = await upload();
    const missingReason = await request(app).patch(`/api/attachments/${created.body.id}/remove`).set("X-Requester-Id", String(requesterId)).send({ removedReason: " " });
    expect(missingReason.status).toBe(422);
    expect(missingReason.body.error.code).toBe("VALIDATION_ERROR");

    const removed = await request(app).patch(`/api/attachments/${created.body.id}/remove`).set("X-Requester-Id", String(requesterId)).send({ removedReason: "Uploaded the wrong screenshot" });
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ id: created.body.id, isRemoved: true, removedById: requesterId, removedReason: "Uploaded the wrong screenshot" });
    expect(removed.body.removedAt).toBeTruthy();
    expect(await getPrisma().attachment.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });

  it("AC-19 blocks a removed attachment download and re-removal", async () => {
    const created = await upload();
    await request(app).patch(`/api/attachments/${created.body.id}/remove`).set("X-Requester-Id", String(requesterId)).send({ removedReason: "Uploaded the wrong screenshot" });

    const download = await request(app).get(`/api/attachments/${created.body.id}/download`).set("X-Requester-Id", String(requesterId));
    expect(download.status).toBe(404);
    expect(download.body.error.code).toBe("NOT_FOUND");
    const repeatRemoval = await request(app).patch(`/api/attachments/${created.body.id}/remove`).set("X-Requester-Id", String(requesterId)).send({ removedReason: "Another valid reason" });
    expect(repeatRemoval.status).toBe(409);
    expect(repeatRemoval.body.error.code).toBe("ATTACHMENT_ALREADY_REMOVED");
  });

  it("uses requester-context errors and does not leak another requester's attachment", async () => {
    const created = await upload();
    const missing = await request(app).get(`/api/attachments/${created.body.id}/download`);
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("REQUESTER_CONTEXT_MISSING");
    const malformed = await request(app).get(`/api/tickets/${ticketId}/attachments`).set("X-Requester-Id", "not-a-number");
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("REQUESTER_CONTEXT_MISSING");

    const foreignDownload = await request(app).get(`/api/attachments/${created.body.id}/download`).set("X-Requester-Id", String(otherRequesterId));
    expect(foreignDownload.status).toBe(404);
    expect(foreignDownload.body.ticketId).toBeUndefined();
    expect(foreignDownload.body.originalFilename).toBeUndefined();
    const foreignRemove = await request(app).patch(`/api/attachments/${created.body.id}/remove`).set("X-Requester-Id", String(otherRequesterId)).send({ removedReason: "Not allowed reason" });
    expect(foreignRemove.status).toBe(404);
  });
});
