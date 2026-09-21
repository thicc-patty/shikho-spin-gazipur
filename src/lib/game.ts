/** Public labels only. Never add probabilities or server selection here. */
export const STUDY_GROUPS = [
  { id: "science", bn: "বিজ্ঞান" }, { id: "humanities", bn: "মানবিক" },
  { id: "business", bn: "ব্যবসায় শিক্ষা" }, { id: "madrasah", bn: "মাদ্রাসা" },
  { id: "technical", bn: "কারিগরি" }, { id: "others", bn: "অন্যান্য" },
] as const;
export type StudyGroupId = (typeof STUDY_GROUPS)[number]["id"];
export const CLASS_LEVELS = [
  { id: "c6", bn: "ষষ্ঠ শ্রেণী", group: false }, { id: "c7", bn: "সপ্তম শ্রেণী", group: false },
  { id: "c8", bn: "অষ্টম শ্রেণী", group: false }, { id: "c9", bn: "নবম শ্রেণী", group: true },
  { id: "c10", bn: "দশম শ্রেণী", group: true },
] as const;
export type ClassLevelId = (typeof CLASS_LEVELS)[number]["id"];
export const CLASS_BY_ID = new Map(CLASS_LEVELS.map(c => [c.id, c]));
/** Covers class eleven from the original GPA5 campaign, which the form no longer offers. */
export const classLabel = (id: string) => CLASS_BY_ID.get(id as ClassLevelId)?.bn || (id === "c11" ? "একাদশ শ্রেণী" : id);
/** Students pick a group from class nine; younger classes register without one. */
export const needsStudyGroup = (id: string) => CLASS_BY_ID.get(id as ClassLevelId)?.group === true;
/** Stored for classes six to eight, who never see the group screen. */
export const NO_GROUP: StudyGroupId = "others";
export const PRIZES = [
  { id: "discount-20", short: "২০%", title: "২০% ছাড়", percent: 20, color: "#D0D8F4", ink: "#262F74", kind: "discount" },
  { id: "bag", short: "ব্যাগ", title: "শিখো ব্যাগ", percent: 0, color: "#C02080", ink: "#FFFFFF", kind: "physical" },
  { id: "discount-30", short: "৩০%", title: "৩০% ছাড়", percent: 30, color: "#F1F2FB", ink: "#262F74", kind: "discount" },
  { id: "discount-60", short: "৬০%", title: "৬০% ছাড়", percent: 60, color: "#E0A010", ink: "#121838", kind: "discount" },
  { id: "discount-40", short: "৪০%", title: "৪০% ছাড়", percent: 40, color: "#D0D8F4", ink: "#262F74", kind: "discount" },
  { id: "book", short: "বই", title: "একটি বই", percent: 0, color: "#384090", ink: "#FFFFFF", kind: "physical" },
  { id: "discount-50", short: "৫০%", title: "৫০% ছাড়", percent: 50, color: "#F1F2FB", ink: "#262F74", kind: "discount" },
] as const;
export type PrizeId = (typeof PRIZES)[number]["id"];
export const PRIZE_BY_ID = new Map(PRIZES.map(p => [p.id, p]));
export const COMMUNITY_URL = "https://www.facebook.com/groups/shikhocommunity";
export const APP_URL = "https://play.google.com/store/apps/details?id=tech.shikho.android&hl=en";
export const CAMPAIGN = "gpa5-2026";
export const bn = (value: number | string) => String(value).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[০-৯]/g, d => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[\s()+-]/g, "");
  if (digits.startsWith("00880")) digits = "0" + digits.slice(5);
  else if (digits.startsWith("880")) digits = "0" + digits.slice(3);
  else if (/^1[3-9]\d{8}$/.test(digits)) digits = "0" + digits;
  return /^01[3-9]\d{8}$/.test(digits) ? "88" + digits : null;
}
export type EventInfo = { id: string; city: string; name: string; date: string; crmReadyAt?: string | null };
export type EntryView = {
  name: string; group: string; classLevel: string; event: EventInfo; prizeId: PrizeId | null;
  code: string | null; wonAt: string | null; expiresAt: string | null; redeemedAt: string | null;
};
export function wheelTarget(index: number, current: number, turns: number) {
  const centre = (index + 0.5) * (360 / PRIZES.length);
  const target = ((-centre % 360) + 360) % 360;
  return current + turns * 360 + ((target - current % 360 + 360) % 360);
}
