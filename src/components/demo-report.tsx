"use client";
import { useEffect, useState } from "react";
type Report={summary:{count:number;average:string|null};rows:{id:string;city:string;rating:number;comment:string;step:string;created_at:string}[]};
export function DemoReport(){
  const [data,setData]=useState<Report|null>(null),[error,setError]=useState("");
  useEffect(()=>{const c=new AbortController();fetch("/api/ops/demo-feedback",{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();setData(await r.json());}).catch(e=>{if(e.name!=="AbortError")setError("মতামত লোড হয়নি। ট্যাবটি আবার খুলুন।");});return()=>c.abort();},[]);
  if(error)return <p role="alert">{error}</p>;
  if(!data)return <p>মতামত লোড হচ্ছে...</p>;
  return <section><h2>ডেমোতে শিক্ষার্থীদের মতামত</h2><p>মোট {data.summary.count}টি · গড় স্কোর {data.summary.average||"-"}/৫</p><p className="ops-help">এগুলো শুধু ডেমোর মতামত। লাইভ ক্যাম্পেইনের সংখ্যা ও CRM-এ যোগ হয় না। সর্বশেষ ২০০টি দেখানো হচ্ছে।</p>
    {!data.rows.length?<p>এখনও কোনো মতামত আসেনি।</p>:<div className="ops-table-wrap"><table><thead><tr><th>শহর / ধাপ</th><th>স্কোর</th><th>মতামত</th><th>সময়</th></tr></thead><tbody>{data.rows.map(row=><tr key={row.id}><td>{row.city}<br/>{row.step}</td><td>{row.rating}/৫</td><td style={{whiteSpace:"pre-wrap",minWidth:220,maxWidth:500,overflowWrap:"anywhere"}}>{row.comment||"-"}</td><td>{new Date(row.created_at).toLocaleString("bn-BD",{timeZone:"Asia/Dhaka"})}</td></tr>)}</tbody></table></div>}
  </section>;
}
