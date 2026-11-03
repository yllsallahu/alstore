import { type DocumentId, type FactKey, documentsForSystem, technicalDocuments } from "./documents";
import { type EverestSystem, everestSystems } from "./systems";

/**
 * Specification model shared by the system pages and the comparison.
 *
 * Every value points at its source and is never typed in here:
 * - `document`: a fact of a verified document (wording in Documents.items), so the page shows
 *   exactly what the report says, for the tested sample or node only;
 * - `everest`: a statement from the official EVEREST product list or page (CONTENT_SOURCES.md
 *   §5), wording in SystemSpecs.values;
 * - `null`: not documented. Shown as such, never estimated.
 *
 * Only systems with readable EVEREST product information are listed. 30 000 Standard and
 * 76 000 stay out until CONTENT_SOURCES.md §5 resolves them; PVC is a category, not a system.
 */

export const specRows = [
  "use",
  "opening",
  "insulation",
  "specimen",
  "air",
  "water",
  "wind",
  "uf",
  "profileDepth",
] as const;
export type SpecRow = (typeof specRows)[number];

type EverestStatement =
  "windowsDoors" | "tiltTurn" | "nonInsulated" | "efficiency" | "maxInsulation" | "basicDepth90";

export type SpecValue =
  | { source: "document"; documentId: DocumentId; fact: FactKey }
  | { source: "everest"; statement: EverestStatement }
  | null;

export type ComparableKey = Extract<EverestSystem["key"], "s60000" | "s70000" | "s71000">;

const everest = (statement: EverestStatement): SpecValue => ({ source: "everest", statement });
const fact = (documentId: DocumentId, key: FactKey): SpecValue => ({
  source: "document",
  documentId,
  fact: key,
});

const specs: Record<ComparableKey, Record<SpecRow, SpecValue>> = {
  s60000: {
    use: everest("windowsDoors"),
    opening: everest("tiltTurn"),
    insulation: everest("nonInsulated"),
    specimen: null,
    air: null,
    water: null,
    wind: null,
    uf: null,
    profileDepth: null,
  },
  s70000: {
    use: everest("windowsDoors"),
    opening: everest("tiltTurn"),
    insulation: everest("efficiency"),
    specimen: fact("rp2147", "specimen"),
    air: fact("rp2147", "air"),
    water: fact("rp2147", "water"),
    wind: fact("rp2147", "wind"),
    uf: null,
    profileDepth: null,
  },
  s71000: {
    use: everest("windowsDoors"),
    opening: everest("tiltTurn"),
    insulation: everest("maxInsulation"),
    specimen: fact("rp2146", "specimen"),
    air: fact("rp2146", "air"),
    water: fact("rp2146", "water"),
    wind: fact("rp2146", "wind"),
    uf: fact("rp2790", "uf"),
    profileDepth: everest("basicDepth90"),
  },
};

export const comparableSystems = Object.keys(specs) as ComparableKey[];

export function isComparable(key: string): key is ComparableKey {
  return key in specs;
}

/** Specification of a comparable system. Throws if a value cites a fact its document lacks. */
export function systemSpecs(key: ComparableKey): Record<SpecRow, SpecValue> {
  const values = specs[key];
  for (const value of Object.values(values)) {
    if (value?.source !== "document") continue;
    const document = technicalDocuments.find(({ id }) => id === value.documentId);
    if (!document?.facts.includes(value.fact)) {
      throw new Error(
        `${key} cites ${value.documentId}.${value.fact}, which is not in the register`,
      );
    }
  }
  return values;
}

/**
 * Systems with their own page. A page needs verified documents that give it real technical
 * content; without them it would be thin, so the list is checked against the register.
 * Today that is 70 000 and 71 000. Add a key here (and SystemPage.items) when a system qualifies.
 */
const systemPageKeys = ["s70000", "s71000"] as const satisfies readonly ComparableKey[];
export type SystemPageKey = (typeof systemPageKeys)[number];

export function systemHasPage(key: EverestSystem["key"]): key is SystemPageKey {
  return (systemPageKeys as readonly string[]).includes(key);
}

/** URL slug: the series number, identical in both locales ("71000"). */
export function systemSlug(key: SystemPageKey): string {
  return key.slice(1);
}

export function listSystemPages() {
  return systemPageKeys.map((key) => {
    const system = everestSystems.find((candidate) => candidate.key === key);
    if (!system || documentsForSystem(key).length === 0) {
      throw new Error(`System page ${key} needs a system entry and verified documents`);
    }
    return { ...system, key, slug: systemSlug(key) };
  });
}

export function systemBySlug(slug: string) {
  return listSystemPages().find((page) => page.slug === slug);
}
