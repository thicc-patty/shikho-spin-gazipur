import { normalizePhone } from "./game";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const segmenter = new Intl.Segmenter("bn", { granularity: "grapheme" });
export const prizeCodePattern = /^(?:SH-[A-F0-9]{12}|[\p{L}\p{M}]{1,64}-\d{2}-[A-HJ-NP-Z2-9]{4})$/u;
export function createPrizeCode(name: string, phone: string): string {
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("Invalid phone for prize code");
  const first = name.trim().normalize("NFC").split(/\s+/)[0].replace(/[^\p{L}\p{M}]/gu, "").toUpperCase();
  const prefix = Array.from(segmenter.segment(first)).slice(0, 8).map(s => s.segment).join("") || "SHIKHO";
  const random = crypto.getRandomValues(new Uint8Array(4));
  const suffix = Array.from(random, n => alphabet[n & 31]).join("");
  return `${prefix}-${normalized.slice(-2)}-${suffix}`;
}
