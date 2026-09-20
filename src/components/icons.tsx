import type { CSSProperties } from "react";
export function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    back: <path d="M19 12H5m6-6-6 6 6 6"/>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    share: <><path d="M12 16V3m-5 5 5-5 5 5M5 12v8h14v-8"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></>,
    group: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    chat: <><path d="M21 11a9 9 0 0 1-13 8l-5 2 1-5A9 9 0 1 1 21 11Z"/><path d="M8 8c0 4 2 6 6 7l2-2-3-2-1 1-2-2 1-1-2-3Z"/></>,
    spark: <><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.spark}</svg>;
}
export function PrizeArt({ kind, className = "" }: { kind: "bag" | "book" | "tablet"; className?: string }) {
  return <svg viewBox="0 0 100 110" className={className} aria-hidden="true" fill="none">
    {kind === "bag" ? <>
      <path d="M26 43C12 34 12 80 23 86m51-43c14-9 14 37 3 43" stroke="#262F74" strokeWidth="6"/>
      <path d="M40 24v-8c0-10 20-10 20 0v8" stroke="#262F74" strokeWidth="5"/>
      <rect x="23" y="21" width="54" height="75" rx="20" fill="#C02080"/>
      <path d="M23 49h54" stroke="#8A0159" strokeWidth="3"/>
      <rect x="31" y="60" width="38" height="26" rx="9" fill="#8A0159"/>
      <path d="M35 65h30" stroke="#FB80DE" strokeWidth="3"/>
      <rect x="39" y="30" width="22" height="12" rx="4" fill="white"/>
    </> : kind === "book" ? <>
      <path d="M19 18h57v80H26a7 7 0 0 1-7-7Z" fill="#262F74"/>
      <path d="M25 16h53v74H25c-8 0-8 9 0 9h53" fill="#384090" stroke="#1B2356" strokeWidth="3"/>
      <path d="M28 93h48" stroke="#FFFFFF" strokeWidth="4"/>
      <path d="M29 16v72" stroke="#6170B8" strokeWidth="3"/>
      <path d="m53 31 4 10 11 1-8 7 2 11-9-6-10 6 3-11-8-7 11-1Z" fill="#E0A010"/>
      <path d="M40 71h24M40 78h16" stroke="#D0D8F4" strokeWidth="3"/>
    </> : <>
      <rect x="13" y="6" width="74" height="98" rx="12" fill="#262F74"/>
      <rect x="18" y="12" width="64" height="81" rx="7" fill="#D0D8F4"/>
      <path d="m28 56 14 12 30-36" stroke="#C02080" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M35 80h30" stroke="#384090" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="50" cy="99" r="2" fill="#D0D8F4"/>
    </>}
  </svg>;
}
export function Confetti() {
  return <div className="confetti" aria-hidden="true">{Array.from({length:24},(_,i) => <i key={i} style={{"--i":i,"--x":`${(i * 47) % 100}%`,"--r":`${i * 41}deg`} as CSSProperties}/>)}</div>;
}
