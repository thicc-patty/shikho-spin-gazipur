import { api, requireOps } from "@/lib/server/http";
import { sql } from "@/lib/server/db";
export async function GET(){return api(async()=>{
  await requireOps();
  const rows=await sql()`SELECT f.id,f.event_id,e.city,f.rating,f.comment,f.step,f.created_at FROM alo.demo_feedback f
    LEFT JOIN alo.events e ON e.id=f.event_id ORDER BY f.created_at DESC LIMIT 200`;
  const [summary]=await sql()`SELECT count(*)::int AS count,round(avg(rating),1) AS average FROM alo.demo_feedback`;
  return {ok:true,rows,summary};
});}
