type DatabaseEnvironment = {
  nodeEnv?: string;
  databaseUrl?: string;
  testDatabaseUrl?: string;
};

function databaseIdentity(value: string): string {
  const url = new URL(value);
  const port = url.port || "5432";
  const protocol = url.protocol === "postgresql:" ? "postgres:" : url.protocol;
  return `${protocol}//${url.hostname.toLowerCase()}:${port}/${decodeURIComponent(url.pathname.slice(1))}`;
}

/** Select the database URL without allowing test processes to use development data. */
export function resolveDatabaseUrl(environment: DatabaseEnvironment): string {
  if (environment.nodeEnv !== "test") {
    if (!environment.databaseUrl) throw new Error("DATABASE_URL is required.");
    return environment.databaseUrl;
  }
  if (!environment.testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required when NODE_ENV=test; refusing to use DATABASE_URL.");
  }
  if (environment.databaseUrl && databaseIdentity(environment.testDatabaseUrl) === databaseIdentity(environment.databaseUrl)) {
    throw new Error("TEST_DATABASE_URL must target a different database than DATABASE_URL.");
  }
  return environment.testDatabaseUrl;
}

export function getDatabaseUrl(): string {
  return resolveDatabaseUrl({ nodeEnv: process.env.NODE_ENV, databaseUrl: process.env.DATABASE_URL, testDatabaseUrl: process.env.TEST_DATABASE_URL });
}
