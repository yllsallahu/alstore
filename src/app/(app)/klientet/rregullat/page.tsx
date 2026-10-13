import { randomUUID } from "node:crypto";

import type { Metadata } from "next";

import { PageHeader, Section } from "@/components/master-data/page-header";
import { SavedNotice } from "@/components/master-data/saved-notice";
import { ConfirmForm, FormatRuleForm } from "@/components/master-data/simple-forms";
import { Unavailable } from "@/components/master-data/unavailable";
import { Alert } from "@/components/ui/alert";
import { formatInstant } from "@/lib/dates";
import { IDENTIFIER_LABELS } from "@/lib/master-data-labels";
import { isAllowed } from "@/server/auth/permissions";
import { getRequestContext } from "@/server/auth/session";
import { listFormatRules } from "@/server/services/master-data/identifier-rules";

import { retireFormatRuleAction, setFormatRuleAction } from "../actions";

export const metadata: Metadata = { title: "Rregullat e numrave identifikues" };

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const saved = (await searchParams).ruajtur;
  const ctx = await getRequestContext();
  const header = (
    <PageHeader
      title="Rregullat e numrave identifikues"
      description="Cilët numra janë të detyrueshëm për një klient dhe cili është formati i tyre. I vendos vetëm kontabilisti, sipas burimeve zyrtare."
      crumbs={[{ href: "/klientet", label: "Klientët" }]}
    />
  );
  if (ctx.kind !== "ready") {
    return (
      <div className="mx-auto max-w-4xl">
        {header}
        <Unavailable context={ctx} />
      </div>
    );
  }
  const rules = await listFormatRules(ctx.db, ctx.actor);
  const active = rules.filter((rule) => rule.status === "ACTIVE");
  const canEdit = isAllowed(ctx.actor.role, "P-15");

  return (
    <div className="mx-auto max-w-4xl">
      {header}
      <SavedNotice code={typeof saved === "string" ? saved : undefined} />
      <Alert tone="info" role="note">
        Pa rregull të miratuar, aplikacioni nuk pretendon që një numër ka format të vlefshëm.
        Formati i vlefshëm nuk është kontroll në regjistrin zyrtar dhe nuk lejon faturimin.
      </Alert>

      <Section title="Rregullat aktive">
        {active.length === 0 ? (
          <p className="text-ink-muted text-sm">Nuk ka ende rregulla të miratuara.</p>
        ) : (
          <ul className="divide-line divide-y">
            {active.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {IDENTIFIER_LABELS[rule.identifierType as keyof typeof IDENTIFIER_LABELS]}
                  </p>
                  <p>
                    {rule.minLength === rule.maxLength
                      ? rule.minLength
                      : `${rule.minLength}–${rule.maxLength}`}{" "}
                    {rule.digitsOnly ? "shifra" : "shenja"} ·{" "}
                    {rule.required ? "i detyrueshëm" : "opsional"}
                  </p>
                  <p className="text-ink-muted break-words">Burimi: {rule.sourceNote}</p>
                  <p className="text-ink-muted">Që nga {formatInstant(rule.createdAt)}</p>
                </div>
                {canEdit && (
                  <ConfirmForm
                    action={retireFormatRuleAction}
                    idempotencyKey={randomUUID()}
                    hidden={{ ruleId: rule.id }}
                    label="Çaktivizo"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Shto ose zëvendëso një rregull"
        description="Një rregull i ri për të njëjtin numër zëvendëson të mëparshmin; i vjetri ruhet në histori."
      >
        {canEdit ? (
          <FormatRuleForm action={setFormatRuleAction} idempotencyKey={randomUUID()} />
        ) : (
          <p className="text-ink-muted text-sm">
            Vetëm kontabilisti mund t&apos;i ndryshojë këto rregulla.
          </p>
        )}
      </Section>
    </div>
  );
}
