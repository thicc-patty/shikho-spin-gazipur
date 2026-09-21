import test from "node:test";
import assert from "node:assert/strict";
import { bn, classLabel, firstName, needsStudyGroup, normalizePhone, PRIZES, prizeRank, STUDY_GROUPS, wheelTarget } from "../src/lib/game";
import { createPrizeCode, prizeCodePattern } from "../src/lib/prize-code";
import { crmPayload, type EntryRow } from "../src/lib/server/entries";
import { localPhone, sheetRow } from "../src/lib/server/sheet";

/**
 * Case-per-row coverage of everything the entry pipeline computes without a
 * database: what the student types, what is stored, what the Sheet shows and
 * what CRM would receive. The browser suites in this folder still need a real
 * Postgres; these do not, so they run on every push.
 */

const entry = (over: Partial<EntryRow> = {}) => ({
  id: "e1", phone: "8801712345678", name: "Md Hasan Mahmud", study_group: "science", class_level: "c9",
  spins: 1, event_id: "gazipur", event_info: { id: "gazipur", city: "গাজীপুর", name: "শিখো স্পিন", date: "2026-09-26" },
  prize_id: "discount-30", prize_code: "HASAN-78-AB2C", won_at: new Date("2026-09-22T04:00:00.000Z"),
  expires_at: null, redeemed_at: null, ...over,
}) as EntryRow;

// --- normalizePhone: one canonical 8801XXXXXXXXX identity out of every form a student types.
const phoneCases: [string, string | null][] = [
  ["01712345678", "8801712345678"], ["+8801712345678", "8801712345678"], ["8801712345678", "8801712345678"],
  ["008801712345678", "8801712345678"], ["1712345678", "8801712345678"], ["01712 345678", "8801712345678"],
  ["01712-345678", "8801712345678"], ["(017) 1234-5678", "8801712345678"], ["+88 01712 345678", "8801712345678"],
  ["০১৭১২৩৪৫৬৭৮", "8801712345678"], ["০১৭১২-৩৪৫৬৭৮", "8801712345678"], ["+৮৮০১৭১২৩৪৫৬৭৮", "8801712345678"],
  ["01312345678", "8801312345678"], ["01412345678", "8801412345678"], ["01512345678", "8801512345678"],
  ["01612345678", "8801612345678"], ["01812345678", "8801812345678"], ["01912345678", "8801912345678"],
  ["01012345678", null], ["01112345678", null], ["01212345678", null],
  ["0171234567", null], ["017123456789", null], ["", null], ["abcdefghijk", null],
  ["8801012345678", null], ["+880171234567", null], ["00880171234567", null], ["0", null], ["01", null],
];
for (const [raw, expected] of phoneCases) {
  test(`normalizePhone ${JSON.stringify(raw)} -> ${expected}`, () => assert.equal(normalizePhone(raw), expected));
}

// --- firstName: greet the student, never the honorific. Prize codes use the same rule.
const nameCases: [string, string][] = [
  ["Md Hasan", "Hasan"], ["MD. Rafiul Islam", "Rafiul"], ["Mohammad Ali", "Ali"], ["Muhammad Yunus", "Yunus"],
  ["Mohammed Zaman", "Zaman"], ["Mst. Ayesha Siddika", "Ayesha"], ["Most Nasrin", "Nasrin"], ["Mrs Rahima Khatun", "Rahima"],
  ["Mr. Karim", "Karim"], ["Miss Nadia", "Nadia"], ["Hasan", "Hasan"], ["  Hasan   Mahmud  ", "Hasan"],
  ["md hasan", "hasan"], ["Md", "Md"], ["", ""],
];
for (const [raw, expected] of nameCases) {
  test(`firstName ${JSON.stringify(raw)} -> ${JSON.stringify(expected)}`, () => assert.equal(firstName(raw), expected));
}

// --- bn: every digit the student sees is Bengali.
const bnCases: [string | number, string][] = [
  [0, "০"], [1, "১"], [2, "২"], [3, "৩"], [4, "৪"], [5, "৫"], [6, "৬"], [7, "৭"], [8, "৮"], [9, "৯"],
  [20, "২০"], [30, "৩০"], [2026, "২০২৬"], ["C6", "C৬"], ["", ""],
];
for (const [raw, expected] of bnCases) {
  test(`bn ${JSON.stringify(raw)} -> ${expected}`, () => assert.equal(bn(raw), expected));
}

