import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/drizzle/schema";

declare global {
  var __furrowSql: postgres.Sql | undefined;
  var __furrowDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}

type ErrorWithDetails = {
  cause?: unknown;
  code?: unknown;
  errors?: unknown;
};

function isErrorWithDetails(error: unknown): error is ErrorWithDetails {
  return typeof error === "object" && error !== null;
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!isErrorWithDetails(error)) {
    return false;
  }

  if (
    error.code === "ECONNREFUSED" ||
    error.code === "ECONNRESET" ||
    error.code === "ENOTFOUND" ||
    error.code === "ETIMEDOUT"
  ) {
    return true;
  }

  if (
    Array.isArray(error.errors) &&
    error.errors.some((entry) => isDatabaseConnectionError(entry))
  ) {
    return true;
  }

  return isDatabaseConnectionError(error.cause);
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
