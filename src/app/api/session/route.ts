import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { getEvent } from "@/lib/events";
import { sql } from "@/lib/server/db";
import { api, ApiError, body, cookieOptions, hash, rateLimit, session } from "@/lib/server/http";
import { entryView, type EntryRow } from "@/lib/server/entries";

export async function POST(req: Request) {
  return api(async () => {
    const data = await body(req);
    const event = await getEvent(typeof data.event === "string" ? data.event : undefined);
    if (!event) throw new ApiError(404, "event");
    let current = await session();
    if (!current) {
      await rateLimit(req, "session", 300);
      const token = randomBytes(32).toString("hex");
      const [created] = await sql()`INSERT INTO alo.sessions(id,token_hash,event_id) VALUES (${randomUUID()},${hash(token)},${event.id}) RETURNING id,event_id,entry_id`;
      current = { id: created.id, event_id: created.event_id, entry_id: created.entry_id };
      (await cookies()).set("alo_session", token, cookieOptions);
    }
    const [entry] = current.entry_id ? await sql()<EntryRow[]>`SELECT * FROM alo.entries WHERE id=${current.entry_id}` : [];
    return { ok: true, entry: entry ? entryView(entry) : null };
  });
}
