import { z } from "zod";
import type { EverestSystem } from "@/features/catalog/systems";

/**
 * Knowledge-centre article model. Long-form copy lives in typed content modules
 * (`articles/*.ts`), one object per locale, instead of the message catalogues:
 * articles are documents with headings, tables and sources, not UI strings.
 * See docs/ARCHITECTURE.md ("Long-form content").
 */

export const articleKeys = ["thermal-break", "u-values", "performance-classes"] as const;
export type ArticleKey = (typeof articleKeys)[number];

/**
 * Internal link targets used inside article text. `system` points at the
 * homepage Systems section until per-system pages exist (see links.ts).
 */
export type InternalTarget =
  | { page: "systems" }
  | { page: "documents" }
  | { page: "contact" }
  | { page: "article"; article: ArticleKey }
  | { page: "system"; system: EverestSystem["key"] }
  | { page: "file"; path: `/documents/${string}.pdf` };

/** A run of text: plain, an internal link or an external link. */
export type Inline = string | { text: string; to: InternalTarget } | { text: string; href: string };

export type ThermalBreakLabels = {
  inside: string;
  outside: string;
  innerShell: string;
  outerShell: string;
  barrier: string;
  glazing: string;
};

export type WindowAreaLabels = {
  frame: string;
  glass: string;
  edge: string;
};

export type Block =
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: Inline[] }
  | { type: "ul"; items: Inline[][] }
  | { type: "formula"; text: string; label: string }
  | { type: "note"; text: Inline[] }
  | { type: "table"; caption: string; head: string[]; rows: string[][] }
  | { type: "figure"; figure: "thermal-break"; caption: string; labels: ThermalBreakLabels }
  | { type: "figure"; figure: "window-areas"; caption: string; labels: WindowAreaLabels };

export type ArticleContent = {
  /** Page title without the " | AL STORE" suffix. ≤ 60 characters. */
  metaTitle: string;
  /** 140–160 characters, describes the page truthfully. */
  metaDescription: string;
  title: string;
  lead: string;
  /** One or two sentences for the index page. */
  excerpt: string;
  body: Block[];
};

export type ArticleSource = {
  title: string;
  publisher: string;
  url: string;
  /** Date the source was read (ISO). */
  accessedOn: string;
  /** What the article takes from this source. */
  usedFor: Record<"sq" | "en", string>;
};

export type KnowledgeArticle = {
  key: ArticleKey;
  /** Date the article was written and checked against its sources (ISO). */
  reviewedOn: string;
  related: ArticleKey[];
  sources: ArticleSource[];
  content: Record<"sq" | "en", ArticleContent>;
};

// ---------- Runtime validation (queries.ts) ----------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const text = z.string().trim().min(1);

const targetSchema = z.discriminatedUnion("page", [
  z.object({ page: z.literal("systems") }),
  z.object({ page: z.literal("documents") }),
  z.object({ page: z.literal("contact") }),
  z.object({ page: z.literal("article"), article: z.enum(articleKeys) }),
  z.object({ page: z.literal("system"), system: text }),
  z.object({ page: z.literal("file"), path: z.string().regex(/^\/documents\/[a-z0-9-]+\.pdf$/) }),
]);

const inlineSchema = z.union([
  text,
  z.object({ text, to: targetSchema }),
  z.object({ text, href: z.url({ protocol: /^https$/ }) }),
]);

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h2"), id: z.string().regex(/^[a-z0-9-]+$/), text }),
  z.object({ type: z.literal("h3"), text }),
  z.object({ type: z.literal("p"), text: z.array(inlineSchema).min(1) }),
  z.object({ type: z.literal("ul"), items: z.array(z.array(inlineSchema).min(1)).min(2) }),
  z.object({ type: z.literal("formula"), text, label: text }),
  z.object({ type: z.literal("note"), text: z.array(inlineSchema).min(1) }),
  z.object({
    type: z.literal("table"),
    caption: text,
    head: z.array(z.string()).min(2),
    rows: z.array(z.array(z.string())).min(1),
  }),
  z.object({
    type: z.literal("figure"),
    figure: z.enum(["thermal-break", "window-areas"]),
    caption: text,
    labels: z.record(z.string(), text),
  }),
]);

const contentSchema = z.object({
  metaTitle: text.max(60),
  metaDescription: text.min(110).max(165),
  title: text,
  lead: text,
  excerpt: text,
  body: z.array(blockSchema).min(1),
});

export const articleSchema = z.object({
  key: z.enum(articleKeys),
  reviewedOn: isoDate,
  related: z.array(z.enum(articleKeys)),
  sources: z
    .array(
      z.object({
        title: text,
        publisher: text,
        url: z.union([z.url({ protocol: /^https$/ }), z.string().regex(/^\/documents\/.+\.pdf$/)]),
        accessedOn: isoDate,
        usedFor: z.object({ sq: text, en: text }),
      }),
    )
    .min(1),
  content: z.object({ sq: contentSchema, en: contentSchema }),
});
