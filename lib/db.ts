import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/drizzle/schema";

declare global {
  // eslint-disable-next-line no-var
  var __furrowSql: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __furrowDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

export function getSql() {
  if (!globalThis.__furrowSql) {
    globalThis.__furrowSql = postgres(getDatabaseUrl(), {
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__furrowSql;
}

export function getDb() {
  if (!globalThis.__furrowDb) {
    globalThis.__furrowDb = drizzle(getSql(), { schema });
  }

  return globalThis.__furrowDb;
}

export type Database = ReturnType<typeof getDb>;
