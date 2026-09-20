import "server-only";
import { randomInt } from "node:crypto";
import type { PrizeId } from "../game";
export const WEIGHTS: ReadonlyArray<{ id: PrizeId; weight: number }> = [
  { id: "discount-20", weight: 4100 }, { id: "discount-30", weight: 2800 },
  { id: "discount-40", weight: 1800 }, { id: "discount-50", weight: 800 },
  { id: "discount-60", weight: 300 }, { id: "book", weight: 150 }, { id: "bag", weight: 50 },
];
export function selectPrize(unavailable: string[] = [], random = randomInt): PrizeId {
  const roll = random(10_000);
  let edge = 0;
  for (const prize of WEIGHTS) {
    edge += prize.weight;
    if (roll < edge) return unavailable.includes(prize.id) ? "discount-20" : prize.id;
  }
  throw new Error("Invalid probability configuration");
}
