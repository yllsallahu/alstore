import type catalogue from "@/messages/sq.json";
import type { EverestSystem } from "./systems";

/**
 * Verified EVEREST technical documents. Wording lives in Documents.items;
 * this file holds only identifiers, dates, hosted files and official URLs.
 * Provenance and the republication limit are in CONTENT_SOURCES.md §5.
 *
 * EV HYBRID / profile 67 000 stay manufacturer references. AL STORE does not
 * sell them and the document page must not offer them for quotation.
 */

type Items = typeof catalogue.Documents.items;
type FactKey = keyof typeof catalogue.Documents.labels;

export type DocumentId = keyof Items;
export type DocumentGroup = "aluminium" | "pvc" | "manufacturer";
/**
 * Resource categories. Only the first four have documents. Catalogues, drawings,
 * specifications and installation references are modelled but have none until
 * EVEREST supplies them, so the hub renders no empty category.
 */
export const documentKinds = [
  "test-report",
  "thermal-calculation",
  "environmental-declaration",
  "certification",
  "catalogue",
  "drawing",
  "specification",
  "installation",
] as const;
export type DocumentKind = (typeof documentKinds)[number];
export const documentLanguages = ["sq", "en"] as const;
export type DocumentLanguage = (typeof documentLanguages)[number];
export const documentFormats = ["pdf"] as const;
export type DocumentFormat = (typeof documentFormats)[number];
/**
 * How the file itself names EVEREST: report applicant, EPD owner, certificate
 * holder, certified manufacturer, or publisher (for EVEREST's own catalogues).
 * Any value marks an official EVEREST document; null means it is not one.
 */
export const everestRoles = [
  "publisher",
  "applicant",
  "epd-owner",
  "holder",
  "manufacturer",
] as const;
export type EverestRole = (typeof everestRoles)[number];
export type DocumentLinkId = "file" | "registry" | "verification" | "technicalReport";
export type { FactKey };

export type TechnicalDocument = {
  id: DocumentId;
  kind: DocumentKind;
  group: DocumentGroup;
  series: string | null;
  /** Further series the document itself names (EPD product lists). Not test results. */
  coveredSeries: readonly string[];
  everestRole: EverestRole | null;
  language: DocumentLanguage;
  format: DocumentFormat;
  reportNumber: string;
  issuedOn: string | null;
  validUntil: string | null;
  issuer: string;
  offer: "documentation" | "not-sold";
  pendingClassification: boolean;
  previewUrl: string;
  links: readonly { id: DocumentLinkId; href: string }[];
  facts: readonly FactKey[];
};

type ItemFacts<Id extends DocumentId> = Extract<keyof Items[Id], FactKey>;

function defineDocument<Id extends DocumentId>(
  document: Omit<TechnicalDocument, "id" | "facts"> & {
    id: Id & (Items[Id] extends { title: string } ? Id : never);
    facts: readonly ItemFacts<Id>[];
  },
): TechnicalDocument {
  return document;
}

/** Complete, unaltered IRCCOS PDFs in public/documents/. IRCCOS forbids partial reproduction. */
function hosted(file: string) {
  return `/documents/${file}.pdf`;
}

const epd26335File =
  "https://api.prod.environdec.com/api/v1/EPDLibrary/Files/EPDs/50c7679a-7318-476c-0ad6-08de0cb750fb/Documents";
const epd26336File =
  "https://api.prod.environdec.com/api/v1/EPDLibrary/Files/EPDs/f9ea8eb1-db76-41d9-3004-08de0cb3c026/Documents";
const asiFile =
  "https://aluminium-stewardship.org/wp-content/uploads/2026/05/ASI-Audit-Report-Everest-Shpk.-Certificate-554-PS.pdf";
const passiveHouseCertificate =
  "https://database.passivehouse.com/en/components/certificate/download/2616/en";

