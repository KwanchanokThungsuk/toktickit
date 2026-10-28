import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { getDatabaseUrl } from "../../src/database-url.js";
const run = promisify(execFile);
const POSTGRES_COMMANDS = {
  psql: "psql",
  createdb: "createdb",
  dropdb: "dropdb",
} as const;

type PostgresCommand = keyof typeof POSTGRES_COMMANDS;

export async function runPostgresCommand(
  command: PostgresCommand,
  args: readonly string[],
) {
  const executable = POSTGRES_COMMANDS[command];
  try {
    return await run(executable, [...args]);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(
        `PostgreSQL CLI command '${executable}' was not found on PATH. Install PostgreSQL client tools or add them to PATH.`,
      );
    }
    throw error;
  }
}
function parts() { const value = getDatabaseUrl(); const parsed = new URL(value); const db = decodeURIComponent(parsed.pathname.slice(1)); if (!db) throw new Error("Test database URL has no database"); return { parsed, testDatabase: db }; }
export function quoteSql(value: string) { return `'${value.replaceAll("'", "''")}'`; }
export function migrationPath(name: string) { return path.resolve(process.cwd(), "prisma", "migrations", name, "migration.sql"); }
export async function withMigrationDatabase<T>(callback: (url: string, sql: (statement: string) => Promise<void>) => Promise<T>) {
  const { parsed: base, testDatabase } = parts();
  const name = `toktickit_migration_${process.pid}_${Date.now()}_${randomBytes(4).toString("hex")}`;
  if (name === testDatabase || testDatabase === name) throw new Error("Refusing unsafe temporary database name");
  const temp = new URL(base);
  temp.pathname = `/${name}`;
  temp.search = "";
  const connectionArgs = ["-h", base.hostname, "-p", String(base.port || 5432), "-U", decodeURIComponent(base.username)];
  await runPostgresCommand("createdb", [...connectionArgs, name]);
  try { const sql = async (statement: string) => { await runPostgresCommand("psql", [temp.toString(), "-v", "ON_ERROR_STOP=1", "-c", statement]); }; return await callback(temp.toString(), sql); }
  finally { await runPostgresCommand("dropdb", ["--if-exists", "--force", ...connectionArgs, name]).catch(() => undefined); }
}
