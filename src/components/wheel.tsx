import { PRIZES } from "@/lib/game";
import type { CSSProperties, PointerEventHandler } from "react";
const point = (angle: number, radius: number) => [160 + Math.sin(angle * Math.PI/180)*radius,160 - Math.cos(angle * Math.PI/180)*radius];
export function Wheel({ rotation = -12, duration = 0, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, interactive = false, spinning = false, onSpin }: {
  onSpin?:()=>void; rotation?: number; duration?: number; interactive?: boolean; spinning?: boolean;
  onPointerDown?: PointerEventHandler<HTMLDivElement>; onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerUp?: PointerEventHandler<HTMLDivElement>; onPointerCancel?: PointerEventHandler<HTMLDivElement>;
}) {
  return <div className={`wheel-assembly ${interactive ? "is-playable" : ""} ${spinning ? "is-spinning" : ""}`}>
    <div className="wheel-pointer" aria-hidden="true"><span/></div>
    <div className="wheel-touch" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      style={{touchAction:interactive ? "none" : "auto"}} aria-label={interactive ? "আঙুল দিয়ে চাকা ঘোরাও, অথবা নিচের বোতাম চাপো" : undefined}>
      <svg viewBox="0 0 320 320" className="wheel-disc" role="img" aria-label="চাকায় আছে ২০%, ৩০%, ৪০%, ৫০%, ৬০% ছাড়, শিখো ব্যাগ ও বই"
        style={{transform:`rotate(${rotation}deg)`,transition:duration ? `transform ${duration}ms cubic-bezier(.12,.78,.12,1)` : "none"} as CSSProperties}>
        <circle cx="160" cy="160" r="157" fill="#384090"/>
        <circle cx="160" cy="160" r="147" fill="white"/>
        {PRIZES.map((p,i) => {
          const start=i*360/PRIZES.length,end=(i+1)*360/PRIZES.length,mid=(start+end)/2;
          const a=point(start,140),b=point(end,140),label=point(mid,103);
          return <g key={p.id}>
            <path d={`M160 160L${a.join(" ")}A140 140 0 0 1 ${b.join(" ")}Z`} fill={p.color} stroke="white" strokeWidth="2"/>
            <g transform={`translate(${label.join(" ")}) rotate(${mid})`} fill={p.ink} textAnchor="middle">
              <text fontSize={p.kind === "discount" ? "27" : "22"} fontWeight="700" dominantBaseline="middle">{p.short}</text>
              <text y="22" fontSize="11" fontWeight="500">{p.kind === "discount" ? "ছাড়" : "উপহার"}</text>
            </g>
          </g>;
        })}
        {Array.from({length:28},(_,i) => {const p=point(i*360/28,152);return <circle key={i} cx={p[0]} cy={p[1]} r="2" fill="#FBE8C2"/>;})}
        <circle cx="160" cy="163" r="40" fill="#1B2356" opacity=".12"/>
        <circle cx="160" cy="160" r="39" fill="white" stroke="#D0D8F4" strokeWidth="3"/>
        <image href="/brand/shikho-mark.png" x="140" y="136" width="40" height="35" preserveAspectRatio="xMidYMid meet"/>
        <text x="160" y="183" textAnchor="middle" fill="#384090" fontSize="10" fontFamily="var(--font-poppins)" fontWeight="700">SPIN!</text>
      </svg>
    </div>
    {interactive&&<button type="button" className="wheel-centre-button" aria-label="মাঝের বোতাম দিয়ে স্পিন করো" disabled={spinning} onClick={onSpin}><span className="sr-only">স্পিন</span></button>}
    <div className="wheel-shadow" aria-hidden="true"/>
  </div>;
}
