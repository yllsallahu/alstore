import { z } from "zod";

import { flag, optionalText, requiredText } from "./master-data";

export const importKindSchema = z.enum(["PRODUCTS", "OPENING_STOCK"], {
  error: "Lloji i importit nuk njihet.",
});

const sanitizeFileName = (value: string) =>
  value
    .replace(/^.*[\\/]/, "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);

export const importUploadSchema = z
  .object({
    kind: importKindSchema,
    fileName: z
      .string({ error: "Zgjidhni një skedar." })
      .transform(sanitizeFileName)
      .pipe(z.string().min(1, { error: "Zgjidhni një skedar." })),
    targetOpeningBatchId: z.uuid().nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "OPENING_STOCK" && !value.targetOpeningBatchId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetOpeningBatchId"],
        message: "Numërimi fillestar ngarkohet në një grup numërimi në hartim.",
      });
    }
    if (value.kind === "PRODUCTS" && value.targetOpeningBatchId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetOpeningBatchId"],
        message: "Importi i produkteve nuk lidhet me numërimin fillestar.",
      });
    }
  });

export const importRemapSchema = z.object({
  batchId: z.uuid(),
  mapping: z.record(z.string(), z.number().int().min(-1).max(1000)),
});

export const importApproveSchema = z.object({
  batchId: z.uuid(),
  mode: z.enum(["ALL_OR_NOTHING", "REVIEWED_PARTIAL"], { error: "Zgjidhni mënyrën e miratimit." }),
  acknowledgeWarnings: flag.default(false),
  acknowledgedErrorRows: z.coerce.number().int().min(0).nullish(),
  expectedPreviewHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, { error: "Parashikimi nuk është i vlefshëm." }),
  note: optionalText(500),
});

export const importRejectSchema = z.object({
  batchId: z.uuid(),
  note: requiredText("arsyen e refuzimit", 500, 3),
});

export const importListSchema = z.object({
  kind: importKindSchema.optional(),
});
