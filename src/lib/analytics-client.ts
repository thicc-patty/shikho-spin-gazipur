type Item = {id:string;name:string;event:string;step:string};
const key = "alo-analytics-v1";
let ready = false, sending = false;
let queue: Item[] = [];
function persist() { try { localStorage.setItem(key,JSON.stringify(queue.slice(-80))); } catch {} }
export function analyticsReady() {
  if (!ready) {
    try { const saved=JSON.parse(localStorage.getItem(key)||"[]"); if(Array.isArray(saved)) queue=[...saved,...queue].slice(-80); } catch {}
  }
  ready=true; void flushAnalytics();
}
export function track(name:string,event:string,step:string) {
  queue.push({id:crypto.randomUUID(),name,event,step}); queue=queue.slice(-80); persist(); void flushAnalytics();
}
export async function flushAnalytics() {
  if (!ready || sending || !queue.length) return;
  sending=true;
  const batch=queue.slice(0,20);
  try {
    const res=await fetch("/api/analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({events:batch}),keepalive:true,signal:AbortSignal.timeout(12_000)});
    if(res.ok) {const ids=new Set(batch.map(e=>e.id));queue=queue.filter(e=>!ids.has(e.id));persist();}
  } catch {} finally {sending=false;}
}
