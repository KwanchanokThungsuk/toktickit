import { execFileSync } from "node:child_process";
import { getDatabaseUrl } from "../database-url.js";

const databaseUrl = getDatabaseUrl();

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});
