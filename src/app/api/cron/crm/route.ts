import { safeEqual } from "@/lib/server/http";
import { flushPendingCrm } from "@/lib/server/crm";
import { NextResponse } from "next/server";

export const maxDuration=60;
export async function GET(req:Request){
  const expected=process.env.CRON_SECRET||"";
  const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
  if(!expected||!supplied||!safeEqual(supplied,expected))return NextResponse.json({ok:false},{status:401});
  return NextResponse.json({ok:true,...await flushPendingCrm()},{headers:{"Cache-Control":"no-store"}});
}
