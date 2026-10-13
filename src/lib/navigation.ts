export type ModuleSlug =
  | "shitje-e-re"
  | "faturat"
  | "klientet"
  | "blerje-e-re"
  | "furnitoret"
  | "stoku"
  | "pagesat"
  | "atk-edi"
  | "shpenzimet"
  | "raportet"
  | "cilesimet";

export type AppModule = {
  slug: ModuleSlug;
  href: `/${ModuleSlug}`;
  label: string;
  description: string;
  primaryAction: string;
  plannedPhase: string;
  /** Default "inactive": an honest placeholder. "partial": some screens work. */
  status?: "inactive" | "partial" | "active";
  notice?: string;
};

export const HOME = { href: "/", label: "Ballina" } as const;

export const MODULES: readonly AppModule[] = [
  {
    slug: "shitje-e-re",
    href: "/shitje-e-re",
    label: "Shitje e re",
    description:
      "Faturë B2B për klient biznesi të verifikuar, me dorëzim të menjëhershëm të mallit.",
    primaryAction: "Fillo shitjen",
    plannedPhase: "07–08",
  },
  {
    slug: "faturat",
    href: "/faturat",
    label: "Faturat",
    description: "Faturat tatimore të lëshuara dhe dokumentet korrigjuese.",
    primaryAction: "Kërko fatura",
    plannedPhase: "08–09",
  },
  {
    slug: "klientet",
    href: "/klientet",
    label: "Klientët",
    description: "Klientët biznes të regjistruar dhe statusi i verifikimit të tyre.",
    primaryAction: "Shto klient",
    plannedPhase: "03",
    status: "active",
  },
  {
    slug: "blerje-e-re",
    href: "/blerje-e-re",
    label: "Blerje e re",
    description: "Fatura e furnitorit, DUD-i dhe pranimi fizik i mallit në depo.",
    primaryAction: "Regjistro blerjen",
    plannedPhase: "10",
  },
  {
    slug: "furnitoret",
    href: "/furnitoret",
    label: "Furnitorët",
    description: "Furnitorët nga Kosova dhe Shqipëria.",
    primaryAction: "Shto furnitor",
    plannedPhase: "03",
    status: "active",
  },
  {
    slug: "stoku",
    href: "/stoku",
    label: "Stoku",
    description: "Gjendja dhe lëvizjet e stokut sipas SKU-së, në kg, m² dhe copë.",
    primaryAction: "Shiko gjendjen",
    plannedPhase: "04–05",
    status: "partial",
  },
  {
    slug: "pagesat",
    href: "/pagesat",
    label: "Pagesat / Borxhet",
    description: "Pagesat në para të gatshme dhe me bankë, dhe borxhet e regjistruara në AL STORE.",
    primaryAction: "Regjistro pagesë",
    plannedPhase: "12–13",
  },
  {
    slug: "atk-edi",
    href: "/atk-edi",
    label: "ATK / EDI",
    description:
      "Libri i Blerjes, Libri i Shitjes, rishikimi i kontabilistit dhe miratimi i drejtorit.",
    primaryAction: "Përgatit periudhën",
    plannedPhase: "14–16",
    notice: "Eksporti ATK është në pritje të verifikimit",
  },
  {
    slug: "shpenzimet",
    href: "/shpenzimet",
    label: "Shpenzimet",
    description: "Shpenzimet e biznesit pa ndikim në stok: qira, rrymë, transport, shërbime.",
    primaryAction: "Shto shpenzim",
    plannedPhase: "11",
  },
  {
    slug: "raportet",
    href: "/raportet",
    label: "Raportet",
    description: "Raportet e shitjeve, stokut, pagesave, shpenzimeve dhe tatimeve.",
    primaryAction: "Hap raportin",
    plannedPhase: "17",
  },
  {
    slug: "cilesimet",
    href: "/cilesimet",
    label: "Cilësimet",
    description: "Llogaritë personale, të dhënat e kompanisë dhe miratimet.",
    primaryAction: "Ndrysho cilësimet",
    plannedPhase: "02",
    status: "partial",
  },
];

export const HOME_ACTION_SLUGS = ["shitje-e-re", "blerje-e-re", "stoku", "atk-edi"] as const;

export function findModule(slug: string): AppModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModule(slug: ModuleSlug): AppModule {
  const m = findModule(slug);
  if (!m) throw new Error(`Missing module ${slug}`);
  return m;
}

export function homeActions(): AppModule[] {
  return HOME_ACTION_SLUGS.map(getModule);
}
