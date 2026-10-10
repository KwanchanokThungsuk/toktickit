import { describe, expect, it } from "vitest";
import { resolveDatabaseUrl } from "../src/database-url.js";

describe("test database isolation", () => {
  const development = "postgresql://user:secret@localhost:5432/toktickit";
  const testDatabase = "postgresql://user:secret@localhost:5432/toktickit_test";
  it("requires TEST_DATABASE_URL in test mode instead of falling back", () => {
    expect(() => resolveDatabaseUrl({ nodeEnv: "test", databaseUrl: development })).toThrow("TEST_DATABASE_URL is required when NODE_ENV=test");
  });
  it("rejects a test URL that identifies the development database", () => {
    expect(() => resolveDatabaseUrl({ nodeEnv: "test", databaseUrl: development, testDatabaseUrl: development })).toThrow("must target a different database");
  });
  it("uses the dedicated test URL in test mode", () => {
    expect(resolveDatabaseUrl({ nodeEnv: "test", databaseUrl: development, testDatabaseUrl: testDatabase })).toBe(testDatabase);
  });
});
