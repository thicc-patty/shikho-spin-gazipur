import { api, body, rateLimit } from "@/lib/server/http";
import { selectPrize } from "@/lib/server/selection";
export async function POST(req:Request) {
  return api(async()=>{
    await body(req);await rateLimit(req,"demo-spin",300);
    // No participant, inventory, analytics, draw or CRM mutation in demo mode.
    return {ok:true,prizeId:selectPrize()};
  });
}
