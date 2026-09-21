import { test } from "node:test";
import assert from "node:assert/strict";
import { CLASS_LEVELS, NO_GROUP, STUDY_GROUPS, classLabel, firstName, needsStudyGroup, normalizePhone, PRIZES, wheelTarget } from "../src/lib/game";
import { selectPrize, TOTAL_WEIGHT, WEIGHTS } from "../src/lib/server/selection";

test("BD phone forms share one identity; reject malformed numbers",()=>{
  for(const value of ["01712345678","+8801712345678","8801712345678","008801712345678","1712345678","০১৭১২৩৪৫৬৭৮","+৮৮০ ১৭১২-৩৪৫৬৭৮"])
    assert.equal(normalizePhone(value),"8801712345678",value);
  for(const value of ["01212345678","017123456789","abc01712345678","0171234567","+441712345678","88001712345678"])
    assert.equal(normalizePhone(value),null,value);
});
test("every possible roll produces exactly the approved distribution",()=>{
  assert.equal(WEIGHTS.reduce((t,p)=>t+p.weight,0),TOTAL_WEIGHT);
  const counts:Record<string,number>={};
  for(let i=0;i<TOTAL_WEIGHT;i++){const id=selectPrize([],()=>i);counts[id]=(counts[id]||0)+1;}
  assert.deepEqual(counts,Object.fromEntries(WEIGHTS.map(p=>[p.id,p.weight])));
  // The approved split: 20% and 30% carry 99.99% of every spin between them.
  const easy=counts["discount-20"]+counts["discount-30"];
  assert.equal(easy/TOTAL_WEIGHT,0.9999);
  assert.equal(selectPrize(["book","bag"],()=>TOTAL_WEIGHT-1),"discount-20");
  for(const p of WEIGHTS)assert.ok(p.weight>0,p.id+" must stay reachable");
});
test("every wheel outcome lands under the top pointer after forward rotation",()=>{
  for(let i=0;i<PRIZES.length;i++)for(const current of [-370,-12,0,91,9999]){
    const target=wheelTarget(i,current,5);
    assert.ok(target>current+4*360);
    const centre=(i+.5)*360/PRIZES.length;
    assert.ok(Math.abs(((target+centre)%360+360)%360)<.00001 || Math.abs(((target+centre)%360+360)%360-360)<.00001);
  }
});


test("personal prize codes preserve Bangla names and accept old issued codes", async()=>{
  const {createPrizeCode,prizeCodePattern}=await import("../src/lib/prize-code");
  for(const [name,phone,prefix] of [["Arif Hasan","01712345678","ARIF-78-"],["আরিফ হাসান","০১৭১২৩৪৫৬৭৮","আরিফ-78-"],["Christopher Smith","+8801712345678","CHRISTOP-78-"],["✨","01712345678","SHIKHO-78-"]]){
    const code=createPrizeCode(name,phone);assert.ok(code.startsWith(prefix),code);assert.ok(prizeCodePattern.test(code));assert.equal(code.split("-").at(-1)?.length,4);
  }
  assert.ok(prizeCodePattern.test("SH-123456ABCDEF"));assert.equal(prizeCodePattern.test("ARIF-01712345678-ABCD"),false);
  assert.throws(()=>createPrizeCode("Arif","bad"));
});

test("only classes nine and ten reach the study group screen",()=>{
  assert.deepEqual(CLASS_LEVELS.map(c=>c.id),["c6","c7","c8","c9","c10"]);
  assert.deepEqual(CLASS_LEVELS.filter(c=>needsStudyGroup(c.id)).map(c=>c.id),["c9","c10"]);
  for(const id of ["c6","c7","c8","c11","",'unknown'])assert.equal(needsStudyGroup(id),false,id);
  assert.ok(STUDY_GROUPS.some(g=>g.id===NO_GROUP),"the skipped-group value must stay a real study group");
  for(const c of CLASS_LEVELS)assert.equal(classLabel(c.id),c.bn);
  assert.notEqual(classLabel("c11"),"c11");
  assert.equal(classLabel("c99"),"c99");
});

test("greeting and prize codes skip a leading honorific",()=>{
  for(const [input,want] of [["Md Abidur Rahman","Abidur"],["MD. Abidur Rahman","Abidur"],
    ["Mohammad Rafi","Rafi"],["Mst. Nusrat Jahan","Nusrat"],["Jaeed Rahman","Jaeed"],
    ["মোহাম্মদ রাফি","মোহাম্মদ"],["Md","Md"],["  Md   Abidur  ","Abidur"]])
    assert.equal(firstName(input),want,input);
});
