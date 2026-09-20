"use client";
import { useEffect, useRef } from "react";

type TurnstileApi={render:(container:HTMLElement,options:Record<string,unknown>)=>string;remove:(widgetId:string)=>void};
declare global{interface Window{turnstile?:TurnstileApi}}

export function Turnstile({siteKey,onToken,resetKey}:{siteKey:string;onToken:(token:string)=>void;resetKey:number}){
  const holder=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!siteKey||!holder.current)return;
    let widgetId="",cancelled=false,timer:ReturnType<typeof setTimeout>;
    const render=()=>{
      if(cancelled||widgetId||!holder.current)return;
      if(!window.turnstile){timer=setTimeout(render,50);return;}
      widgetId=window.turnstile.render(holder.current,{
        sitekey:siteKey,action:"register",appearance:"interaction-only",size:"flexible",theme:"light",
        callback:(token:string)=>onToken(token),
        "expired-callback":()=>onToken(""),
        "error-callback":()=>{onToken("");return true;},
      });
    };
    let script=document.querySelector<HTMLScriptElement>('script[data-alo-turnstile]');
    if(!script){
      script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.defer=true;script.dataset.aloTurnstile="true";document.head.appendChild(script);
    }
    if(window.turnstile)render();else script.addEventListener("load",render,{once:true});
    return()=>{cancelled=true;clearTimeout(timer);script?.removeEventListener("load",render);if(widgetId)window.turnstile?.remove(widgetId);};
  },[siteKey,onToken,resetKey]);
  return <div className="turnstile-holder" ref={holder} aria-live="polite"/>;
}
