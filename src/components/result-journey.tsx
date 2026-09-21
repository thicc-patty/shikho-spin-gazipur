"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { APP_URL, COMMUNITY_URL, PRIZE_BY_ID, firstName, type EntryView } from "@/lib/game";
import { ticketImage } from "@/lib/share-ticket";
import { GiftCard } from "./gift-card";
import { Confetti, Icon } from "./icons";
const stages=["তোমার উপহার","সংগ্রহ করো","আরও বড় চমক","সাথে থাকো"];
export function ResultJourney({entry,demo,record,onReplay,onSpinAgain,page,onPageChange,onBack}:{entry:EntryView;demo:boolean;record:(name:string)=>void;onReplay:()=>void;onSpinAgain:()=>void;page:number;onPageChange:(page:number)=>void;onBack:()=>void}){
  const [status,setStatus]=useState(""),[busy,setBusy]=useState(false);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
  const heading=useRef<HTMLHeadingElement>(null),exportCard=useRef<HTMLDivElement>(null),imageFile=useRef<Promise<File>|null>(null);
  useEffect(()=>{if(exportCard.current){const pending=ticketImage(exportCard.current);imageFile.current=pending;void pending.catch(()=>{imageFile.current=null;});}},[]);
  const prize=PRIZE_BY_ID.get(entry.prizeId!)!;
  const expiry=entry.expiresAt?new Date(entry.expiresAt):null;
  useEffect(()=>{heading.current?.focus({preventScroll:true});record(["result_view","collection_view","draw_view","next_steps_view"][page]);},[page,record]);
  const getImage=()=>{if(!imageFile.current)imageFile.current=ticketImage(exportCard.current!).catch(e=>{imageFile.current=null;throw e;});return imageFile.current;};
  async function save(){setBusy(true);setStatus("");try{const file=await getImage(),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10_000);record("ticket_saved");setStatus("ছবি সেভ হয়েছে।");}catch{setStatus("ছবি সেভ হয়নি। আবার চেষ্টা করো।");}finally{setBusy(false);}}
  async function share(){
    setBusy(true);setStatus("");record("share_opened");
    const url=`${window.location.origin}/${demo?"demo":""}?event=${entry.event.id}&ref=friend`;
    const text=`শিখো স্পিনে ${prize.title} পেয়েছি! এবার তোমার পালা।`;
    try{const file=await getImage();
      if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:"আমার শিখো উপহার",text:text+" "+url});
      else if(navigator.share)await navigator.share({title:"আমার শিখো উপহার",text,url});
      else{await navigator.clipboard.writeText(text+" "+url);setStatus("লিংক কপি হয়েছে। বন্ধুকে পাঠিয়ে দাও!");}
      record("share_completed");
    }catch(e){if(e instanceof Error&&e.name==="AbortError")record("share_cancelled");else setStatus("শেয়ার হয়নি। আবার চেষ্টা করো বা ছবি সেভ করো।");}
    finally{setBusy(false);}
  }
  function next(){setStatus("");onPageChange(Math.min(3,page+1));}
  return <section className="result-story">
    <nav className="story-progress" aria-label="উপহারের পরের ধাপ"><button className="story-back" onClick={()=>{setStatus("");onBack();}} disabled={page===0} aria-label="আগের ধাপ"><Icon name="back" size={18}/></button><div>{stages.map((s,i)=><span key={s} className={i<=page?"seen":""} aria-current={i===page?"step":undefined} aria-label={s}/>)}</div><span>{page+1}/4</span></nav>
    <div className={`story-stage story-stage-${page}`}>
    <div className={`story-content story-page-${page}`} key={page}>
      {page===0&&<><Confetti/><h1 ref={heading} tabIndex={-1}>ইয়েস! চমকটা তোমার!</h1><p className="story-subtitle">{firstName(entry.name)}, অভিনন্দন!</p><div className="gift-display"><GiftCard entry={entry} demo={demo}/></div><button className="text-button save-gift" onClick={()=>void save()} disabled={busy}><Icon name="download" size={17}/>{busy?"ছবি তৈরি হচ্ছে...":status||"উপহারের ছবি সেভ করো"}</button></>}
      {page===1&&<><h1 ref={heading} tabIndex={-1}>{prize.kind==="discount"?<>ডিসকাউন্ট নিতে<br/><span>আমরাই কল করব!</span></>:<>উপহার নিতে<br/><span>শিখোর স্টলে এসো!</span></>}</h1><div className="collection-art"><Icon name={prize.kind==="discount"?"phone":"pin"} size={64}/><span>{prize.kind==="discount"?"শিখো টিম":"শিখো স্টল"}</span></div><p className="story-body">{prize.kind==="discount"?"তোমার দেওয়া নম্বরে কল করে ডিসকাউন্ট নিতে সাহায্য করব।":"কাছেই শিখোর স্টল খুঁজে দেখো। সেখানে নিচের কোডটি দেখাও।"}</p><div className="collection-code"><span>{prize.kind==="discount"?"কোডটি রেখে দাও":"স্টলে এই কোডটি দেখাও"}</span><strong>{entry.code}</strong><small>{prize.title}{expiry?"":""}</small></div>{expiry&&<div className={`collection-expiry ${expiry.getTime()<=now?"expired-offer":""}`}><div className="expiry-label"><Icon name="clock" size={20}/><strong>{expiry.getTime()<=now?"অফারের মেয়াদ শেষ":"অফারের মেয়াদ ৩ দিন"}</strong></div><p>অফার নেওয়ার শেষ সময়</p><time dateTime={expiry.toISOString()}><strong>{expiry.toLocaleDateString("bn-BD-u-nu-latn",{day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Dhaka"})}</strong><span>{expiry.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"Asia/Dhaka"})} <small>বাংলাদেশ সময়</small></span></time></div>}{entry.redeemedAt&&<p className="entry-confirmed">পুরস্কার সংগ্রহ করা হয়েছে</p>}</>}
      {page===2&&<><h1 ref={heading} tabIndex={-1}>আরও বড় চমক?<br/><span>EduTab!</span></h1><div className="edutab-reveal"><Image src="/brand/edutab-official.jpg" alt="শিখো ও Walpad-এর আসল EduTab, সামনে শেখার অ্যাপ এবং পেছনের ডিভাইস" width={800} height={446} sizes="(max-width: 700px) 100vw, 412px" loading="eager"/><div className="edutab-prize-strip"><Icon name="spark" size={20}/><strong>৩ জন জিতবে EduTab</strong><span>জাতীয় লাইভ ড্র</span></div></div><div className="edutab-specs"><div><strong>Helio G99</strong><span>অক্টা-কোর প্রসেসর</span></div><div><strong>৪ GB + ১২৮ GB</strong><span>RAM ও স্টোরেজ</span></div><div><strong>৮.৬″ HD</strong><span>বড় পর্দায় শেখা</span></div><div><strong>৬,০০০ mAh</strong><span>ব্যাটারি</span></div></div><h2>জাতীয় ড্র-তে তুমিও আছো!</h2><p className="story-body">তোমার নাম যোগ হয়েছে। অক্টোবরের মাঝামাঝি লাইভ ড্র।</p></>}
      {page===3&&<><h1 ref={heading} tabIndex={-1}>শেখা চলুক।<br/><span>একসাথে!</span></h1><a className="app-adventure" href={APP_URL} target="_blank" rel="noopener noreferrer" onClick={()=>record("app_click")}><div className="app-adventure-art"><span className="app-phone"><Icon name="phone" size={64}/><Icon name="spark" size={24}/></span><span className="app-float">চল, শিখি!</span></div><div><span>পড়াশোনা আরও সহজ</span><strong>শিখো অ্যাপেই!</strong><span className="app-adventure-cta">অ্যাপ ডাউনলোড করো <Icon name="arrow" size={20}/></span></div></a><button className="button secondary unified-share" onClick={()=>void share()} disabled={busy}><Icon name="share"/>{busy?"ছবি তৈরি হচ্ছে...":"চমকটা শেয়ার করো"}</button><a className="community-link" href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" onClick={()=>record("community_click")}><Icon name="group"/><span><strong>৪০ লক্ষ শিক্ষার্থী একসাথে শিখছে</strong><small className="community-cta">শিখবো জিতবো গ্রুপে যোগ দাও <Icon name="arrow" size={18}/></small></span><Icon name="arrow" size={18}/></a><button className="button secondary replay-button" onClick={onSpinAgain}>আবার খেলো <Icon name="spark" size={18}/></button><button className="text-button next-student" onClick={onReplay}>পরের শিক্ষার্থী <Icon name="back" size={18}/></button></>}
    </div>
    <div className="story-navigation">{status&&page!==0&&<p role="status">{status}</p>}{page<3?<button className="button primary" onClick={next}>{["উপহার কীভাবে পাবে?","EduTab ড্র দেখো","শেষ ধাপ দেখো"][page]}<Icon name="arrow"/></button>:<button className="text-button final-return" onClick={()=>{setStatus("");onPageChange(0);}}>তোমার উপহার দেখো <Icon name="back"/></button>}</div>
    </div>
    <div className="export-holder" aria-hidden="true"><div ref={exportCard} className="export-gift"><GiftCard entry={entry} demo={demo} share/></div></div>
  </section>;
}