// --- Class rules: only nine and ten choose a group, and eleven survives from the old campaign.
const classCases: [string, boolean, string][] = [
  ["c6", false, "ষষ্ঠ শ্রেণী"], ["c7", false, "সপ্তম শ্রেণী"], ["c8", false, "অষ্টম শ্রেণী"],
  ["c9", true, "নবম শ্রেণী"], ["c10", true, "দশম শ্রেণী"], ["c11", false, "একাদশ শ্রেণী"], ["c99", false, "c99"],
];
for (const [id, group, label] of classCases) {
  test(`class ${id} group=${group}`, () => assert.equal(needsStudyGroup(id), group));
  test(`class ${id} label`, () => assert.equal(classLabel(id), label));
}

// --- Wheel geometry: the chosen prize must stop under the pointer, from any starting angle.
for (const [index, prize] of PRIZES.entries()) {
  for (const current of [0, 137, 359, 720]) {
    test(`wheelTarget lands ${prize.id} from ${current}deg`, () => {
      const landed = wheelTarget(index, current, 4) % 360;
      const centre = (index + 0.5) * (360 / PRIZES.length);
      assert.ok(Math.abs(((landed + centre) % 360)) < 0.0001 || Math.abs(((landed + centre) % 360) - 360) < 0.0001,
        `${prize.id} settled at ${landed}`);
    });
  }
}

// --- Prize ranking: a later spin may improve the held prize, never downgrade it.
const rankOrder = ["bag", "book", "discount-60", "discount-50", "discount-40", "discount-30", "discount-20"];
for (let i = 0; i < rankOrder.length - 1; i++) {
  test(`prizeRank ${rankOrder[i]} outranks ${rankOrder[i + 1]}`, () =>
    assert.ok(prizeRank(rankOrder[i] as never) > prizeRank(rankOrder[i + 1] as never)));
}
test("prizeRank treats no prize as the lowest", () => assert.ok(prizeRank(null) < prizeRank("discount-20")));

// --- Prize codes.
for (const [name, prefix] of [["Md Hasan Mahmud", "HASAN"], ["Rafiul", "RAFIUL"], ["Mst. Ayesha", "AYESHA"], ["রফিকুল ইসলাম", "রফিকুল"]] as const) {
  test(`createPrizeCode prefixes ${JSON.stringify(name)} with ${prefix}`, () => {
    const code = createPrizeCode(name, "01712345678");
    assert.equal(code.split("-")[0], prefix);
  });
}
test("createPrizeCode matches the accepted pattern", () =>
  assert.match(createPrizeCode("Md Hasan", "01712345678"), prizeCodePattern));
test("createPrizeCode ends with the phone's last two digits", () =>
  assert.equal(createPrizeCode("Hasan", "01712345678").split("-")[1], "78"));
test("createPrizeCode caps the prefix at eight graphemes", () =>
  assert.ok(createPrizeCode("Abdurrahmanullah", "01712345678").split("-")[0].length <= 8));
test("createPrizeCode falls back when a name carries no letters", () =>
  assert.equal(createPrizeCode("123 456", "01712345678").split("-")[0], "SHIKHO"));
test("createPrizeCode refuses an unusable phone", () =>
  assert.throws(() => createPrizeCode("Hasan", "01012345678"), /Invalid phone/));
test("prizeCodePattern still accepts codes issued by the old template", () =>
  assert.match("SH-A1B2C3D4E5F6", prizeCodePattern));

// --- localPhone: stored canonically, shown to staff the way it was typed.
for (const [stored, shown] of [["8801712345678", "01712345678"], ["01712345678", "01712345678"]] as const) {
  test(`localPhone ${stored} -> ${shown}`, () => assert.equal(localPhone(stored), shown));
}

