import { z } from "zod";

import { DECIMAL_MESSAGES, parseDecimal } from "@/lib/decimal";
import { SERIES_KINDS } from "@/server/db/schema/enums";

import { flag, optionalText, requiredText } from "./master-data";

const isoDate = (label: string) =>
  z
    .string({ error: `Zgjidhni ${label}.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: `Zgjidhni ${label}.` })
    .refine(
      (value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
      },
      { error: `${label[0]!.toUpperCase()}${label.slice(1)} nuk është e vlefshme.` },
    );

export const cutoverPlanSchema = z
  .object({
    plannedCutoverDate: isoDate("datën e fillimit të punës në sistem"),
    lastExcelDay: isoDate("ditën e fundit të punës në Excel"),
    midMonthAcknowledged: flag.default(false),
    expectedVersion: z.coerce.number().int().min(0).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.lastExcelDay >= value.plannedCutoverDate) {
      ctx.addIssue({
        code: "custom",
        path: ["lastExcelDay"],
        message: "Dita e fundit në Excel duhet të jetë para datës së fillimit në sistem.",
      });
    }
    if (!value.plannedCutoverDate.endsWith("-01") && !value.midMonthAcknowledged) {
      ctx.addIssue({
        code: "custom",
        path: ["midMonthAcknowledged"],
        message:
          "Fillimi i synuar është ditën e parë të muajit. Për një datë tjetër konfirmoni qasjen e kontabilistit për periudhën.",
      });
    }
  });

export const invoiceSeriesProposalSchema = z
  .object({
    fiscalYear: z.coerce
      .number({ error: "Shkruani vitin kalendarik." })
      .int({ error: "Shkruani vitin kalendarik." })
      .min(2000, { error: "Viti nuk është i vlefshëm." })
      .max(2100, { error: "Viti nuk është i vlefshëm." }),
    kind: z.enum(SERIES_KINDS, { error: "Zgjidhni llojin e serisë." }).default("SALES_INVOICE"),
    code: requiredText("kodin e serisë", 20)
      .transform((value) => value.toUpperCase())
      .pipe(
        z.string().regex(/^[A-Z0-9][A-Z0-9/_-]{0,19}$/, {
          error: "Kodi lejon vetëm shkronja latine, shifra dhe / _ -.",
        }),
      ),
    /** Last number already issued in this year with the old (Excel) process; empty with `noInvoicesYet`. */
    legacyLastNumber: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((value, ctx) => {
        if (value === null || value === undefined || String(value).trim() === "") return null;
        const text = String(value).trim();
        if (!/^\d{1,9}$/.test(text)) {
          ctx.addIssue({ code: "custom", message: "Shkruani një numër të plotë pa presje." });
          return z.NEVER;
        }
        return Number(text);
      }),
    noInvoicesYet: flag.default(false),
    expectedVersion: z.coerce.number().int().min(0).nullish(),
  })
  .superRefine((value, ctx) => {
    if (value.legacyLastNumber === null && !value.noInvoicesYet) {
      ctx.addIssue({
        code: "custom",
        path: ["legacyLastNumber"],
        message:
          "Shkruani numrin e faturës së fundit të lëshuar ose konfirmoni se nuk është lëshuar asnjë faturë këtë vit.",
      });
    }
    if (value.legacyLastNumber !== null && value.noInvoicesYet) {
      ctx.addIssue({
        code: "custom",
        path: ["noInvoicesYet"],
        message: "Ose numri i fundit, ose konfirmimi që nuk ka fatura — jo të dyja.",
      });
    }
  });

const quantity3 = z.string({ error: "Shkruani sasinë." }).transform((value, ctx) => {
  const parsed = parseDecimal(value, { scale: 3 });
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", message: DECIMAL_MESSAGES[parsed.error](3) });
    return z.NEVER;
  }
  return parsed.value;
});

export const openingLineSchema = z
  .object({
    batchId: z.uuid(),
    productId: z.uuid({ error: "Zgjidhni produktin." }),
    status: z.enum(["VERIFIED_QTY", "VERIFIED_ZERO", "UNKNOWN"], {
      error: "Zgjidhni gjendjen e numërimit.",
    }),
    quantity: z.string().nullish(),
    evidence: optionalText(500),
  })
  .transform((value, ctx) => {
    if (value.status === "VERIFIED_QTY") {
      const parsed = quantity3.safeParse(value.quantity ?? "");
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          path: ["quantity"],
          message: parsed.error.issues[0]?.message ?? "Shkruani sasinë.",
        });
        return z.NEVER;
      }
      if (/^0+\.0+$/.test(parsed.data)) {
        ctx.addIssue({
          code: "custom",
          path: ["quantity"],
          message:
            "Sasia e verifikuar duhet të jetë mbi zero. Për zero përdorni «Zero e verifikuar».",
        });
        return z.NEVER;
      }
      return { ...value, quantity: parsed.data };
    }
    return { ...value, quantity: null };
  });

export const openingLineRemoveSchema = z.object({ batchId: z.uuid(), productId: z.uuid() });
export const openingBatchRefSchema = z.object({ batchId: z.uuid() });

export const openingReconcileSchema = z.object({
  batchId: z.uuid(),
  note: requiredText("shënimin e rakordimit me Excel-in", 1000, 10),
});

export const openingSignOffSchema = z.object({
  batchId: z.uuid(),
  expectedLinesHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, { error: "Numërimi nuk është i vlefshëm." }),
  /** Number of products still UNKNOWN that the director saw and accepted. */
  acknowledgedUnknownCount: z
    .union([z.string(), z.number()], {
      error: "Konfirmoni numrin e produkteve pa gjendje të verifikuar.",
    })
    .transform((value, ctx) => {
      const text = String(value).trim();
      if (!/^\d{1,9}$/.test(text)) {
        ctx.addIssue({
          code: "custom",
          message: "Konfirmoni numrin e produkteve pa gjendje të verifikuar (një numër i plotë).",
        });
        return z.NEVER;
      }
      return Number(text);
    }),
});
