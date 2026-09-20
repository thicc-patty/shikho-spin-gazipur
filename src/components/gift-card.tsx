import Image from "next/image";
import { PRIZE_BY_ID, bn, type EntryView } from "@/lib/game";
import { Icon, PrizeArt } from "./icons";
export function GiftCard({entry,share=false}:{entry:EntryView;demo?:boolean;share?:boolean}){
  const prize=PRIZE_BY_ID.get(entry.prizeId!);
  if(!prize)return null;
  return <div className={`gift-card ${share?"gift-for-sharing":""}`}>
    <svg className="gift-ribbons" viewBox="0 0 400 500" preserveAspectRatio="none" aria-hidden="true"><path d="M-60 170C140 80 10-70 240-15" stroke="#6170B8" strokeWidth="22" fill="none"/><path d="M280 520C460 330 290 310 460 170" stroke="#C02080" strokeWidth="42" fill="none"/><path d="M-15 330C65 370 10 490 145 530" stroke="#C02080" strokeWidth="18" fill="none"/><path d="m322 68 12-22m-7 15 25 5M52 215l-9 22m-8-15 24 7" stroke="#E0A010" strokeWidth="5" strokeLinecap="round"/></svg>
    <div className="gift-card-top"><span className="gift-wordmark"><Image src="/brand/shikho-logo.png" alt="শিখো" width={78} height={40} loading="eager" unoptimized/></span><span>তোমার জয়ের উপহার</span></div>
    <div className="gift-card-core"><span className="gift-spark"><Icon name="spark" size={30}/></span>
      <p>{prize.kind==="discount"?"HSC 28 কোর্সে":"এই উপহার তোমার"}</p>
      {prize.kind==="discount"?<strong className="gift-amount">{bn(prize.percent)}<span>%</span></strong>:<PrizeArt kind={prize.id==="bag"?"bag":"book"} className="gift-object"/>}
      <h2>{prize.kind==="discount"?"ছাড় পেয়েছ!":prize.title}</h2>
      <div className="gift-seal"><Icon name="check" size={14}/><span>চমকটা তোমারই</span></div>
    </div>
    <div className="gift-card-bottom"><strong>{entry.event.city}-এর আনন্দে</strong><span>{share?"তুমিও চাকা ঘোরাও, উপহার জেতো!":"তোমার সাফল্যে শিখোর উপহার।"}</span></div>
    {share&&<div className="gift-share-code"><span>তোমার ইউনিক কোড</span><strong>{entry.code}</strong></div>}
  </div>;
}
