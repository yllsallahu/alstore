import { z } from "zod";
import { type EverestSystem, everestSystems } from "@/features/catalog/systems";

/**
 * Project records for the Projects gallery. Every record is evidence-backed: owner-supplied
 * photos and written client consent, recorded in docs/CONTENT_SOURCES.md §7.
 *
 * Project text is content, not interface copy, so it is modelled as localized fields
 * (`{ sq, en }`, ARCHITECTURE.md §6) to mirror a future CMS. Interface labels stay in the
 * `Projects` message namespace.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const localized = z.object({ sq: z.string().trim().min(1), en: z.string().trim().min(1) });

const systemKeys = everestSystems.map(({ key }) => key) as [
  EverestSystem["key"],
  ...EverestSystem["key"][],
];

export const projectTypes = ["residential", "commercial", "public", "industrial"] as const;

const projectImageSchema = z.object({
  /** Self-hosted, owner-supplied photo: /media/projects/<project-slug>/<file>.jpg|webp|png */
  src: z.string().regex(/^\/media\/projects\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|webp|png)$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: localized,
});

export const projectSchema = z
  .object({
    slug,
    title: localized,
    /** One or two sentences for the gallery card. */
    summary: localized,
    /** Longer original write-up, one string per paragraph. Needed for a detail page. */
    body: z.object({ sq: z.array(z.string().min(1)), en: z.array(z.string().min(1)) }).optional(),
    /** Municipality or city only, never a street address of a private client. */
    location: localized,
    systems: z.array(z.enum(systemKeys)).min(1),
    type: z.enum(projectTypes),
    /** Completion year, only if the owner confirmed it. */
    year: z.number().int().min(2018).max(2100).optional(),
    /** The first image is the cover (gallery card) and the lead photo of the detail page. */
    images: z.tuple([projectImageSchema], projectImageSchema),
    provenance: z.object({
      /** Who delivered the photos (e.g. "Owner (AL STORE)"). Stock or AI images are not allowed. */
      photosSuppliedBy: z.string().min(1),
      photosReceivedOn: isoDate,
      /** Photographer credit shown under the gallery, if the owner wants one. */
      photoCredit: z.string().min(1).optional(),
      /** Date of the client's written consent to publish this project and its photos. */
      clientConsentOn: isoDate,
      /** Where the consent is filed (e.g. "Signed letter, owner archive, ref. 2026-03"). */
      consentRecord: z.string().min(1),
    }),
  })
  .refine(
    ({ body }) => !body || (body.sq.length > 0 && body.sq.length === body.en.length),
    "body must have the same number of paragraphs in sq and en",
  );

export type Project = z.infer<typeof projectSchema>;
export type ProjectType = Project["type"];
