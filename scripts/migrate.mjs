import { readFileSync } from "node:fs";
import postgres from "postgres";
const db = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
try {
  await db.unsafe(readFileSync(new URL("../sql/001-portal.sql", import.meta.url), "utf8"));
  await db.unsafe(readFileSync(new URL("../sql/002-demo.sql", import.meta.url), "utf8"));
  await db.unsafe(readFileSync(new URL("../sql/003-crm-delivery.sql", import.meta.url), "utf8"));
  await db.unsafe(readFileSync(new URL("../sql/004-class-level.sql", import.meta.url), "utf8"));
  await db.unsafe(readFileSync(new URL("../sql/005-gazipur.sql", import.meta.url), "utf8"));
  await db.unsafe(readFileSync(new URL("../sql/006-analytics-session-index.sql", import.meta.url), "utf8"));
  console.log("Shikho Alo schema ready.");
} finally { await db.end(); }
