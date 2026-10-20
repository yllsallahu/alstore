import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand/brand-mark";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { siteConfig } from "@/config/site";

const linkClass =
  "underline decoration-line-inverse underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-accent";

/** Site footer: distributor statement and the verified contact details. */
export function SiteFooter() {
  const t = useTranslations("Footer");
  const { contact, address, manufacturer } = siteConfig;
  const manufacturerHost = new URL(manufacturer.url).hostname;

  return (
    <footer className="bg-graphite text-on-graphite">
      <Container className="grid gap-12 py-16 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          <BrandMark tone="inverse" />
          <p className="mt-6 max-w-measure text-on-graphite-muted">
            {t.rich("distributor", {
              everest: (chunks) => (
                <strong className="font-semibold text-on-graphite">{chunks}</strong>
              ),
            })}
          </p>
          <p className="mt-4 text-sm text-on-graphite-muted">
            {t("manufacturerLabel")}:{" "}
            <a href={manufacturer.url} className={linkClass}>
              {manufacturerHost}
            </a>
          </p>
        </div>

        <div className="md:col-span-3 md:col-start-7">
          <Eyebrow as="h2" tone="graphite">
            {t("addressHeading")}
          </Eyebrow>
          <address className="mt-5 not-italic">
            {address.street}
            <br />
            {address.locality} {address.postalCode}
            <br />
            {t("country")}
          </address>
        </div>

        <div className="md:col-span-3">
          <Eyebrow as="h2" tone="graphite">
            {t("contactHeading")}
          </Eyebrow>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-sm text-on-graphite-muted">{t("phoneLabel")}</dt>
              <dd>
                <a href={`tel:${contact.phone.e164}`} className={`${linkClass} tabular-nums`}>
                  {contact.phone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-on-graphite-muted">{t("emailLabel")}</dt>
              <dd>
                <a href={`mailto:${contact.email}`} className={`${linkClass} break-all`}>
                  {contact.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </Container>

      <div className="border-t border-line-inverse">
        <Container className="py-6 text-xs text-on-graphite-muted">
          {t("copyright", { year: new Date().getFullYear() })}
        </Container>
      </div>
    </footer>
  );
}
