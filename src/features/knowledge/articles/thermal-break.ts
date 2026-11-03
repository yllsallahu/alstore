import type { KnowledgeArticle } from "../schemas";

/**
 * How thermal-break aluminium profiles work. Every value is taken from the
 * sources listed below; figures from RP2790 belong to the one analysed node.
 */
export const thermalBreakArticle: KnowledgeArticle = {
  key: "thermal-break",
  reviewedOn: "2026-10-25",
  related: ["u-values", "performance-classes"],
  sources: [
    {
      title:
        "Test Report 1994-CPR-RP2790: Calculation of thermal transmittance EN ISO 10077-2:2017, system nodes of the series “71 000”",
      publisher: "IRCCOS, for Everest SHPK (issued 23 January 2024)",
      url: "/documents/everest-71000-rp2790.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Përbërja e nyjes, përçueshmëritë termike (EN ISO 10077-2, shtojca D, tabela D.1), kushtet kufitare dhe rezultati Uf = 1,3 W/(m²·K).",
        en: "Node make-up, thermal conductivities (EN ISO 10077-2, Annex D, Table D.1), boundary conditions and the result Uf = 1.3 W/(m²·K).",
      },
    },
    {
      title:
        "EN 14024:2023 Metal profiles with thermal barrier: Mechanical performance: Requirements, proof and tests for assessment",
      publisher: "BSI Knowledge (scope of the CEN standard)",
      url: "https://knowledge.bsigroup.com/products/metal-profiles-with-thermal-barrier-mechanical-performance-requirements-proof-and-tests-for-assessment-3",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Fusha e standardit për rezistencën mekanike të profileve me ndërprerje termike.",
        en: "Scope of the standard on the mechanical strength of thermal-barrier profiles.",
      },
    },
    {
      title: "ISO 10077-1:2017 Thermal performance of windows, doors and shutters: Part 1: General",
      publisher: "New Zealand Building CodeHub (scope of the ISO standard)",
      url: "https://codehub.building.govt.nz/resources/iso-10077-12017",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Që llogaritja e dritares nuk përfshin urën termike në lidhjen e kasës me murin.",
        en: "That the window calculation excludes the thermal bridge where the frame meets the wall.",
      },
    },
  ],
  content: {
    sq: {
      metaTitle: "Ndërprerja termike në profilet e aluminit",
      metaDescription:
        "Pse alumini pa ndërprerje termike humb nxehtësi, si ndahet profili me shirita izolues dhe si llogaritet Uf sipas EN ISO 10077-2, me një nyje EVEREST 71 000.",
      title: "Si funksionon ndërprerja termike në profilet e aluminit",
      lead: "Alumini përcjell nxehtësinë qindra herë më mirë se materialet izoluese. Ndërprerja termike e ndan profilin në dy pjesë, që kasa të mos bëhet urë për nxehtësinë mes dhomës dhe jashtës.",
      excerpt:
        "Pse profili i aluminit ndahet në dy guaska, çfarë bën materiali izolues mes tyre dhe si matet efekti me vlerën Uf.",
      body: [
        { type: "h2", id: "pse", text: "Pse alumini ka nevojë për ndërprerje termike" },
        {
          type: "p",
          text: [
            "Në llogaritjet termike sipas EN ISO 10077-2, lidhja e aluminit 6060 merret me përçueshmëri termike λ = 160 W/(m·K). Në të njëjtën llogaritje, gomina EPDM ka 0,250 W/(m·K), ndërsa profili izolues i nyjes EVEREST 71 000 në raportin RP2790 ka 0,180 W/(m·K). Pra, alumini përcjell rreth 900 herë më shumë nxehtësi se materiali që e ndan.",
          ],
        },
        {
          type: "p",
          text: [
            "Nëse kasa dhe kanati do të ishin një profil i vazhdueshëm alumini nga brenda deri jashtë, nxehtësia e dhomës do të kalonte nëpër metal pothuajse pa pengesë. Kjo është urë termike: dimrit sipërfaqja e brendshme e profilit ftohet, humbjet rriten dhe mbi metalin e ftohtë rritet rreziku i kondensimit.",
          ],
        },
        {
          type: "p",
          text: [
            "Ndërprerja termike e pret këtë rrugë. Profili ndërtohet nga dy pjesë alumini që lidhen me një material me përçueshmëri të ulët, kështu që nxehtësia duhet të kalojë nëpër izolues.",
          ],
        },

        { type: "h2", id: "ndertimi", text: "Si ndërtohet profili" },
        {
          type: "figure",
          figure: "thermal-break",
          caption:
            "Prerje skematike e një profili me ndërprerje termike. Nxehtësia që del nga dhoma duhet të kalojë nëpër shiritat izolues. Skemë ilustruese, jo vizatim teknik i një serie.",
          labels: {
            inside: "Brenda",
            outside: "Jashtë",
            innerShell: "Guaska e brendshme e aluminit",
            outerShell: "Guaska e jashtme e aluminit",
            barrier: "Ndërprerja termike (profile izoluese)",
            glazing: "Xhami izolues",
          },
        },
        {
          type: "ul",
          items: [
            ["Guaska e brendshme e aluminit, nga ana e dhomës."],
            ["Guaska e jashtme e aluminit, nga ana e fasadës."],
            [
              "Ndërprerja termike: profile izoluese që i mbajnë dy guaskat bashkë dhe i ndajnë termikisht.",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "Te nyja EVEREST 71 000 e analizuar në raportin RP2790, ndërprerja përbëhet nga profile Noryl me emrin “Alfatherm”. Brenda nyjes ka edhe elemente që e ngadalësojnë nxehtësinë në zgavra: shkumë polietileni (λ = 0,038 W/(m·K)) dhe një fletë alumini me emetim të ulët (emetimi 0,02), që zvogëlon shkëmbimin e nxehtësisë me rrezatim. Raporti shënon se përshkrimi i materialeve është dhënë nga aplikanti.",
          ],
        },
        { type: "h3", text: "Ndërprerja mban edhe ngarkesë" },
        {
          type: "p",
          text: [
            "Profilet izoluese nuk janë vetëm izolim. Ato lidhin dy guaskat dhe bartin forcat mes tyre, për shembull nga era dhe pesha e xhamit. Standardi EN 14024:2023 përcakton kërkesat dhe provat për rezistencën mekanike të profileve metalike me ndërprerje termike, që përdoren kryesisht për dritare, dyer, ndarje dhe fasada të xhamëzuara. Ai nuk vlen për ndërprerje që nuk kontribuojnë në rezistencën mekanike të profilit.",
          ],
        },

        { type: "h2", id: "uf", text: "Si matet efekti: vlera Uf" },
        {
          type: "p",
          text: [
            "Efekti i ndërprerjes termike shprehet me Uf, koeficientin e kalimit të nxehtësisë së kasës, në W/(m²·K). Sa më e ulët vlera, aq më pak nxehtësi kalon nëpër profil.",
          ],
        },
        {
          type: "p",
          text: [
            "Uf llogaritet me metodën numerike të EN ISO 10077-2. Prerja tërthore e një nyjeje vizatohet në detaje, çdo materiali i jepet përçueshmëria e vet dhe programi llogarit rrjedhën e nxehtësisë në kushte standarde. Në raportin RP2790 këto kushte janë 20 °C brenda dhe 0 °C jashtë, me rezistencë sipërfaqësore 0,13 m²·K/W nga brenda dhe 0,04 m²·K/W nga jashtë.",
          ],
        },
        {
          type: "table",
          caption: "Rezultati i raportit IRCCOS 1994-CPR-RP2790 (23 janar 2024)",
          head: ["Të dhëna", "Vlera"],
          rows: [
            ["Seria (emër tregtar)", "71 000"],
            ["Nyja", "anësore / e poshtme / e sipërme"],
            ["Profilet", "kasë 71101, kanat 71281"],
            ["Xhami", "trefish, 48 mm"],
            ["Metoda", "EN ISO 10077-2:2017, metoda e radiozitetit"],
            ["Rezultati", "Uf = 1,3 W/(m²·K)"],
          ],
        },
        {
          type: "note",
          text: [
            "Kjo vlerë i përket vetëm nyjes së analizuar. Nuk është vlerë e gjithë serisë 71 000, nuk është vlera e një dritareje të tërë dhe nuk vlen për profile të tjera. Raportin e plotë e gjeni te ",
            { text: "dokumentet teknike", to: { page: "documents" } },
            ".",
          ],
        },
        {
          type: "p",
          text: [
            "Uf është vetëm një pjesë e bilancit. Sa nxehtësi humb dritarja e tërë varet edhe nga xhami, distancuesi i xhamit dhe përmasat. Këtë e shpjegon artikulli ",
            { text: "Uf, Ug, Uw dhe Ψg", to: { page: "article", article: "u-values" } },
            ".",
          ],
        },
        {
          type: "p",
          text: [
            "As montimi nuk hyn në këtë numër. Sipas fushës së EN ISO 10077-1, llogaritja e dritares nuk përfshin urën termike në lidhjen e kasës me murin, prandaj detaji i montimit duhet zgjidhur veç në projekt.",
          ],
        },

        { type: "h2", id: "krahasimi", text: "Çfarë të pyesni kur krahasoni profile" },
        {
          type: "ul",
          items: [
            [
              "Cila nyje është llogaritur? Kërkoni prerjen, profilet dhe xhamin me të cilin është bërë llogaritja.",
            ],
            [
              "Sipas cilit standard, nga cili laborator dhe kur? Kërkoni raportin e plotë, jo vetëm numrin.",
            ],
            [
              "A është vlerë e kasës (Uf) apo e dritares (Uw)? Ato nuk krahasohen me njëra-tjetrën.",
            ],
            [
              "Si sillet dritarja ndaj ajrit, ujit dhe erës? Shihni ",
              {
                text: "si lexohen klasat e provave",
                to: { page: "article", article: "performance-classes" },
              },
              ".",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE është distributor i produkteve EVEREST në Kosovë. Seritë e aluminit i gjeni te ",
            { text: "sistemet EVEREST", to: { page: "systems" } },
            ", ndërsa llogaritjen e nyjes 71 000 në ",
            {
              text: "raportin RP2790 (PDF)",
              to: { page: "file", path: "/documents/everest-71000-rp2790.pdf" },
            },
            ". Për një projekt konkret, ",
            { text: "na kontaktoni", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
    en: {
      metaTitle: "How thermal-break aluminium profiles work",
      metaDescription:
        "Why aluminium frames need a thermal break, how insulating strips split the profile and how Uf is calculated to EN ISO 10077-2, using an EVEREST 71 000 node.",
      title: "How a thermal break works in aluminium profiles",
      lead: "Aluminium conducts heat hundreds of times better than insulating materials. A thermal break splits the profile in two so the frame does not become a bridge for heat between the room and the outside.",
      excerpt:
        "Why an aluminium profile is split into two shells, what the insulating material between them does, and how the effect is measured as Uf.",
      body: [
        { type: "h2", id: "why", text: "Why aluminium needs a thermal break" },
        {
          type: "p",
          text: [
            "In thermal calculations to EN ISO 10077-2, 6060 aluminium alloy is taken as having a thermal conductivity of λ = 160 W/(m·K). In the same calculation EPDM gaskets have 0.250 W/(m·K), and the insulating profile of the EVEREST 71 000 node in report RP2790 has 0.180 W/(m·K). Aluminium therefore conducts about 900 times more heat than the material that separates it.",
          ],
        },
        {
          type: "p",
          text: [
            "If the frame and sash were one continuous aluminium section from inside to outside, heat from the room would flow through the metal almost unhindered. That is a thermal bridge: in winter the inner surface of the profile gets cold, heat loss rises and the risk of condensation on the cold metal increases.",
          ],
        },
        {
          type: "p",
          text: [
            "A thermal break cuts that path. The profile is made of two aluminium parts joined by a low-conductivity material, so heat has to pass through insulation.",
          ],
        },

        { type: "h2", id: "construction", text: "How the profile is built" },
        {
          type: "figure",
          figure: "thermal-break",
          caption:
            "Schematic section through a thermal-break profile. Heat leaving the room has to cross the insulating strips. Illustrative diagram, not a technical drawing of any series.",
          labels: {
            inside: "Inside",
            outside: "Outside",
            innerShell: "Inner aluminium shell",
            outerShell: "Outer aluminium shell",
            barrier: "Thermal break (insulating profiles)",
            glazing: "Insulating glass unit",
          },
        },
        {
          type: "ul",
          items: [
            ["The inner aluminium shell, on the room side."],
            ["The outer aluminium shell, on the façade side."],
            [
              "The thermal break: insulating profiles that hold the two shells together and separate them thermally.",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "In the EVEREST 71 000 node analysed in report RP2790, the break is made of Noryl profiles named “Alfatherm”. The node also contains parts that slow heat inside its cavities: polyethylene foam (λ = 0.038 W/(m·K)) and a low-emissivity aluminium foil (emissivity 0.02), which reduces heat exchange by radiation. The report notes that the materials were described by the applicant.",
          ],
        },
        { type: "h3", text: "The break also carries load" },
        {
          type: "p",
          text: [
            "The insulating profiles are not only insulation. They join the two shells and transfer forces between them, for example from wind and the weight of the glass. EN 14024:2023 sets the requirements and tests for the mechanical strength of metal profiles with a thermal barrier, used mainly for windows, doors, screens and curtain walls. It does not apply to barriers that make no contribution to the mechanical resistance of the profile.",
          ],
        },

        { type: "h2", id: "uf", text: "Measuring the effect: the Uf value" },
        {
          type: "p",
          text: [
            "The effect of a thermal break is expressed as Uf, the thermal transmittance of the frame, in W/(m²·K). The lower the value, the less heat passes through the profile.",
          ],
        },
        {
          type: "p",
          text: [
            "Uf is calculated with the numerical method of EN ISO 10077-2. The cross-section of a node is drawn in detail, each material is given its conductivity and software calculates the heat flow under standard conditions. In report RP2790 those conditions are 20 °C inside and 0 °C outside, with a surface resistance of 0.13 m²·K/W inside and 0.04 m²·K/W outside.",
          ],
        },
        {
          type: "table",
          caption: "Result of IRCCOS report 1994-CPR-RP2790 (23 January 2024)",
          head: ["Item", "Value"],
          rows: [
            ["Series (trade name)", "71 000"],
            ["Node", "lateral / lower / upper"],
            ["Profiles", "frame 71101, sash 71281"],
            ["Glazing", "triple, 48 mm"],
            ["Method", "EN ISO 10077-2:2017, radiosity method"],
            ["Result", "Uf = 1.3 W/(m²·K)"],
          ],
        },
        {
          type: "note",
          text: [
            "This value belongs only to the analysed node. It is not a value for the whole 71 000 series, not the value of a complete window and not valid for other profiles. The full report is in the ",
            { text: "technical documents", to: { page: "documents" } },
            ".",
          ],
        },
        {
          type: "p",
          text: [
            "Uf is only part of the picture. How much heat a whole window loses also depends on the glass, the glass spacer and the size. The article ",
            { text: "Uf, Ug, Uw and Ψg", to: { page: "article", article: "u-values" } },
            " explains how they combine.",
          ],
        },
        {
          type: "p",
          text: [
            "Installation is not in this number either. Under the scope of EN ISO 10077-1, the window calculation excludes the thermal bridge where the frame meets the wall, so the fixing detail has to be solved separately in the design.",
          ],
        },

        { type: "h2", id: "comparing", text: "What to ask when comparing profiles" },
        {
          type: "ul",
          items: [
            [
              "Which node was calculated? Ask for the section, the profiles and the glazing used in the calculation.",
            ],
            [
              "To which standard, by which laboratory and when? Ask for the full report, not just the number.",
            ],
            [
              "Is it a frame value (Uf) or a window value (Uw)? The two cannot be compared with each other.",
            ],
            [
              "How does the window perform against air, water and wind? See ",
              {
                text: "how to read the test classes",
                to: { page: "article", article: "performance-classes" },
              },
              ".",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE is a distributor of EVEREST products in Kosovo. The aluminium series are in ",
            { text: "EVEREST systems", to: { page: "systems" } },
            ", and the 71 000 node report is ",
            {
              text: "report RP2790 (PDF)",
              to: { page: "file", path: "/documents/everest-71000-rp2790.pdf" },
            },
            ". For a specific project, ",
            { text: "contact us", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
  },
};
