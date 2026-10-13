import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { findModule, HOME, homeActions, MODULES } from "@/lib/navigation";

describe("navigation", () => {
  it("lists the twelve sections required by the spec, in order", () => {
    expect([HOME.label, ...MODULES.map((m) => m.label)]).toEqual([
      "Ballina",
      "Shitje e re",
      "Faturat",
      "Klientët",
      "Blerje e re",
      "Furnitorët",
      "Stoku",
      "Pagesat / Borxhet",
      "ATK / EDI",
      "Shpenzimet",
      "Raportet",
      "Cilësimet",
    ]);
  });

  it("has unique slugs and hrefs matching the slug", () => {
    const slugs = MODULES.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const m of MODULES) expect(m.href).toBe(`/${m.slug}`);
  });

  it("exposes exactly the four home actions", () => {
    expect(homeActions().map((m) => m.label)).toEqual([
      "Shitje e re",
      "Blerje e re",
      "Stoku",
      "ATK / EDI",
    ]);
  });

  it("labels the ATK export as awaiting verification", () => {
    expect(findModule("atk-edi")?.notice).toBe("Eksporti ATK është në pritje të verifikimit");
  });

  it("returns undefined for unknown slugs", () => {
    expect(findModule("pos")).toBeUndefined();
  });

  it("has a page file for every module", () => {
    for (const m of MODULES) {
      expect(existsSync(`src/app/(app)/${m.slug}/page.tsx`), m.slug).toBe(true);
    }
  });
});
