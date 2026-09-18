import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import path from "node:path";
const run = promisify(execFile);
const PSQL = "/Applications/Postgres.app/Contents/Versions/latest/bin/psql";
const CREATEDB = "/Applications/Postgres.app/Contents/Versions/latest/bin/createdb";
const DROPDB = "/Applications/Postgres.app/Contents/Versions/latest/bin/dropdb";
function parts() { const value = process.env.DATABASE_URL; if (!value) throw new Error("DATABASE_URL is required"); const parsed = new URL(value); const db = decodeURIComponent(parsed.pathname.slice(1)); if (!db) throw new Error("DATABASE_URL has no database"); return { parsed, developerDatabase: db }; }
export function quoteSql(value: string) { return `'${value.replaceAll("'", "''")}'`; }
export function migrationPath(name: string) { return path.resolve(process.cwd(), "prisma", "migrations", name, "migration.sql"); }
export async function withMigrationDatabase<T>(callback: (url: string, sql: (statement: string) => Promise<void>) => Promise<T>) {
  const { parsed: base, developerDatabase } = parts();
  const name = `toktickit_migration_${process.pid}_${Date.now()}_${randomBytes(4).toString("hex")}`;
  if (name === developerDatabase || developerDatabase === name) throw new Error("Refusing unsafe temporary database name");
  const temp = new URL(base);
  temp.pathname = `/${name}`;
  temp.search = "";
  const connectionArgs = ["-h", base.hostname, "-p", String(base.port || 5432), "-U", decodeURIComponent(base.username)];
  await run(CREATEDB, [...connectionArgs, name]);
  try { const sql = async (statement: string) => { await run(PSQL, [temp.toString(), "-v", "ON_ERROR_STOP=1", "-c", statement]); }; return await callback(temp.toString(), sql); }
  finally { await run(DROPDB, ["--if-exists", "--force", ...connectionArgs, name]).catch(() => undefined); }
}
