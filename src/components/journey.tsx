"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { CLASS_LEVELS, NO_GROUP, PRIZES, STUDY_GROUPS, firstName, needsStudyGroup, normalizePhone, prizeRank, wheelTarget, type EntryView, type EventInfo } from "@/lib/game";
import { analyticsReady, flushAnalytics, track } from "@/lib/analytics-client";
import { ResultJourney } from "./result-journey";
import { Icon, PrizeArt } from "./icons";
import { createPrizeCode } from "@/lib/prize-code";
import { Wheel } from "./wheel";
import { Turnstile } from "./turnstile";

type Step = "welcome" | "register" | "wheel" | "result";
const errors: Record<string,string> = {
  phone:"১১ সংখ্যার সঠিক মোবাইল নম্বর দাও। যেমন 01712345678।",
  already_registered:"এই নম্বর দিয়ে আগেই অংশ নেওয়া হয়েছে। আগের ফোন ও ব্রাউজারে টিকিটটি পাবে। দরকার হলে শিখো স্টলে এসো।",
  device_registered:"এই ব্রাউজারে একটি এন্ট্রি আছে। আগের টিকিটেই ফিরে যাও।",
  rate_limit:"কয়েক মিনিট পর আবার চেষ্টা করো।",
  session:"সংযোগটি নতুন করে চালু করতে পেজটি রিফ্রেশ করো। তোমার সংরক্ষিত পুরস্কার বদলাবে না।",
  unavailable:"সংযোগে সমস্যা হচ্ছে। আবার চেষ্টা করো।",
  bot_check:"নিরাপত্তা যাচাই হয়নি। আবার চেষ্টা করো।",
};
/** The event this browser is playing, so a lost session can be reopened silently. */
let sessionEvent="";
async function request(path:string,data:unknown,retried=false) {
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),signal:AbortSignal.timeout(20_000)});
  const result=await response.json();
  if(!response.ok) {
    // A session can disappear for reasons the student had no part in: the device
    // released itself, the cookie was cleared, the row expired. Telling them to
    // refresh loses the name, phone and class they just typed, and nobody at a
    // stall reads an error message. Reopen a session and submit again, once.
    // Registration only: a spin needs the entry the old session was holding, and
    // a fresh one cannot have it, so retrying there would only change the error.
    // Skipped when a Turnstile token is in play, because it is single use.
    const lostSession=response.status===401&&result.error==="session";
    const safeToRetry=!retried&&sessionEvent&&path==="/api/register"&&!(data as {turnstile?:string})?.turnstile;
    if(lostSession&&safeToRetry){
      await request("/api/session",{event:sessionEvent},true);
      return request(path,data,true);
    }
    throw new Error(result.error || "unavailable");
  }
  return result;
}
export function Journey({ event, demo=false,turnstileSiteKey="" }: { event:EventInfo; demo?:boolean;turnstileSiteKey?:string }) {
  const [step,setStep]=useState<Step>("welcome");
  const [entry,setEntry]=useState<EntryView|null>(null);
  const [ready,setReady]=useState(demo),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[group,setGroup]=useState(""),[consent,setConsent]=useState(false);
  const [classLevel,setClassLevel]=useState("");
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [turnstile,setTurnstile]=useState(""),[turnstileReset,setTurnstileReset]=useState(0);
  const [rotation,setRotation]=useState(-12),[duration,setDuration]=useState(0),[spinning,setSpinning]=useState(false);
  const [message,setMessage]=useState("");
  const [formPage,setFormPage]=useState(0),[resultPage,setResultPage]=useState(0),[replaying,setReplaying]=useState(false);
  const historyRun=useRef(0);
  const initialized=useRef(false),started=useRef(false),spinLock=useRef(false),rotationRef=useRef(-12);
  const heading=useRef<HTMLHeadingElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const drag=useRef<{angle:number;time:number;velocity:number;distance:number;rotation:number;pointer:number}|null>(null);
  const activeEvent=entry?.event || event;
  // Classes six to eight have no study group, so their registration is two pages instead of three.
  // The page count starts at the longer path so the indicator never grows, only settles once a class is chosen.
  const groupNeeded=needsStudyGroup(classLevel),lastFormPage=groupNeeded?2:1,formPages=classLevel?lastFormPage+1:3;
  const page=Math.min(formPage,lastFormPage),finalPage=!!classLevel&&page===lastFormPage;
  const record=useCallback((action:string,where:Step=step)=>{if(!demo)track(action,event.id,where);},[event.id,step,demo]);
  const restore=useCallback(async()=>{
    setError("");sessionEvent=event.id;
    try {
      const data=await request("/api/session",{event:event.id});
      setReady(true);analyticsReady();
      // Releasing the device on load must hand the next student a working
      // session, not none at all. Deleting and returning left the browser with
      // no session: the student filled in every step and only found out at the
      // final tap, when register answered 401. nextStudent() already reopens
      // one through restore(); this path has to do the same.
      if(data.entry&&data.entry.prizeId){
        await fetch("/api/session",{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});
        await request("/api/session",{event:event.id});
        return;
      }
      if(data.entry) { setEntry(data.entry);setName(data.entry.name);setGroup(data.entry.group);setClassLevel(data.entry.classLevel||"");setStep(data.entry.prizeId?"result":"wheel");window.history.replaceState({...window.history.state,alo:{step:data.entry.prizeId?"result":"wheel",form:0,result:0,run:historyRun.current}},"",window.location.pathname+window.location.search); }
    } catch {setError("সংযোগ হচ্ছে না। ইন্টারনেট দেখে আবার চেষ্টা করো।");}
  },[event.id]);
  useEffect(()=>{if(!demo&&!initialized.current){initialized.current=true;void restore();}},[restore,demo]);
  useEffect(()=>{
    if(ready&&step!=="result") record({welcome:"landing_view",register:"registration_view",wheel:"wheel_view",result:"result_view"}[step]);
  },[step,ready,record]);
  useEffect(()=>{
    heading.current?.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:"instant"});
  },[step,formPage,resultPage]);
  useEffect(()=>{
    if(demo)return;
    const hide=()=>{if(document.visibilityState==="hidden")record("page_exit");};
    document.addEventListener("visibilitychange",hide);
    window.addEventListener("online",flushAnalytics);
    const interval=setInterval(()=>{void flushAnalytics();},15_000);
    return()=>{document.removeEventListener("visibilitychange",hide);window.removeEventListener("online",flushAnalytics);clearInterval(interval);};
  },[record,demo]);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  function navigate(next:Step,form=0,result=0){
    if(entry?.prizeId&&next!=="result"&&next!=="wheel"){next="result";result=0;}
    setError("");setMessage("");setStep(next);setFormPage(form);setResultPage(result);
    window.history.pushState({...window.history.state,alo:{step:next,form,result,run:historyRun.current}},"",`#${next}-${next==="register"?form+1:next==="result"?result+1:1}`);
  }
  function move(next:Step){navigate(next);}
  function spinAgain(){setRotation(-12);rotationRef.current=-12;setDuration(0);navigate("wheel");}
  useEffect(()=>{
    window.history.replaceState({...window.history.state,alo:{step:"welcome",form:0,result:0,run:0}},"",window.location.pathname+window.location.search);
  },[]);
  useEffect(()=>{
    const back=(event:PopStateEvent)=>{
      const saved=event.state?.alo;
      let next:Step=saved?.run===historyRun.current?saved.step:"welcome";
      if(!["welcome","register","wheel","result"].includes(next))next="welcome";
      if(spinLock.current)next="wheel";
      else if(entry?.prizeId)next="result";
      else if((next==="wheel"||next==="result")&&!entry)next="welcome";
      else if(next==="result")next="wheel";
      setStep(next);setFormPage(next==="register"?Math.min(2,Math.max(0,saved?.form||0)):0);
      setResultPage(next==="result"&&saved?.step==="result"?Math.min(3,Math.max(0,saved.result||0)):0);
      setError("");setMessage("");
    };
    window.addEventListener("popstate",back);return()=>window.removeEventListener("popstate",back);
  },[entry]);
  function formStarted(){if(!started.current){started.current=true;record("registration_started");}}
  async function register(e:FormEvent) {
    e.preventDefault();if(busy)return;
    const issues:Record<string,string>={};
    if(name.trim().length<2)issues.name="তোমার নাম লেখো।";
    if(!normalizePhone(phone))issues.phone=errors.phone;
    if(page>=1&&!classLevel)issues.classLevel="তোমার ক্লাস বেছে নাও।";
    if(page>=1&&!consent)issues.consent="এগোতে সম্মতি দাও।";
    if(page===2&&!group)issues.group="তোমার বিভাগটি বেছে নাও।";
    setFieldErrors(issues);
    if(Object.keys(issues).length){
      record("registration_error");
      // Class and consent live on the earlier page; send the student back rather than to a hidden field.
      if(page===2&&(issues.classLevel||issues.consent)){navigate("register",1);return;}
      document.getElementById(Object.keys(issues)[0])?.focus();return;
    }
    if(!finalPage){navigate("register",page+1);return;}
    const studyGroup=groupNeeded?group:NO_GROUP;
    setBusy(true);setError("");
    try{if(demo){setEntry({name:name.trim(),group:studyGroup,classLevel,event,prizeId:null,code:null,wonAt:null,expiresAt:null,redeemedAt:null});move("wheel");return;}const data=await request("/api/register",{name,phone,group:studyGroup,classLevel,event:event.id,consent,turnstile:turnstile||undefined});setEntry(data.entry);move(data.entry.prizeId?"result":"wheel");}
    catch(err){setError(errors[err instanceof Error?err.message:""]||errors.unavailable);setTurnstile("");setTurnstileReset(value=>value+1);record("registration_error");}
    finally{setBusy(false);}
  }
  async function spin(speed=0.6) {
    if(spinLock.current||!entry)return;
    spinLock.current=true;setSpinning(true);setError("");setMessage("তোমার চমক আসছে...");record("spin_started");
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Immediate movement acknowledges the gesture while the server commits the prize.
    const waitingAngle=rotationRef.current+(reduced?0:900+Math.min(speed,3)*180);
    setDuration(reduced?0:1800);setRotation(waitingAngle);rotationRef.current=waitingAngle;
    try {
      const data=await request(demo?"/api/demo/spin":"/api/spin",{});
      const kept=demo&&prizeRank(data.prizeId)<=prizeRank(entry.prizeId)?entry.prizeId!:data.prizeId;
      const won:EntryView=demo?{...entry,prizeId:kept,code:entry.code||createPrizeCode(entry.name,phone),wonAt:entry.wonAt||new Date().toISOString(),expiresAt:kept.startsWith("discount-")?(entry.expiresAt||new Date(Date.now()+72*3600_000).toISOString()):null}:data.entry;
      const turns=5+Math.min(7,Math.floor(speed*3));
      const finish=wheelTarget(PRIZES.findIndex(p=>p.id===won.prizeId),rotationRef.current,turns);
      const ms=reduced?80:4600+Math.min(speed,3)*220;
      setDuration(ms);setRotation(finish);rotationRef.current=finish;
      navigator.vibrate?.(18);
      timer.current=setTimeout(()=>{setEntry(won);setSpinning(false);spinLock.current=false;setMessage("");move("result");navigator.vibrate?.([30,40,50]);},ms+80);
    } catch(err){spinLock.current=false;setSpinning(false);setMessage("");setError(errors[err instanceof Error?err.message:""]||errors.unavailable);record("spin_error");}
  }
  function pointerAngle(e:PointerEvent<HTMLDivElement>) {
    const r=e.currentTarget.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)*180/Math.PI;
  }
  function pointerDown(e:PointerEvent<HTMLDivElement>) {
    if(spinLock.current||e.button!==0)return;
    e.currentTarget.setPointerCapture(e.pointerId);setDuration(0);
    drag.current={angle:pointerAngle(e),time:performance.now(),velocity:0,distance:0,rotation:rotationRef.current,pointer:e.pointerId};
  }
  function pointerMove(e:PointerEvent<HTMLDivElement>) {
    const d=drag.current;if(!d||d.pointer!==e.pointerId||spinLock.current)return;
    const a=pointerAngle(e),now=performance.now();let delta=a-d.angle;
    if(delta>180)delta-=360;if(delta< -180)delta+=360;
    d.velocity=.4*d.velocity+.6*Math.abs(delta)/Math.max(now-d.time,1);d.distance+=Math.abs(delta);
    d.rotation+=delta;d.angle=a;d.time=now;rotationRef.current=d.rotation;setRotation(d.rotation);
  }
  function pointerUp(e:PointerEvent<HTMLDivElement>){const d=drag.current;drag.current=null;if(d&&d.pointer===e.pointerId&&d.distance>14)void spin(d.velocity);}
  // Staff hand the device on. The entry, prize and code stay in the database.
  async function nextStudent(){
    if(!demo)await fetch("/api/session",{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"}).catch(()=>{});
    restartDemo();
    if(!demo){initialized.current=false;setReady(false);void restore();}
  }
  function restartDemo(){historyRun.current++;setReplaying(true);setEntry(null);setName("");setPhone("");setGroup("");setClassLevel("");setConsent(false);setFieldErrors({});setFormPage(0);setRotation(-12);rotationRef.current=-12;setDuration(0);started.current=false;setStep("welcome");setResultPage(0);window.history.pushState({...window.history.state,alo:{step:"welcome",form:0,result:0,run:historyRun.current}},"","#welcome-1");}
  return <div className={`portal screen-journey step-${step}`} data-ready={ready}>
    <header className="site-header">
      <a href={`${demo?"/demo":"/"}?event=${event.id}`} className="brand-link" aria-label="শিখো স্পিন হোম"><Image src="/brand/shikho-logo.png" alt="শিখো" width={100} height={51} priority/></a>
      <div className="header-actions"><span className="location"><Icon name="pin" size={17}/>{activeEvent.city}</span></div>
    </header>
    <main>
      {step==="welcome"&&<section className="welcome-layout">
        <div className="welcome-copy">
          <h1 ref={heading} tabIndex={-1}>এই যে,<br/>{" "}<span className="city-name">{event.city}!</span><span className="heading-star" aria-hidden="true"><Icon name="spark" size={44}/></span></h1>
          <h2>সাফল্য তোমার।<br/>{" "}উদ্‌যাপন হোক একসাথে!</h2>
          <p>তোমার সাফল্যে শিখোর সারপ্রাইজ।<br/>চাকা ঘোরাও, উপহার জেতো!</p>
          <div className="landing-steps"><span>পরিচয় দাও</span><Icon name="arrow" size={16}/><span>চাকা ঘোরাও</span><Icon name="arrow" size={16}/><span>চমক জেতো</span></div>
        </div>
        <div className="welcome-game">
          <div className="preview-stage">
            <span className="prize-caption caption-bag">শিখো ব্যাগ<PrizeArt kind="bag"/></span>
            <button className="preview-play" onClick={()=>move("register")} aria-label="চাকা খেলতে শুরু করো"><Wheel/></button>
            <span className="prize-caption caption-book"><PrizeArt kind="book"/>বইও আছে!</span>
            <span className="discount-sticker">সর্বোচ্চ<strong>৬০%</strong>কোর্সে ছাড়</span>
          </div>
          <p className="wheel-description">কোর্সে ছাড়, ব্যাগ অথবা বই।<br/>এক স্পিনে এক উপহার!</p>
          <button className="button primary start-button" onClick={()=>move("register")}>চলো, শুরু করি <Icon name="arrow"/></button>
          <p className="micro muted">বিনামূল্যে খেলো</p>
        </div>
        <div className="draw-banner">
          <div className="edutab-teaser-image"><Image className="edutab-thumbnail" src="/brand/edutab-official.jpg" alt="শিখো EduTab" width={160} height={89} loading="eager"/><span>EduTab</span></div>
          <div><h3>৩ জন জিতবে EduTab!</h3><p>স্পিন করলেই জাতীয় ড্র-তে এন্ট্রি।<br/>অক্টোবরের মাঝামাঝি লাইভ ড্র।</p></div>
          <Icon name="spark" size={27}/>
        </div>
      </section>}
      {step==="register"&&<section className="form-layout">
        <div className="form-intro"><button className="text-button back" onClick={()=>window.history.back()}><Icon name="back" size={19}/> ফিরে যাও</button>
          <div className="registration-progress" aria-label={`রেজিস্ট্রেশন ধাপ ${page+1} এর ${formPages}`}><span className="registration-progress-label">রেজিস্ট্রেশন</span><span className="registration-progress-bars" aria-hidden="true">{Array.from({length:formPages},(_,i)=><i key={i} className={i<=page?"active":""}/>)}</span><strong>{page+1}/{formPages}</strong></div>
          <h1 ref={heading} tabIndex={-1}>{page===0?<>তোমার নামটা<br/><span>জেনে নিই!</span></>:page===1?<>কোন ক্লাসে<br/><span>পড়ছ তুমি?</span></>:<>বিভাগ বেছে নাও।<br/><span>তারপরই স্পিন!</span></>}</h1><p>{page===0?(demo&&replaying?"আবার খেলতে নতুন করে রেজিস্ট্রেশন করো।":"স্পিন করতে আগে নাম ও নম্বর দিয়ে রেজিস্ট্রেশন করো।"):page===1?"তোমার ক্লাস বেছে নিয়ে সম্মতি দাও।":"তোমার বিভাগটি বেছে নাও।"}</p>
          <div className="registration-art" aria-hidden="true"><PrizeArt kind="bag"/><PrizeArt kind="book"/></div>
          <p className="desktop-note"><Icon name="lock"/>তোমার তথ্য শুধু এন্ট্রি, পুরস্কার ও শিখোর যোগাযোগের জন্য।</p>
        </div>
        <form className="registration-form" onSubmit={register} noValidate onFocus={formStarted}>
          {page===0&&<><label htmlFor="name">তোমার নাম</label><input id="name" autoComplete="name" value={name} onChange={e=>{setName(e.target.value);setFieldErrors(v=>({...v,name:""}));}} maxLength={80} placeholder="তোমার নাম লেখো" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name?"name-error":undefined}/>
          {fieldErrors.name&&<p id="name-error" className="field-error">{fieldErrors.name}</p>}
          <label htmlFor="phone">মোবাইল নম্বর</label><input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e=>{setPhone(e.target.value);setFieldErrors(v=>({...v,phone:""}));}} maxLength={24} placeholder="01XXXXXXXXX" aria-invalid={!!fieldErrors.phone} aria-describedby={fieldErrors.phone?"phone-error":"phone-help"}/>
          {fieldErrors.phone?<p id="phone-error" className="field-error">{fieldErrors.phone}</p>:<p id="phone-help" className="field-help">তোমার বা অভিভাবকের নম্বর দাও।</p>}
          </>}
          {page===1&&<><fieldset id="classLevel" tabIndex={-1} aria-describedby={fieldErrors.classLevel?"class-error":undefined}><legend>কোন ক্লাসে তুমি?</legend><div className="group-options class-options">{CLASS_LEVELS.map(c=><label key={c.id} className={`group-option ${classLevel===c.id?"selected":""}`}><input type="radio" name="classLevel" value={c.id} checked={classLevel===c.id} onChange={()=>{setClassLevel(c.id);setFieldErrors(v=>({...v,classLevel:"",group:""}));}}/><span>{c.bn}</span>{classLevel===c.id&&<Icon name="check" size={16}/>}</label>)}</div></fieldset>
          {fieldErrors.classLevel&&<p id="class-error" className="field-error">{fieldErrors.classLevel}</p>}
          <label className="consent"><input id="consent" type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);setFieldErrors(v=>({...v,consent:""}));}}/><span>রেজিস্ট্রেশন, পুরস্কার ও কোর্সের অফার জানাতে আমার তথ্য ব্যবহারে সম্মতি দিচ্ছি।</span></label>
          {fieldErrors.consent&&<p className="field-error">{fieldErrors.consent}</p>}
          </>}
          {page===2&&<><fieldset id="group" tabIndex={-1} aria-describedby={fieldErrors.group?"group-error":undefined}><legend>তুমি কোন বিভাগের?</legend><div className="group-options">{STUDY_GROUPS.map(g=><label key={g.id} className={`group-option ${group===g.id?"selected":""}`}><input type="radio" name="group" value={g.id} checked={group===g.id} onChange={()=>{setGroup(g.id);setFieldErrors(v=>({...v,group:""}));}}/><span>{g.bn}</span>{group===g.id&&<Icon name="check" size={16}/>}</label>)}</div></fieldset>
          {fieldErrors.group&&<p id="group-error" className="field-error">{fieldErrors.group}</p>}

          </>}
          {finalPage&&!demo&&turnstileSiteKey&&<Turnstile siteKey={turnstileSiteKey} onToken={setTurnstile} resetKey={turnstileReset}/>}
          {error&&<p className="error-notice" role="alert">{error}</p>}
          {!ready&&<button type="button" className="text-button" onClick={()=>void restore()}>সংযোগ আবার চেষ্টা করো</button>}
          <button className="button primary" disabled={busy||!ready||(finalPage&&!demo&&!!turnstileSiteKey&&!turnstile)} type="submit">{busy?"রেজিস্ট্রেশন হচ্ছে...":!finalPage?"পরের ধাপ":turnstileSiteKey&&!turnstile?"যাচাই হচ্ছে...":"এবার চাকা ঘোরাই"}{!busy&&<Icon name="arrow"/>}</button>
        </form>
      </section>}
      {step==="wheel"&&<section className="play-layout">
        <div className="play-copy"><span className="entry-confirmed"><Icon name="check" size={18}/> এন্ট্রি হয়ে গেছে!</span>
          <h1 ref={heading} tabIndex={-1}>{firstName(name)},<br/>{" "}<span>এবার তোমার পালা!</span></h1><p>চাকায় আঙুল দিয়ে সোয়াইপ করো।<br/>দেখি, কী উপহার পাও!</p>
          <div className="prize-line"><PrizeArt kind="bag"/><PrizeArt kind="book"/><span>ব্যাগ, বই কিংবা<br/><strong>২০% থেকে ৬০% ছাড়</strong></span></div>
          <p className="fair-note">পুরস্কার র‍্যান্ডম। সব পুরস্কারের সম্ভাবনা এক নয়।</p>
        </div>
        <div className="play-wheel"><Wheel rotation={rotation} duration={duration} interactive spinning={spinning} onSpin={()=>void spin()} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>{drag.current=null;}}/>
          <p className="spin-instruction" aria-live="polite">{spinning?message:"চাকায় সোয়াইপ করো, অথবা..."}</p>
          {error&&<p className="error-notice" role="alert">{error}</p>}
          <button className="button primary" onClick={()=>void spin()} disabled={spinning}>{spinning?<><span className="loading-spinner"/>চমক আসছে...</>:<>চাকা ঘোরাও <Icon name="spark"/></>}</button>
          <p className="micro muted">স্পিন করলেই জাতীয় EduTab ড্র-তে এন্ট্রি।</p>
        </div>
      </section>}
      {step==="result"&&entry&&entry.prizeId&&<ResultJourney entry={entry} demo={demo} record={record} onReplay={()=>void nextStudent()} onSpinAgain={spinAgain} page={resultPage} onPageChange={page=>navigate("result",0,page)} onBack={()=>window.history.back()}/>}
      {step==="welcome"&&error&&<div className="connection-note" role="status">{error}<button className="text-button" onClick={()=>void restore()}>আবার চেষ্টা করো</button></div>}
    </main>
  </div>;
}
