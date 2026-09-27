import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";

const initialPassword = "ChangeMe123!";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync("server/.env", "utf8");
  const match = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
  if (!match) throw new Error("E2E setup requires DATABASE_URL");
  return match[1];
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }).toString("hex");
  return `scrypt$32768$8$1$${salt}:${hash}`;
}

export default async function prepareAccounts() {
  const databaseUrl = loadDatabaseUrl();
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName || databaseName === "toktickit" || databaseName === "postgres") {
    throw new Error(`Refusing E2E account setup for unsafe database: ${databaseName || "unknown"}`);
  }

  process.env.DATABASE_URL = databaseUrl;
  const prisma = new PrismaClient();
  try {
    const accounts = [
      ["e2e.requester@example.com", "E2E Requester", "REQUESTER", false],
      ["e2e.staff@example.com", "E2E IT Staff", "IT_STAFF", false],
      ["e2e.admin@example.com", "E2E Administrator", "ADMINISTRATOR", false],
      ["e2e.password-change@example.com", "E2E Password Change", "REQUESTER", true],
    ] as const;

    for (const [email, name, role, mustChangePassword] of accounts) {
      await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role,
          isActive: true,
          passwordHash: hashPassword(initialPassword),
          mustChangePassword,
        },
        create: {
          email,
          name,
          role,
          isActive: true,
          passwordHash: hashPassword(initialPassword),
          mustChangePassword,
        },
      });
    }

    const requester = await prisma.user.findUniqueOrThrow({ where: { email: "e2e.requester@example.com" } });
    const staff = await prisma.user.findUniqueOrThrow({ where: { email: "e2e.staff@example.com" } });
    const category = await prisma.category.upsert({ where: { name: "E2E Support" }, update: { isActive: true }, create: { name: "E2E Support", isActive: true } });
    const relatedSystem = await prisma.relatedSystem.upsert({ where: { name: "E2E Platform" }, update: { isActive: true }, create: { name: "E2E Platform", isActive: true } });
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: "E2E-2026-000001" },
      update: { requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, assignedToUserId: null, summary: "E2E workflow fixture", description: "Deterministic ticket for Lab 3 browser workflows.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" },
      create: { ticketNumber: "E2E-2026-000001", requesterId: requester.id, categoryId: category.id, relatedSystemId: relatedSystem.id, summary: "E2E workflow fixture", description: "Deterministic ticket for Lab 3 browser workflows.", requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "NEW" },
    });
    const publicBody = "E2E fixture public comment";
    if (!await prisma.publicComment.findFirst({ where: { ticketId: ticket.id, body: publicBody } })) await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: requester.id, body: publicBody } });
    const noteBody = "E2E fixture internal note";
    if (!await prisma.internalNote.findFirst({ where: { ticketId: ticket.id, body: noteBody } })) await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: staff.id, body: noteBody } });
    writeFileSync("/tmp/toktickit-lab3-e2e-ticket.json", JSON.stringify({ ticketId: ticket.id }), "utf8");
  } finally {
    await prisma.$disconnect();
  }
}
