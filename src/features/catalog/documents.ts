import type catalogue from "@/messages/sq.json";

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
export type DocumentKind = "test-report" | "environmental-declaration" | "certification";
export type DocumentLinkId = "file" | "registry" | "verification" | "technicalReport";
export type { FactKey };

export type TechnicalDocument = {
  id: DocumentId;
  kind: DocumentKind;
  group: DocumentGroup;
  series: string | null;
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
    pendingClassification: false,
    previewUrl: hosted("everest-71000-rp2146"),
    links: [{ id: "file", href: hosted("everest-71000-rp2146") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2790",
    kind: "test-report",
    group: "aluminium",
    series: "71 000",
    reportNumber: "1994-CPR-RP2790",
    issuedOn: "2024-01-23",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
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
    pendingClassification: false,
    previewUrl: hosted("everest-pvc-85000-rp2176"),
    links: [{ id: "file", href: hosted("everest-pvc-85000-rp2176") }],
    facts: ["specimen", "air", "water", "wind"],
  }),
  defineDocument({
    id: "rp2549",
    kind: "test-report",
    group: "pvc",
    series: "76 000",
    reportNumber: "1994-CPR-RP2549",
    issuedOn: "2022-07-11",
    validUntil: null,
    issuer: "IRCCOS",
    offer: "documentation",
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

export const kindMessageKey = {
  "test-report": "testReport",
  "environmental-declaration": "environmentalDeclaration",
  certification: "certification",
} as const;
