import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  schemaFilter: ["app"],
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL ?? "postgres://postgres@127.0.0.1:54329/alstore_dev",
  },
});