export const technicalDocuments = [
  defineDocument({
    id: "rp2147",
    kind: "test-report",
    group: "aluminium",
    series: "70 000",
    reportNumber: "1994-CPR-RP2147",
    issuedOn: "2020-12-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-70000-rp2147"),
    links: [{ id: "file", href: hosted("everest-70000-rp2147") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2146",
    kind: "test-report",
    group: "aluminium",
    series: "71 000",
    reportNumber: "1994-CPR-RP2146",
    issuedOn: "2020-12-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-71000-rp2146"),
    links: [{ id: "file", href: hosted("everest-71000-rp2146") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2790",
    kind: "thermal-calculation",
    group: "aluminium",
    series: "71 000",
    reportNumber: "1994-CPR-RP2790",
    issuedOn: "2024-01-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-71000-rp2790"),
    links: [{ id: "file", href: hosted("everest-71000-rp2790") }],
    facts: ["specimen", "uf", "conditions"],
  }),
  defineDocument({
    id: "rp2157",
    kind: "test-report",
    group: "aluminium",
    series: "91 000",
    reportNumber: "1994-CPR-RP2157",
    issuedOn: "2021-01-13",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-91000-rp2157"),
    links: [{ id: "file", href: hosted("everest-91000-rp2157") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2144",
    kind: "test-report",
    group: "aluminium",
    series: "92 000",
    reportNumber: "1994-CPR-RP2144",
    issuedOn: "2020-12-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-92000-rp2144"),
    links: [{ id: "file", href: hosted("everest-92000-rp2144") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2145",
    kind: "test-report",
    group: "aluminium",
    series: "92 000",
    reportNumber: "1994-CPR-RP2145",
    issuedOn: "2020-12-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-92000-rp2145"),
    links: [{ id: "file", href: hosted("everest-92000-rp2145") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "epd26335",
    kind: "environmental-declaration",
    group: "aluminium",
    series: null,
    reportNumber: "EPD-IES-0026335",
    issuedOn: "2025-10-08",
    validUntil: "2030-10-07",
    issuer: "International EPD System",
    offer: "documentation",
    everestRole: "epd-owner",
    coveredSeries: ["71 000", "92 000", "93 000", "CE 32 000", "E50", "E34"],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: epd26335File,
    links: [
      { id: "file", href: epd26335File },
      { id: "registry", href: "https://www.environdec.com/library/epd26335" },
    ],
    facts: ["covered"],
  }),
  defineDocument({
    id: "rp2176",
    kind: "test-report",
    group: "pvc",
    series: "85 000",
    reportNumber: "1994-CPR-RP2176",
    issuedOn: "2021-02-16",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: hosted("everest-pvc-85000-rp2176"),
    links: [{ id: "file", href: hosted("everest-pvc-85000-rp2176") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2549",
    kind: "thermal-calculation",
    group: "pvc",
    series: "76 000",
    reportNumber: "1994-CPR-RP2549",
    issuedOn: "2022-07-11",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
    everestRole: "applicant",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: true,
    previewUrl: hosted("everest-pvc-76000-rp2549"),
    links: [{ id: "file", href: hosted("everest-pvc-76000-rp2549") }],
    facts: ["specimen", "uf", "conditions"],
  }),
  defineDocument({
    id: "asi554",
    kind: "certification",
    group: "manufacturer",
    series: null,
    reportNumber: "554",
    issuedOn: "2026-04-24",
    validUntil: "2029-04-23",
    issuer: "Aluminium Stewardship Initiative",
    offer: "documentation",
    everestRole: "holder",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: asiFile,
    links: [
      { id: "file", href: asiFile },
      {
        id: "registry",
        href: "https://aluminium-stewardship.org/about-asi/members/Everest-Shpk-",
      },
    ],
    facts: ["scope"],
  }),
  defineDocument({
    id: "epd26336",
    kind: "environmental-declaration",
    group: "manufacturer",
    series: "67 000",
    reportNumber: "EPD-IES-0026336",
    issuedOn: "2025-10-08",
    validUntil: "2030-10-07",
    issuer: "International EPD System",
    offer: "not-sold",
    everestRole: "epd-owner",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: epd26336File,
    links: [
      { id: "file", href: epd26336File },
      { id: "registry", href: "https://www.environdec.com/library/epd26336" },
    ],
    facts: ["scope"],
  }),
  defineDocument({
    id: "ph2570",
    kind: "certification",
    group: "manufacturer",
    series: "EV HYBRID",
    reportNumber: "2570ws04",
    issuedOn: null,
    validUntil: "2027-12-31",
    issuer: "Passive House Institute",
    offer: "not-sold",
    everestRole: "manufacturer",
    coveredSeries: [],
    language: "en",
    format: "pdf",
    pendingClassification: false,
    previewUrl: passiveHouseCertificate,
    links: [
      { id: "file", href: passiveHouseCertificate },
      {
        id: "verification",
        href: "https://database.passivehouse.com/en/components/details/window/everest-ev-hybrid-system-2570ws04",
      },
      {
        id: "technicalReport",
        href: "https://database.passivehouse.com/Media/certified_components_v2/techdoc/document/423018.pdf",
      },
    ],
    facts: ["specimen", "criteria"],
  }),
] as const satisfies readonly TechnicalDocument[];

const firstDocument = technicalDocuments[0];

if (!firstDocument) {
  throw new Error("Technical document list is empty");
}

export const initialDocumentId = firstDocument.id;

export function documentsInGroup(group: "aluminium" | "pvc") {
  return technicalDocuments.filter((document) => document.group === group);
}

export function groupBySeries(documents: readonly TechnicalDocument[]) {
  const groups: { key: string; series: string | null; documents: TechnicalDocument[] }[] = [];

  for (const document of documents) {
    const key = document.series ?? document.id;
    const current = groups.find((group) => group.key === key);
    if (current) current.documents.push(document);
    else groups.push({ key, series: document.series, documents: [document] });
  }

  return groups;
}

/**
 * Document series for each homepage system key. null: no document may be attached yet.
 * 76 000 (aluminium) stays null: RP2549 is a 76 000 *uPVC* calculation (the 2024 catalogue lists
 * both a "76 000 SERIES" and a "76 000 UPVC SYSTEM"), so it belongs to the PVC page, which lists
 * every PVC document (CONTENT_SOURCES.md §5).
 */
const seriesBySystem: Record<Exclude<EverestSystem["key"], "pvc">, string | null> = {
  s30000: null,
  s60000: null,
  s70000: "70 000",
  s71000: "71 000",
  s76000: null,
};

/**
 * Documents to list on a system page: reports for that series and declarations that name it;
 * for the PVC category, every offered PVC document. Manufacturer references are never returned.
 * Link to one with `/documents#<id>`.
 */
export function documentsForSystem(key: EverestSystem["key"]) {
  if (key === "pvc") {
    const documents: readonly TechnicalDocument[] = technicalDocuments;
    return documents.filter(
      (document) => document.group === "pvc" && document.offer === "documentation",
    );
  }
  const series = seriesBySystem[key];
  return series ? documentsForSeries(series) : [];
}

/** Offered documents that test or name a series ("91 000"). Manufacturer references excluded. */
export function documentsForSeries(series: string) {
  const documents: readonly TechnicalDocument[] = technicalDocuments;
  return documents.filter(
    (document) =>
      document.offer === "documentation" &&
      document.group !== "manufacturer" &&
      (document.series === series || document.coveredSeries.includes(series)),
  );
}

export const kindMessageKey = {
  "test-report": "testReport",
  "thermal-calculation": "thermalCalculation",
  "environmental-declaration": "environmentalDeclaration",
  certification: "certification",
  catalogue: "catalogue",
  drawing: "drawing",
  specification: "specification",
  installation: "installation",
} as const satisfies Record<DocumentKind, string>;

export const everestRoleMessageKey = {
  publisher: "publisher",
  applicant: "applicant",
  "epd-owner": "epdOwner",
  holder: "holder",
  manufacturer: "manufacturer",
} as const satisfies Record<EverestRole, string>;
