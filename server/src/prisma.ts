import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "./database-url.js";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = process.env.NODE_ENV === "test"
      ? new PrismaClient({ datasources: { db: { url: getDatabaseUrl() } } })
      : new PrismaClient();
  }
  return client;
}
