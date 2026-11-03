import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { ExternalIcon } from "@/components/ui/icons";
import { Photo } from "@/components/ui/photo";
import { Reveal } from "@/components/ui/reveal";
import { revealItem } from "@/components/ui/reveal-classes";
import { siteConfig } from "@/config/site";
import { cx } from "@/lib/cx";

type ClosingCtaProps = {
  /** Anchor id; the homepage instance is the "Contact" navigation target. */
  id?: string;
};

const detailLabel = "text-xs text-on-graphite-muted";
const detailLink =
  "mt-1 inline-flex min-h-11 items-center gap-2 text-lg transition-colors duration-200 ease-standard hover:text-everest";

/**
 * Closing call to action over a full-bleed photograph: call, email, or visit.
 * Quotation requests go by phone or email until the quotation form ships.
 */
export async function ClosingCta({ id = "closing-cta" }: ClosingCtaProps) {
  const t = await getTranslations("ClosingCta");
  const tFooter = await getTranslations("Footer");
  const { contact, address } = siteConfig;
  const mailto = `mailto:${contact.email}?subject=${encodeURIComponent(t("emailSubject"))}`;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="relative isolate overflow-hidden bg-graphite text-on-graphite"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <Photo name="poolVilla" decorative sizes="100vw" />
        <div className="absolute inset-0 bg-linear-to-r from-graphite/90 via-graphite/70 to-graphite/30" />
      </div>

      <Reveal>
        <Container className="flex min-h-fold flex-col justify-center py-section">
          <h2
            id={`${id}-title`}
            className={cx(
              "max-w-headline text-statement font-light text-balance font-stretch-semi-expanded",
              revealItem,
            )}
          >
            {t("title")}
          </h2>
          <p
            className={cx(
              "mt-6 max-w-md text-lg text-pretty text-on-graphite/85",
              revealItem,
              "delay-150",
            )}
          >
            {t("lead")}
          </p>
          <div className={cx("mt-10 flex flex-col gap-3 sm:flex-row", revealItem, "delay-300")}>
            <a href={`tel:${contact.phone.e164}`} className={buttonClasses("primaryInverse")}>
              {t("callAction")}
            </a>
            <a href={mailto} className={buttonClasses("secondaryInverse")}>
              {t("emailAction")}
            </a>
          </div>

          <dl
            className={cx(
              "mt-16 grid gap-6 border-t border-on-graphite/20 pt-6 sm:grid-cols-3",
              revealItem,
              "delay-500",
            )}
          >
            <div>
              <dt className={detailLabel}>{tFooter("phoneLabel")}</dt>
              <dd>
                <a href={`tel:${contact.phone.e164}`} className={cx(detailLink, "tabular-nums")}>
                  {contact.phone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt className={detailLabel}>{tFooter("emailLabel")}</dt>
              <dd>
                <a href={`mailto:${contact.email}`} className={cx(detailLink, "break-all")}>
                  {contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className={detailLabel}>{tFooter("addressHeading")}</dt>
              <dd>
                <a href={address.mapUrl} target="_blank" rel="noopener" className={detailLink}>
                  {address.street}, {address.locality}
                  <span className="sr-only">: {tFooter("mapLink")}</span>
                  <ExternalIcon className="size-4 shrink-0" />
                </a>
              </dd>
            </div>
          </dl>
        </Container>
      </Reveal>
    </section>
  );
}
