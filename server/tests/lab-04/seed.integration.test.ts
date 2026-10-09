import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { migrationPath, withMigrationDatabase } from "../helpers/migration-test-database.js";

const run = promisify(execFile);
const migrations = ["20260812091441_init", "20260901064340_init_lab_02_schema", "20260917000000_lab3_user_auth", "20260918120000_issue19_queue", "20260918123000_issue19_cancelled_status", "20260918130000_issue19_status_filters", "20260919100000_issue20_resolution_indication", "20260920100000_issue22_comments_notes", "20261009090000_lab4_actions_taken"];

describe("Lab 4 seed repeatability", () => {
  it("preserves modified Users, Tickets, and Actions across two seed runs", async () => {
    await withMigrationDatabase(async (url, sql) => {
      for (const migration of migrations) await sql(await readFile(migrationPath(migration), "utf8"));
      await run("npx", ["tsx", "prisma/seed.ts"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url } });
      const prisma = new PrismaClient({ datasources: { db: { url } } });
      try {
        const user = await prisma.user.findUniqueOrThrow({ where: { email: "alice.smith@example.com" } });
        const ticket = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-2026-000001" } });
        const action = await prisma.actionTaken.findFirstOrThrow({ where: { requestKey: "lab4-action-001" } });
        const passwordHash = user.passwordHash;
        await prisma.user.update({ where: { id: user.id }, data: { role: "IT_STAFF", isActive: false, passwordHash } });
        await prisma.ticket.update({ where: { id: ticket.id }, data: { currentStatus: "CANCELLED", itPriority: "LOW", assignedToUserId: null } });
        await prisma.actionTaken.update({ where: { id: action.id }, data: { actionDescription: "User-modified Action" } });
        await run("npx", ["tsx", "prisma/seed.ts"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: url } });
        const afterUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
        const afterTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
        const afterAction = await prisma.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
        expect(afterUser).toMatchObject({ role: "IT_STAFF", isActive: false, passwordHash });
        expect(afterTicket).toMatchObject({ currentStatus: "CANCELLED", itPriority: "LOW", assignedToUserId: null });
        expect(afterAction.actionDescription).toBe("User-modified Action");
        expect(await prisma.actionTaken.count({ where: { requestKey: "lab4-action-001" } })).toBe(1);
        expect(await prisma.ticket.count({ where: { ticketNumber: "TKT-2026-000001" } })).toBe(1);
      } finally { await prisma.$disconnect(); }
    });
  });
});
