import { defineConfig } from "drizzle-kit";

console.log(process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/postgres");

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:password@localhost:5432/postgres",
  },
  strict: true,
  verbose: true,
});
