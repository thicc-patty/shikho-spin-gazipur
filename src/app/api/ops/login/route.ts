import { cookies } from "next/headers";
import { api, ApiError, body, cookieOptions, opsToken, rateLimit, safeEqual } from "@/lib/server/http";
export async function POST(req:Request){return api(async()=>{
  const data=await body(req);await rateLimit(req,"ops-login",10);
  if(typeof data.key!=="string"||!process.env.ALO_OPS_KEY||!safeEqual(data.key,process.env.ALO_OPS_KEY))throw new ApiError(401,"auth");
  (await cookies()).set("alo_ops",opsToken(),{...cookieOptions,maxAge:8*3600});return {ok:true};
});}
export async function DELETE(req:Request){return api(async()=>{await body(req);(await cookies()).delete("alo_ops");return {ok:true};});}
