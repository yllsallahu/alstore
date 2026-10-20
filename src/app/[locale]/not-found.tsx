import { useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Link } from "@/i18n/navigation";

/** Localized 404 for any unknown path inside a locale (see [...rest]/page.tsx). */
export default function LocaleNotFound() {
  const t = useTranslations("NotFound");

  return (
    <Container className="py-section">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-8 text-3xl font-semibold font-stretch-semi-expanded">{t("title")}</h1>
      <p className="mt-6 max-w-measure text-lg text-ink-muted">{t("description")}</p>
      <Link href="/" className={buttonClasses("primary", "mt-10")}>
        {t("backHome")}
      </Link>
    </Container>
  );
}
