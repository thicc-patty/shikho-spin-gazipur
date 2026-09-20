import "server-only";
import { z } from "zod";
import type { EventInfo } from "./game";
import { sql } from "./server/db";
const Schema = z.array(z.object({
  id: z.string().regex(/^[a-z0-9-]{1,48}$/), city: z.string().min(1).max(60),
  name: z.string().min(1).max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  crmReadyAt: z.coerce.string().nullable().optional(),
})).min(1);
export async function getEvents(): Promise<EventInfo[]> {
  const list = Schema.parse(await sql()`SELECT id,city,name,date,crm_ready_at AS "crmReadyAt" FROM alo.events ORDER BY date,id`);
  if (new Set(list.map(e => e.id)).size !== list.length) throw new Error("Duplicate event IDs");
  return list;
}
export async function getEvent(id?: string): Promise<EventInfo | undefined> {
  const [row] = id ? await sql()`SELECT id,city,name,date,crm_ready_at AS "crmReadyAt" FROM alo.events WHERE id=${id}`
    : await sql()`SELECT id,city,name,date,crm_ready_at AS "crmReadyAt" FROM alo.events WHERE active=true`;
  return row ? Schema.parse([row])[0] : undefined;
}
