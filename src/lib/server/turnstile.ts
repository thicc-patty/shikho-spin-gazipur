import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { clientIp } from "./http";

const Response=z.object({success:z.boolean(),action:z.string().optional(),hostname:z.string().optional()});

export async function verifyTurnstile(req:Request,token?:string){
  const secret=process.env.TURNSTILE_SECRET_KEY;
  if(!secret)return true;
  if(!token||token.length>2048)return false;
  try{
    const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(8_000),
      body:JSON.stringify({secret,response:token,remoteip:clientIp(req),idempotency_key:randomUUID()}),
    });
    if(!response.ok)return false;
    const result=Response.parse(await response.json());
    const hostname=new URL(req.url).hostname;
    return result.success&&result.action==="register"&&(!result.hostname||result.hostname===hostname);
  }catch{return false;}
}
