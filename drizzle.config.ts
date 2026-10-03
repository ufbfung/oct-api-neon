import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read .env.local on its own.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  // Direct (non-pooled) connection: migrations need session-level behavior.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
