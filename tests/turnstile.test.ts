import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "../src/lib/server/turnstile";

test("Turnstile stays optional until a secret is configured",async()=>{
  const saved=process.env.TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  try{assert.equal(await verifyTurnstile(new Request("https://shikho-alo.vercel.app/api/register")),true);}
  finally{if(saved)process.env.TURNSTILE_SECRET_KEY=saved;}
});

test("Turnstile requires a valid register token when configured",async()=>{
  const savedSecret=process.env.TURNSTILE_SECRET_KEY,savedFetch=globalThis.fetch;
  process.env.TURNSTILE_SECRET_KEY="test-secret";
  try{
    assert.equal(await verifyTurnstile(new Request("https://shikho-alo.vercel.app/api/register")),false);
    globalThis.fetch=async(_input,init)=>{
      const sent=JSON.parse(String(init?.body));
      assert.equal(sent.secret,"test-secret");assert.equal(sent.response,"valid-token");
      return Response.json({success:true,action:"register",hostname:"shikho-alo.vercel.app"});
    };
    assert.equal(await verifyTurnstile(new Request("https://shikho-alo.vercel.app/api/register",{headers:{"x-vercel-forwarded-for":"203.0.113.7"}}),"valid-token"),true);
    globalThis.fetch=async()=>Response.json({success:true,action:"login",hostname:"shikho-alo.vercel.app"});
    assert.equal(await verifyTurnstile(new Request("https://shikho-alo.vercel.app/api/register"),"wrong-action"),false);
  }finally{
    globalThis.fetch=savedFetch;
    if(savedSecret)process.env.TURNSTILE_SECRET_KEY=savedSecret;else delete process.env.TURNSTILE_SECRET_KEY;
  }
});
