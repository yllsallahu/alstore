"use client";

// Error boundaries must be Client Components (Next.js requirement).

import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: ErrorPageProps) {
  const t = useTranslations("Error");

  return (
    <Container className="py-section">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-8 text-3xl font-semibold font-stretch-semi-expanded">{t("title")}</h1>
      <p className="mt-6 max-w-measure text-lg text-ink-muted">{t("description")}</p>
      <button type="button" onClick={reset} className={buttonClasses("primary", "mt-10")}>
        {t("retry")}
      </button>
      {error.digest ? (
        <p className="mt-6 text-xs text-ink-muted">{t("reference", { digest: error.digest })}</p>
      ) : null}
    </Container>
  );
}
