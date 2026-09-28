import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { migrationPath, quoteSql, withMigrationDatabase } from "../helpers/migration-test-database.js";

const run = promisify(execFile);
const PSQL = "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";
const lab2 = ["20260812091441_init", "20260901064340_init_lab_02_schema"];
const lab3 = [
  "20260917000000_lab3_user_auth",
  "20260918120000_issue19_queue",
  "20260918123000_issue19_cancelled_status",
  "20260918130000_issue19_status_filters",
  "20260919100000_issue20_resolution_indication",
];
async function scalar(url: string, sql: string) { const result = await run(PSQL, [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql]); return result.stdout.trim(); }

describe("pre-existing Lab 2 Ticket and Attachment preservation across Lab 3 migration", () => {
  it("preserves the same IDs, data, ownership, and relationship after the real migrations", async () => {
    await withMigrationDatabase(async (url, sql) => {
      for (const migration of lab2) await sql(await readFile(migrationPath(migration), "utf8"));
      const suffix = `${process.pid}-${Date.now()}`; const email = `migration-${suffix}@example.com`; const categoryName = `Migration Category ${suffix}`; const systemName = `Migration System ${suffix}`; const ticketNumber = `TKT-MIGRATION-${suffix}`; const storedFilename = `migration-${suffix}.bin`;
      await sql(`INSERT INTO "RequesterUser" ("name", "email", "isActive") VALUES ('Existing Lab 2 Requester', ${quoteSql(email)}, true)`);
      const userId = Number(await scalar(url, `SELECT "id" FROM "RequesterUser" WHERE "email"=${quoteSql(email)}`));
      await sql(`INSERT INTO "Category" ("name", "isActive") VALUES (${quoteSql(categoryName)}, true)`); const categoryId = Number(await scalar(url, `SELECT "id" FROM "Category" WHERE "name"=${quoteSql(categoryName)}`));
      await sql(`INSERT INTO "RelatedSystem" ("name", "isActive") VALUES (${quoteSql(systemName)}, true)`); const systemId = Number(await scalar(url, `SELECT "id" FROM "RelatedSystem" WHERE "name"=${quoteSql(systemName)}`));
      await sql(`INSERT INTO "Ticket" ("ticketNumber", "requesterId", "categoryId", "relatedSystemId", "summary", "description", "requestedPriority", "currentStatus", "updatedAt") VALUES (${quoteSql(ticketNumber)}, ${userId}, ${categoryId}, ${systemId}, 'Existing Lab 2 ticket', 'Existing ticket description', 'HIGH', 'NEW', CURRENT_TIMESTAMP)`);
      const ticketId = Number(await scalar(url, `SELECT "id" FROM "Ticket" WHERE "ticketNumber"=${quoteSql(ticketNumber)}`));
      await sql(`INSERT INTO "Attachment" ("ticketId", "originalFilename", "storedFilename", "contentType", "fileSize", "uploadedById") VALUES (${ticketId}, 'existing.txt', ${quoteSql(storedFilename)}, 'text/plain', 17, ${userId})`);
      const attachmentId = Number(await scalar(url, `SELECT "id" FROM "Attachment" WHERE "ticketId"=${ticketId}`));
      for (const migration of lab3) await sql(await readFile(migrationPath(migration), "utf8"));
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try { const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: { requester: true, attachments: true } }); expect(ticket.id).toBe(ticketId); expect(ticket.requesterId).toBe(userId); expect(ticket.requester.id).toBe(userId); expect(ticket.ticketNumber).toBe(ticketNumber); expect(ticket.summary).toBe("Existing Lab 2 ticket"); expect(ticket.description).toBe("Existing ticket description"); expect(ticket.requestedPriority).toBe("HIGH"); expect(ticket.attachments).toHaveLength(1); expect(ticket.attachments[0]).toMatchObject({ id: attachmentId, ticketId, originalFilename: "existing.txt", storedFilename, contentType: "text/plain", fileSize: 17 }); } finally { await prisma.$disconnect(); }
    });
  });
});
