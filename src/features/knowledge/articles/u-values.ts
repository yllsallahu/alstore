import type { KnowledgeArticle } from "../schemas";

/**
 * Window U-values (Uf, Ug, Ψg, Uw). Kosovo values come from a draft regulation
 * and are labelled as such; RP2790 belongs to one analysed node only.
 */
export const uValuesArticle: KnowledgeArticle = {
  key: "u-values",
  reviewedOn: "2026-10-25",
  related: ["thermal-break", "performance-classes"],
  sources: [
    {
      title:
        "SS-EN ISO 10077-1:2017 Thermal performance of windows, doors and shutters: Part 1: General",
      publisher: "Swedish Institute for Standards (SIS), scope of the EN ISO standard",
      url: "https://www.sis.se/en/produkter/construction-materials-and-building/elements-of-buildings/doors-and-windows/ss-en-iso-10077-12017",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Që EN ISO 10077-1 është metoda e llogaritjes së Uw për dritare dhe dyer këmbësorësh.",
        en: "That EN ISO 10077-1 is the calculation method for Uw of windows and pedestrian doors.",
      },
    },
    {
      title: "ISO 10077-1:2017 Thermal performance of windows, doors and shutters: Part 1: General",
      publisher: "New Zealand Building CodeHub (scope of the ISO standard)",
      url: "https://codehub.building.govt.nz/resources/iso-10077-12017",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Çfarë nuk përfshin llogaritja: rrezatimi diellor, rrjedhja e ajrit, kondensimi, lidhja me murin; produktet jashtë fushës.",
        en: "What the calculation excludes: solar radiation, air leakage, condensation, the wall junction; products outside its scope.",
      },
    },
    {
      title:
        "SS-EN 673:2024 Glass in building: Determination of thermal transmittance (U value): Calculation method",
      publisher: "Swedish Institute for Standards (SIS), scope of the EN standard",
      url: "https://www.sis.se/en/produkter/glass-and-ceramics-industries/glass/glass-in-building/ss-en-6732024/",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Që Ug i përket zonës qendrore të xhamit dhe nuk përfshin efektet e distancuesit dhe të kasës.",
        en: "That Ug covers the central area of the glass and excludes spacer and frame edge effects.",
      },
    },
    {
      title:
        "Test Report 1994-CPR-RP2790: Calculation of thermal transmittance EN ISO 10077-2:2017, system nodes of the series “71 000”",
      publisher: "IRCCOS, for Everest SHPK (issued 23 January 2024)",
      url: "/documents/everest-71000-rp2790.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Shembulli Uf = 1,3 W/(m²·K) për një nyje dhe kushtet e llogaritjes.",
        en: "The example Uf = 1.3 W/(m²·K) for one node and its calculation conditions.",
      },
    },
    {
      title:
        "Projekt Rregullore (MMPH) Nr. ___/2026 për kërkesat minimale për performancën energjetike të ndërtesave",
      publisher: "Ministria e Mjedisit dhe Planifikimit Hapësinor, Republika e Kosovës (projekt)",
      url: "https://mmphi.rks-gov.net/MMPHIFolder/AnnouncementFiles/2026_26ec2809-e1c5-48f0-b73e-e6f4e02bf1af.docx",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Baza ligjore (Ligji Nr. 08/L-242, GZ Nr. 10/12.06.2024), vlera referente U = 1,60 W/(m²·K) për komponentët e xhamëzuar dhe g = 0,60.",
        en: "Legal basis (Law No. 08/L-242, OG No. 10/12.06.2024), the reference value U = 1.60 W/(m²·K) for glazed components and g = 0.60.",
      },
    },
  ],
  content: {
    sq: {
      metaTitle: "Vlerat U të dritareve: Uf, Ug, Uw dhe Ψg",
      metaDescription:
        "Çfarë tregojnë Uf, Ug, Uw dhe Ψg, si llogaritet Uw sipas EN ISO 10077-1, çfarë nuk mbulon vlera U dhe cilën vlerë referente propozon Kosova për dritaret.",
      title: "Uf, Ug, Uw dhe Ψg: si lexohen vlerat e izolimit termik të dritareve",
      lead: "Vlera U e një dritareje nuk është një numër i vetëm. Kasa, xhami dhe skaji i xhamit kanë secili vlerën e vet, dhe vetëm të bashkuara japin vlerën e dritares së tërë.",
      excerpt:
        "Çfarë mat secila vlerë, si bashkohen në Uw sipas EN ISO 10077-1 dhe çfarë propozon projekt-rregullorja e Kosovës për dritaret.",
      body: [
        { type: "h2", id: "cfare-mat", text: "Çfarë mat vlera U" },
        {
          type: "p",
          text: [
            "Vlera U, ose koeficienti i kalimit të nxehtësisë, tregon sa vat nxehtësi kalojnë nëpër një metër katror të një elementi kur temperatura brenda dhe jashtë ndryshon për një kelvin, pra për një gradë Celsius. Njësia është W/(m²·K). Sa më e ulët vlera, aq më mirë izolon elementi.",
          ],
        },
        {
          type: "p",
          text: [
            "Për dritaret përdoren katër simbole. Secili i përket një pjese tjetër të dritares dhe llogaritet sipas një standardi tjetër.",
          ],
        },
        {
          type: "table",
          caption: "Simbolet kryesore",
          head: ["Simboli", "Çfarë përshkruan", "Njësia", "Standardi"],
          rows: [
            ["Ug", "Xhamin, në zonën qendrore larg skajeve", "W/(m²·K)", "EN 673"],
            ["Uf", "Kasën dhe kanatin (profilin)", "W/(m²·K)", "EN ISO 10077-2"],
            [
              "Ψg",
              "Humbjen shtesë në skajin e xhamit, ku takohen xhami, distancuesi dhe kasa",
              "W/(m·K)",
              "EN ISO 10077-1 / 10077-2",
            ],
            ["Uw", "Dritaren e tërë", "W/(m²·K)", "EN ISO 10077-1"],
          ],
        },
        {
          type: "p",
          text: [
            "EN 673 e jep Ug vetëm për zonën qendrore të xhamit. Ura termike nëpër distancuesin e xhamit izolues dhe nëpër kasë nuk përfshihet në Ug; ajo hyn në llogaritje përmes Ψg.",
          ],
        },

        { type: "h2", id: "uw", text: "Si bashkohen në vlerën e dritares" },
        {
          type: "p",
          text: [
            "EN ISO 10077-1 i bashkon pjesët sipas sipërfaqes ose gjatësisë që zë secila në dritare:",
          ],
        },
        {
          type: "formula",
          label: "Llogaritja e Uw sipas EN ISO 10077-1",
          text: "Uw = (Ag × Ug + Af × Uf + lg × Ψg) / (Ag + Af)",
        },
        {
          type: "ul",
          items: [
            ["Ag: sipërfaqja e dukshme e xhamit, në m²."],
            ["Af: sipërfaqja e kasës dhe e kanatit, e parë nga përpara, në m²."],
            ["lg: perimetri i dukshëm i xhamit, në m."],
            ["Ug, Uf dhe Ψg: vlerat nga tabela më sipër."],
          ],
        },
        {
          type: "figure",
          figure: "window-areas",
          caption:
            "Pamje e përparme e një dritareje me një kanat: sipërfaqja e kasës (Af), sipërfaqja e xhamit (Ag) dhe perimetri i dukshëm i xhamit (lg). Skemë ilustruese.",
          labels: {
            frame: "Af: kasa dhe kanati",
            glass: "Ag: xhami",
            edge: "lg: perimetri i dukshëm i xhamit",
          },
        },
        {
          type: "p",
          text: [
            "Nga formula del se Uw varet nga përmasat. E njëjta kasë me të njëjtin xham jep një Uw për një dritare të vogël dhe një tjetër për një të madhe, sepse ndryshojnë raporti mes kasës dhe xhamit dhe gjatësia e skajit. Kur krahasoni dy oferta, krahasoni Uw për të njëjtat përmasa dhe të njëjtin tip hapjeje.",
          ],
        },
        {
          type: "p",
          text: [
            "Për të njëjtën arsye, Uf i ulët nuk mjafton vetë. Profili ndikon në Uw vetëm me pjesën që zë, ndërsa xhami dhe distancuesi ndikojnë me pjesën e tyre. Si ulet Uf me ndërprerje termike e shpjegon artikulli ",
            {
              text: "si funksionon ndërprerja termike",
              to: { page: "article", article: "thermal-break" },
            },
            ".",
          ],
        },

        { type: "h2", id: "cfare-nuk-tregon", text: "Çfarë nuk tregon vlera U" },
        {
          type: "p",
          text: ["Sipas fushës së EN ISO 10077-1, llogaritja e Uw nuk përfshin:"],
        },
        {
          type: "ul",
          items: [
            ["efektet e rrezatimit diellor, që për xhamin përshkruhen me faktorin g;"],
            [
              "humbjet nga rrjedhja e ajrit nëpër fuga, që lidhen me ",
              {
                text: "klasën e përshkueshmërisë së ajrit",
                to: { page: "article", article: "performance-classes" },
              },
              ";",
            ],
            ["llogaritjen e kondensimit;"],
            ["urën termike në lidhjen e kasës me murin."],
          ],
        },
        {
          type: "p",
          text: [
            "Standardi nuk vlen për fasadat e xhamëzuara dhe xhamëzimin strukturor, as për dyert industriale, komerciale dhe të garazheve. Ato kanë standardet e veta.",
          ],
        },

        { type: "h2", id: "raportet-everest", text: "Vlera në raportet EVEREST" },
        {
          type: "p",
          text: [
            "Raporti IRCCOS 1994-CPR-RP2790 jep Uf = 1,3 W/(m²·K) për një nyje të serisë 71 000 (kasë 71101, kanat 71281, xham trefish 48 mm), të llogaritur sipas EN ISO 10077-2:2017 me 20 °C brenda dhe 0 °C jashtë.",
          ],
        },
        {
          type: "note",
          text: [
            "Kjo është vlerë e kasës për atë nyje, jo Uw i një dritareje dhe jo vlerë e gjithë serisë. Për të nxjerrë Uw duhen edhe Ug i xhamit të zgjedhur, Ψg i distancuesit dhe përmasat e dritares. Raporti i plotë është te ",
            { text: "dokumentet teknike", to: { page: "documents" } },
            ".",
          ],
        },

        { type: "h2", id: "kosova", text: "Kërkesat në Kosovë" },
        {
          type: "p",
          text: [
            "Ligji Nr. 08/L-242 për Performancën Energjetike të Ndërtesave është botuar në Gazetën Zyrtare të Republikës së Kosovës, Nr. 10, më 12.06.2024. Kërkesat minimale për elementet e mbështjellësit të ndërtesës i përcakton ministria me rregullore.",
          ],
        },
        {
          type: "p",
          text: [
            "Projekt-rregullorja e Ministrisë së Mjedisit dhe Planifikimit Hapësinor për kërkesat minimale (2026) propozon që vlera U e çdo elementi të mbështjellësit, përfshirë dritaret, të mos e kalojë vlerën maksimale në tabelën e saj. Për komponentët e xhamëzuar (dritare, dritare kulmi, dyer të xhamëzuara) vlera referente është 1,60 W/(m²·K), njësoj për ndërtesat e reja dhe ato të rinovuara. Faktori diellor referent i dritares është g = 0,60.",
          ],
        },
        {
          type: "note",
          text: [
            "Kur e lexuam, më 25 tetor 2026, dokumenti ishte projekt i publikuar nga ministria. Para se ta përdorni në projekt, kontrolloni tekstin e miratuar në Gazetën Zyrtare. Vlera 1,60 krahasohet me vlerën e komponentit të tërë (Uw), jo me Uf të profilit.",
          ],
        },

        { type: "h2", id: "oferta", text: "Çfarë të kërkoni në ofertë" },
        {
          type: "ul",
          items: [
            [
              "Uw për përmasat dhe tipin e dritares suaj, me vlerat Ug, Uf dhe Ψg që janë përdorur.",
            ],
            ["Raportin ose llogaritjen nga vjen secila vlerë, me standardin dhe datën."],
            ["Tipin e xhamit izolues dhe të distancuesit."],
            [
              "Klasat e ajrit, ujit dhe erës për një mostër të ngjashme (",
              { text: "si lexohen", to: { page: "article", article: "performance-classes" } },
              ").",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE është distributor i produkteve EVEREST në Kosovë. Seritë i gjeni te ",
            { text: "sistemet EVEREST", to: { page: "systems" } },
            "; për një projekt konkret, ",
            { text: "na kontaktoni", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
    en: {
      metaTitle: "Window U-values explained: Uf, Ug, Uw and Ψg",
      metaDescription:
        "What Uf, Ug, Uw and Ψg describe, how Uw is calculated to EN ISO 10077-1, what a U-value leaves out and the reference value Kosovo proposes for windows.",
      title: "Uf, Ug, Uw and Ψg: how to read window insulation values",
      lead: "A window's U-value is not a single number. The frame, the glass and the glass edge each have their own value, and only together do they give the value of the whole window.",
      excerpt:
        "What each value measures, how they combine into Uw under EN ISO 10077-1 and what Kosovo's draft regulation proposes for windows.",
      body: [
        { type: "h2", id: "what-it-measures", text: "What a U-value measures" },
        {
          type: "p",
          text: [
            "A U-value, or thermal transmittance, is the number of watts of heat that pass through one square metre of an element when the temperature inside and outside differs by one kelvin, that is one degree Celsius. The unit is W/(m²·K). The lower the value, the better the element insulates.",
          ],
        },
        {
          type: "p",
          text: [
            "Windows use four symbols. Each belongs to a different part of the window and is calculated to a different standard.",
          ],
        },
        {
          type: "table",
          caption: "The main symbols",
          head: ["Symbol", "What it describes", "Unit", "Standard"],
          rows: [
            ["Ug", "The glass, in the central area away from the edges", "W/(m²·K)", "EN 673"],
            ["Uf", "The frame and sash (the profile)", "W/(m²·K)", "EN ISO 10077-2"],
            [
              "Ψg",
              "The extra loss at the glass edge, where glass, spacer and frame meet",
              "W/(m·K)",
              "EN ISO 10077-1 / 10077-2",
            ],
            ["Uw", "The whole window", "W/(m²·K)", "EN ISO 10077-1"],
          ],
        },
        {
          type: "p",
          text: [
            "EN 673 gives Ug for the central area of the glass only. The thermal bridge through the spacer of the insulating glass unit and through the frame is not part of Ug; it enters the calculation through Ψg.",
          ],
        },

        { type: "h2", id: "uw", text: "How they combine into the window value" },
        {
          type: "p",
          text: [
            "EN ISO 10077-1 combines the parts according to the area or length each one takes up in the window:",
          ],
        },
        {
          type: "formula",
          label: "Calculating Uw to EN ISO 10077-1",
          text: "Uw = (Ag × Ug + Af × Uf + lg × Ψg) / (Ag + Af)",
        },
        {
          type: "ul",
          items: [
            ["Ag: the visible glass area, in m²."],
            ["Af: the frame and sash area seen from the front, in m²."],
            ["lg: the visible perimeter of the glass, in m."],
            ["Ug, Uf and Ψg: the values from the table above."],
          ],
        },
        {
          type: "figure",
          figure: "window-areas",
          caption:
            "Front view of a single-sash window: the frame area (Af), the glass area (Ag) and the visible glass perimeter (lg). Illustrative diagram.",
          labels: {
            frame: "Af: frame and sash",
            glass: "Ag: glass",
            edge: "lg: visible glass perimeter",
          },
        },
        {
          type: "p",
          text: [
            "The formula shows that Uw depends on size. The same frame with the same glass gives one Uw for a small window and another for a large one, because the frame-to-glass ratio and the edge length change. When comparing two quotations, compare Uw for the same size and the same opening type.",
          ],
        },
        {
          type: "p",
          text: [
            "For the same reason a low Uf is not enough on its own. The profile affects Uw only in proportion to the area it takes up, and the glass and spacer contribute their share. How a thermal break lowers Uf is explained in ",
            {
              text: "how a thermal break works",
              to: { page: "article", article: "thermal-break" },
            },
            ".",
          ],
        },

        { type: "h2", id: "what-it-leaves-out", text: "What a U-value does not tell you" },
        {
          type: "p",
          text: ["Under the scope of EN ISO 10077-1, the Uw calculation does not include:"],
        },
        {
          type: "ul",
          items: [
            ["the effects of solar radiation, described for glass by its g-value;"],
            [
              "heat loss from air leaking through joints, which relates to the ",
              {
                text: "air permeability class",
                to: { page: "article", article: "performance-classes" },
              },
              ";",
            ],
            ["condensation calculations;"],
            ["the thermal bridge where the frame meets the wall."],
          ],
        },
        {
          type: "p",
          text: [
            "The standard does not apply to curtain walls and structural glazing, or to industrial, commercial and garage doors. Those have their own standards.",
          ],
        },

        { type: "h2", id: "everest-reports", text: "The value in EVEREST's reports" },
        {
          type: "p",
          text: [
            "IRCCOS report 1994-CPR-RP2790 gives Uf = 1.3 W/(m²·K) for one node of the 71 000 series (frame 71101, sash 71281, 48 mm triple glazing), calculated to EN ISO 10077-2:2017 with 20 °C inside and 0 °C outside.",
          ],
        },
        {
          type: "note",
          text: [
            "This is a frame value for that node, not the Uw of a window and not a value for the whole series. Working out Uw also needs the Ug of the chosen glass, the Ψg of the spacer and the window size. The full report is in the ",
            { text: "technical documents", to: { page: "documents" } },
            ".",
          ],
        },

        { type: "h2", id: "kosovo", text: "Requirements in Kosovo" },
        {
          type: "p",
          text: [
            "Law No. 08/L-242 on the Energy Performance of Buildings was published in the Official Gazette of the Republic of Kosovo, No. 10, on 12 June 2024. Minimum requirements for building envelope elements are set by the ministry through a regulation.",
          ],
        },
        {
          type: "p",
          text: [
            "The Ministry of Environment and Spatial Planning's draft regulation on minimum requirements (2026) proposes that the U-value of every envelope element, windows included, must not exceed the maximum in its table. For glazed components (windows, roof windows, glazed doors) the reference value is 1.60 W/(m²·K), for new and renovated buildings alike. The reference solar factor for windows is g = 0.60.",
          ],
        },
        {
          type: "note",
          text: [
            "When we read it on 25 October 2026 the document was a draft published by the ministry. Check the adopted text in the Official Gazette before using it in a project. The 1.60 value is compared with the whole component (Uw), not with the Uf of the profile.",
          ],
        },

        { type: "h2", id: "quotation", text: "What to ask for in a quotation" },
        {
          type: "ul",
          items: [
            ["Uw for your window's size and type, with the Ug, Uf and Ψg values used."],
            ["The report or calculation each value comes from, with its standard and date."],
            ["The type of insulating glass unit and spacer."],
            [
              "Air, water and wind classes for a similar sample (",
              { text: "how to read them", to: { page: "article", article: "performance-classes" } },
              ").",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE is a distributor of EVEREST products in Kosovo. The series are in ",
            { text: "EVEREST systems", to: { page: "systems" } },
            "; for a specific project, ",
            { text: "contact us", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
  },
};
