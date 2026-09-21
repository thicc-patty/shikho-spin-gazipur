import { z } from "zod";
import { getEvent } from "@/lib/events";
import { sql } from "@/lib/server/db";
import { api, ApiError, body, requireSession } from "@/lib/server/http";
const Input = z.object({ events: z.array(z.object({
  id: z.uuid(), event: z.string().max(48),
  name: z.enum(["landing_view","registration_view","registration_started","registration_error","wheel_view","spin_started","spin_error","result_view","collection_view","draw_view","next_steps_view","share_opened","share_completed","share_cancelled","whatsapp_click","community_click","app_click","ticket_saved","stall_click","page_exit"]),
  step: z.enum(["welcome","register","wheel","result"]).optional(),
})).max(20) });
export async function POST(req: Request) {
  return api(async () => {
    const data = Input.safeParse(await body(req));
    if (!data.success) throw new ApiError(400,"invalid");
    const current = await requireSession();
    const [count] = await sql()`SELECT count(*)::int AS count FROM alo.analytics WHERE session_id=${current.id}`;
    if (count.count > 500) throw new ApiError(429,"rate_limit");
    // One lookup per distinct event and a single multi-row insert. A full
    // 20-event batch used to cost 41 round trips, on the hottest path there is.
    for (const id of new Set(data.data.events.map(e => e.event))) {
      if (!await getEvent(id)) throw new ApiError(404,"event");
    }
    const rows = data.data.events.map(event => ({
      id: event.id, session_id: current.id, entry_id: current.entry_id,
      event_id: event.event, name: event.name, detail: { step: event.step || null },
    }));
    await sql()`INSERT INTO alo.analytics ${sql()(rows,"id","session_id","entry_id","event_id","name","detail")} ON CONFLICT(id) DO NOTHING`;
    return { ok:true };
  });
}
