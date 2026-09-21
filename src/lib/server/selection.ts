import "server-only";
import { randomInt } from "node:crypto";
import type { PrizeId } from "../game";
/**
 * Parts per million, so the approved 99.99% share of 20% and 30% can be split
 * exactly. The remaining 0.01% is 100 ppm spread evenly over the other five,
 * which makes a bag, a book or a 40/50/60 discount a 1-in-50,000 outcome each.
 */
export const TOTAL_WEIGHT = 1_000_000;
export const WEIGHTS: ReadonlyArray<{ id: PrizeId; weight: number }> = [
  { id: "discount-20", weight: 599_950 }, { id: "discount-30", weight: 399_950 },
  { id: "discount-40", weight: 20 }, { id: "discount-50", weight: 20 },
  { id: "discount-60", weight: 20 }, { id: "book", weight: 20 }, { id: "bag", weight: 20 },
];
export function selectPrize(unavailable: string[] = [], random = randomInt): PrizeId {
  const roll = random(TOTAL_WEIGHT);
  let edge = 0;
  for (const prize of WEIGHTS) {
    edge += prize.weight;
    if (roll < edge) return unavailable.includes(prize.id) ? "discount-20" : prize.id;
  }
  throw new Error("Invalid probability configuration");
}
