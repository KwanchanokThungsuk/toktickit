import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,js}"],
    env: { NODE_ENV: "test" },
    // API integration files share one database. Dashboard bucket assertions intentionally
    // aggregate every Ticket, so parallel files cannot provide a stable aggregate/drill-down
    // snapshot while they create and remove their own fixtures.
    fileParallelism: false,
  },
});
