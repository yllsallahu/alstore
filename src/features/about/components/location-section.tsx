import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button-classes";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ExternalIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";

/** Where AL STORE is: the verified address and the owner-supplied Google Maps pin. */
export async function LocationSection() {
  const t = await getTranslations("AboutPage.location");
  const tFooter = await getTranslations("Footer");
  const { address } = siteConfig;

  return (
    <section aria-labelledby="location" className="bg-paper-sunken">
      <Container className="grid gap-10 py-section md:grid-cols-12 md:gap-8">
        <div className="flex flex-col md:col-span-4">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2
            id="location"
            className="mt-5 text-3xl font-light text-balance font-stretch-semi-expanded"
          >
            {t("title")}
          </h2>
          <address className="mt-8 text-lg not-italic">
            {address.street}
            <br />
            {address.locality} {address.postalCode}, {tFooter("country")}
          </address>
          <a
            href={address.mapUrl}
            target="_blank"
            rel="noopener"
            className={buttonClasses("secondary", "mt-8 self-start")}
          >
            {tFooter("mapLink")}
            <ExternalIcon className="size-4" />
          </a>
        </div>
        <iframe
          src={address.mapEmbedUrl}
          title={t("mapTitle")}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="aspect-4/3 w-full border border-line grayscale md:col-span-8 md:aspect-auto md:min-h-96"
        />
      </Container>
    </section>
  );
}