// --- sheetRow: what the stall and telesales actually read.
test("sheetRow shows the phone in local form", () => assert.equal(sheetRow(entry()).phone, "01712345678"));
test("sheetRow shows the class in Bangla", () => assert.equal(sheetRow(entry()).class, "নবম শ্রেণী"));
test("sheetRow shows the event city", () => assert.equal(sheetRow(entry()).event, "গাজীপুর"));
test("sheetRow carries the spin count", () => assert.equal(sheetRow(entry({ spins: 4 })).spins, 4));
test("sheetRow keeps the untouched name, honorific included", () => assert.equal(sheetRow(entry()).name, "Md Hasan Mahmud"));
for (const group of STUDY_GROUPS) {
  test(`sheetRow labels group ${group.id}`, () => {
    const row = sheetRow(entry({ study_group: group.id, class_level: "c9" }));
    assert.equal(row.group, group.id === "others" ? "" : group.bn);
  });
}
test("sheetRow blanks the group for classes that never chose one", () => {
  for (const level of ["c6", "c7", "c8"]) assert.equal(sheetRow(entry({ class_level: level, study_group: "others" })).group, "");
});
test("sheetRow keeps an explicit others for class eleven", () =>
  assert.equal(sheetRow(entry({ class_level: "c11", study_group: "others" })).group, "অন্যান্য"));
for (const prize of PRIZES) {
  test(`sheetRow names the award ${prize.id}`, () => assert.equal(sheetRow(entry({ prize_id: prize.id })).award, prize.title));
}
test("sheetRow leaves award and code empty before a spin", () => {
  const row = sheetRow(entry({ prize_id: null, prize_code: null, won_at: null }));
  assert.equal(row.award, ""); assert.equal(row.code, ""); assert.equal(row.wonAt, "");
});
test("sheetRow stamps the win in Dhaka time", () =>
  assert.equal(sheetRow(entry({ won_at: new Date("2026-09-22T04:00:00.000Z") })).wonAt, "2026-09-22 10:00:00"));

// --- crmPayload: what telesales would be handed.
for (const prize of PRIZES) {
  test(`crmPayload discountPercent for ${prize.id}`, () => {
    const payload = crmPayload(entry({ prize_id: prize.id }), "spin.completed");
    assert.equal(payload.event.discountPercent, prize.kind === "discount" ? prize.percent : null);
  });
}
test("crmPayload never mentions GPA5 or HSC 28", () => {
  const text = JSON.stringify(crmPayload(entry(), "spin.completed"));
  for (const banned of ["GPA5", "GPA 5", "gpa5", "HSC 28", "LGPA5"]) assert.ok(!text.includes(banned), banned);
});
test("crmPayload keeps the canonical campaign event name", () =>
  assert.equal(crmPayload(entry(), "spin.completed").event.name, "shikho_spin_2026"));
test("crmPayload sends the stored phone, not the local form", () =>
  assert.equal(crmPayload(entry(), "lead.upsert").lead.phone, "8801712345678"));
test("crmPayload carries the event city as locationName", () =>
  assert.equal(crmPayload(entry(), "lead.upsert").event.locationName, "গাজীপুর"));
test("crmPayload enters the national draw only once a spin has happened", () => {
  assert.equal(crmPayload(entry({ won_at: null }), "lead.upsert").event.nationalDrawEntered, false);
  assert.equal(crmPayload(entry(), "spin.completed").event.nationalDrawEntered, true);
});
test("crmPayload passes the kind through untouched", () =>
  assert.equal(crmPayload(entry(), "lead.upsert").kind, "lead.upsert"));

// --- The regression that made every analytics write a 503.
test("the sql proxy hands multi-row fragments to the template untouched", async () => {
  const saved = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://u:p@127.0.0.1:1/postgres";
  try {
    const { sql } = await import("../src/lib/server/db");
    const fragment = sql()([{ id: "a", name: "x" }], "id", "name") as unknown as object;
    // A promise here is the bug: postgres.js expands a fragment by checking
    // `instanceof Builder`, so a wrapped one is serialised as a bind parameter
    // and the INSERT becomes a syntax error.
    assert.equal(fragment.constructor.name, "Builder");
  } finally { if (saved) process.env.DATABASE_URL = saved; else delete process.env.DATABASE_URL; }
});
