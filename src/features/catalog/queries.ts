import { z } from "zod";
import { technicalDocuments } from "./documents";

/**
 * Server read for the technical-document register. Pages call this; the UI
 * does not open PDFs or environment files itself.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fileUrl = z.union([z.url(), z.string().regex(/^\/documents\/[a-z0-9-]+\.pdf$/)]);

const documentSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["test-report", "environmental-declaration", "certification"]),
  group: z.enum(["aluminium", "pvc", "manufacturer"]),
  series: z.string().min(1).nullable(),
  reportNumber: z.string().min(1),
  issuedOn: isoDate.nullable(),
  validUntil: isoDate.nullable(),
  issuer: z.string().min(1),
  offer: z.enum(["documentation", "not-sold"]),
  pendingClassification: z.boolean(),
  previewUrl: fileUrl,
  links: z.array(
    z.object({
      id: z.enum(["file", "registry", "verification", "technicalReport"]),
      href: fileUrl,
    }),
  ),
  facts: z.array(z.string().min(1)).min(1),
});

export function listTechnicalDocuments() {
  const parsed = z.array(documentSchema).safeParse(technicalDocuments);

  if (!parsed.success) {
    throw new Error(`Invalid technical documents:\n${z.prettifyError(parsed.error)}`);
  }

  for (const document of technicalDocuments) {
    const hybrid =
      document.series === "EV HYBRID" ||
      document.series === "67 000" ||
      document.id === "ph2570" ||
      document.id === "epd26336";

    if (hybrid && (document.offer !== "not-sold" || document.group !== "manufacturer")) {
      throw new Error(`${document.id} must stay a manufacturer reference and must not be offered`);
    }
  }

  return technicalDocuments;
}
