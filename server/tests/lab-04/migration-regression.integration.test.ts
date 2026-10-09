import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { migrationPath, quoteSql, withMigrationDatabase } from "../helpers/migration-test-database.js";

const run = promisify(execFile);
const psql = "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";
const migrations = ["20260812091441_init", "20260901064340_init_lab_02_schema", "20260917000000_lab3_user_auth", "20260918120000_issue19_queue", "20260918123000_issue19_cancelled_status", "20260918130000_issue19_status_filters", "20260919100000_issue20_resolution_indication", "20260920100000_issue22_comments_notes", "20261009090000_lab4_actions_taken"];
async function scalar(url: string, statement: string) { return (await run(psql, [url, "-At", "-c", statement])).stdout.trim(); }

describe("Lab 4 additive migration", () => {
  it("preserves representative Lab 1-3 data and creates no historical Actions", async () => {
    await withMigrationDatabase(async (url, sql) => {
      for (const migration of migrations.slice(0, 8)) await sql(await readFile(migrationPath(migration), "utf8"));
      const suffix = `${process.pid}-${Date.now()}`; const email = `migration-${suffix}@example.com`;
      await sql(`INSERT INTO "User" ("name","email","isActive") VALUES ('Legacy User',${quoteSql(email)},true)`);
      const userId = Number(await scalar(url, `SELECT "id" FROM "User" WHERE "email"=${quoteSql(email)}`));
      await sql(`INSERT INTO "Category" ("name","isActive") VALUES ('Migration Category ${suffix}',true)`);
      await sql(`INSERT INTO "RelatedSystem" ("name","isActive") VALUES ('Migration System ${suffix}',true)`);
      const categoryId = Number(await scalar(url, `SELECT "id" FROM "Category" WHERE "name"='Migration Category ${suffix}'`));
      const systemId = Number(await scalar(url, `SELECT "id" FROM "RelatedSystem" WHERE "name"='Migration System ${suffix}'`));
      await sql(`INSERT INTO "Ticket" ("ticketNumber","requesterId","categoryId","relatedSystemId","summary","description","requestedPriority","currentStatus","assignedToUserId","updatedAt") VALUES ('TKT-MIG-${suffix}',${userId},${categoryId},${systemId},'Legacy summary','Legacy body','HIGH','NEW',NULL,CURRENT_TIMESTAMP)`);
      const ticketId = Number(await scalar(url, `SELECT "id" FROM "Ticket" WHERE "ticketNumber"='TKT-MIG-${suffix}'`));
      await sql(`INSERT INTO "Attachment" ("ticketId","originalFilename","storedFilename","contentType","fileSize","uploadedById") VALUES (${ticketId},'legacy.txt','legacy-${suffix}.txt','text/plain',12,${userId})`);
      await sql(`INSERT INTO "PublicComment" ("ticketId","authorId","body") VALUES (${ticketId},${userId},'Legacy public comment')`);
      await sql(`INSERT INTO "InternalNote" ("ticketId","authorId","body") VALUES (${ticketId},${userId},'Legacy internal note')`);
      for (const migration of migrations.slice(8)) await sql(await readFile(migrationPath(migration), "utf8"));
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try { const ticket = await prisma.ticket.findFirstOrThrow({ where: { summary: "Legacy summary" }, include: { requester: true, actionsTaken: true, attachments: true, publicComments: true, internalNotes: true } }); expect(ticket.requesterId).toBe(userId); expect(ticket.requester.id).toBe(userId); expect(ticket.description).toBe("Legacy body"); expect(ticket.requestedPriority).toBe("HIGH"); expect(ticket.currentStatus).toBe("NEW"); expect(ticket.assignedToUserId).toBeNull(); expect(ticket.version).toBe(1); expect(ticket.resolvedAt).toBeNull(); expect(ticket.actionsTaken).toHaveLength(0); expect(ticket.attachments).toHaveLength(1); expect(ticket.attachments[0].originalFilename).toBe("legacy.txt"); expect(ticket.publicComments).toHaveLength(1); expect(ticket.publicComments[0].body).toBe("Legacy public comment"); expect(ticket.internalNotes).toHaveLength(1); expect(ticket.internalNotes[0].body).toBe("Legacy internal note"); } finally { await prisma.$disconnect(); }
    });
  });
});
