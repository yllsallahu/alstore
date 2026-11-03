import type { KnowledgeArticle } from "../schemas";

/**
 * Air, water and wind classes (EN 12207, EN 12208, EN 12210). Class tables are
 * copied from the classification sections of IRCCOS report RP2147; sample
 * results are the ones recorded in docs/CONTENT_SOURCES.md §5, each for its
 * named sample only.
 */
export const performanceClassesArticle: KnowledgeArticle = {
  key: "performance-classes",
  reviewedOn: "2026-10-25",
  related: ["u-values", "thermal-break"],
  sources: [
    {
      title:
        "Test Report 1994-CPR-RP2147: air permeability, watertightness and resistance to wind load, double-casement window of the series “70000”",
      publisher: "IRCCOS, for Everest SHPK (issued 23 December 2020)",
      url: "/documents/everest-70000-rp2147.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Procedurat e provave (EN 1026, EN 1027, EN 12211), tabelat e klasave të EN 12207, EN 12208 dhe EN 12210, kriteret e vlerësimit dhe rezultatet e mostrës 70 000.",
        en: "Test procedures (EN 1026, EN 1027, EN 12211), the class tables of EN 12207, EN 12208 and EN 12210, the assessment criteria and the 70 000 sample results.",
      },
    },
    {
      title: "Test Report 1994-CPR-RP2146, series 71 000",
      publisher: "IRCCOS, for Everest SHPK (issued 23 December 2020)",
      url: "/documents/everest-71000-rp2146.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Klasat e mostrës 71 000.",
        en: "Classes of the 71 000 sample.",
      },
    },
    {
      title: "Test Report 1994-CPR-RP2176, PVC series 85 000",
      publisher: "IRCCOS, for Everest SHPK (issued 16 February 2021)",
      url: "/documents/everest-pvc-85000-rp2176.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Klasat e mostrës PVC 85 000.",
        en: "Classes of the PVC 85 000 sample.",
      },
    },
    {
      title: "Test Report 1994-CPR-RP2157, PB2AAR_EVEREST_91000",
      publisher: "IRCCOS, for Everest SHPK (cover date 13 January 2021)",
      url: "/documents/everest-91000-rp2157.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Klasat e mostrës së derës rrëshqitëse 91 000.",
        en: "Classes of the 91 000 sliding-door sample.",
      },
    },
    {
      title: "Test Reports 1994-CPR-RP2144 and 1994-CPR-RP2145, series 92 000",
      publisher: "IRCCOS, for Everest SHPK (issued 23 December 2020)",
      url: "/documents/everest-92000-rp2144.pdf",
      accessedOn: "2026-10-25",
      usedFor: {
        sq: "Klasat e dy mostrave 92 000, me dhe pa përforcim qendror (RP2145: /documents/everest-92000-rp2145.pdf).",
        en: "Classes of the two 92 000 samples, with and without central reinforcement (RP2145: /documents/everest-92000-rp2145.pdf).",
      },
    },
  ],
  content: {
    sq: {
      metaTitle: "Klasat e ajrit, ujit dhe erës te dritaret",
      metaDescription:
        "Si lexohen klasat EN 12207, EN 12208 dhe EN 12210: çfarë do të thotë klasa 4, E1500 ose C5 te dritaret dhe dyert, me tabelat dhe raportet e mostrave EVEREST.",
      title: "Klasat e ajrit, ujit dhe erës: si lexohen EN 12207, EN 12208 dhe EN 12210",
      lead: "“Klasa 4, E1500, C5” janë tri rezultate laboratorike të shkruara shkurt. Ja çfarë mat secila, si provohet dhe çfarë thonë raportet e mostrave EVEREST.",
      excerpt:
        "Çfarë do të thotë klasa 4, E1500 ose C5, si bëhen provat dhe si lexohen rezultatet e mostrave EVEREST.",
      body: [
        { type: "h2", id: "tri-prova", text: "Tri prova, një mostër" },
        {
          type: "p",
          text: [
            "Dritaret dhe dyert e jashtme për këmbësorë vlerësohen sipas standardit të produktit EN 14351-1. Për sjelljen ndaj motit bëhen tri prova në laborator, secila me metodën e vet dhe me standardin e vet të klasifikimit:",
          ],
        },
        {
          type: "table",
          caption: "Provat dhe standardet",
          head: ["Vetia", "Metoda e provës", "Klasifikimi", "Shembull klase"],
          rows: [
            ["Përshkueshmëria e ajrit", "EN 1026", "EN 12207", "4"],
            ["Papërshkueshmëria nga uji", "EN 1027", "EN 12208", "E1500"],
            ["Rezistenca ndaj ngarkesës së erës", "EN 12211", "EN 12210", "C5"],
          ],
        },
        {
          type: "p",
          text: [
            "Provat bëhen mbi një mostër konkrete: një tip hapjeje, një përmasë e deklaruar dhe një xham i caktuar. Raportet IRCCOS e shkruajnë qartë se rezultatet u përkasin vetëm mostrave të provuara dhe se raporti nuk është certifikatë përputhshmërie e produktit.",
          ],
        },

        { type: "h2", id: "ajri", text: "Përshkueshmëria e ajrit (EN 12207)" },
        {
          type: "p",
          text: [
            "Mostra mbyllet dhe matet sa ajër kalon nëpër të në presione gjithnjë e më të larta, deri në 600 Pa. Prova bëhet me presion pozitiv dhe negativ, dhe rezultati është mesatarja e të dyjave. Rrjedha e ajrit krahasohet me sipërfaqen e mostrës (m³/(h·m²)) dhe me gjatësinë e fugës së hapjes (m³/(h·m)).",
          ],
        },
        {
          type: "table",
          caption: "Klasat e përshkueshmërisë së ajrit sipas EN 12207",
          head: [
            "Klasa",
            "Presioni maksimal i provës",
            "Kufiri në 100 Pa, për sipërfaqe",
            "Kufiri në 100 Pa, për fugë",
          ],
          rows: [
            ["1", "150 Pa", "50 m³/(h·m²)", "12,50 m³/(h·m)"],
            ["2", "300 Pa", "27 m³/(h·m²)", "6,75 m³/(h·m)"],
            ["3", "600 Pa", "9 m³/(h·m²)", "2,25 m³/(h·m)"],
            ["4", "600 Pa", "3 m³/(h·m²)", "0,75 m³/(h·m)"],
          ],
        },
        {
          type: "p",
          text: [
            "Klasa 4 është më e mira: në 100 Pa mostra lejon më së shumti 3 m³ ajër në orë për metër katror, dhe kufiri respektohet në çdo hap presioni deri në 600 Pa. Nëse rezultati sipas sipërfaqes dhe ai sipas fugës bien në klasa fqinje, merret klasa më e favorshme; nëse ndryshojnë për dy klasa, merret klasa e mesit; për më shumë, mostra nuk klasifikohet.",
          ],
        },

        { type: "h2", id: "uji", text: "Papërshkueshmëria nga uji (EN 12208)" },
        {
          type: "p",
          text: [
            "Në raportin RP2147, uji spërkatet në mënyrë të njëtrajtshme mbi faqen e jashtme të mostrës: fillimisht 15 minuta pa presion, pastaj me hapa 5-minutësh, 50 Pa më shumë deri në 300 Pa dhe 150 Pa më shumë pas kësaj, derisa uji të depërtojë. Klasa është presioni i fundit pa depërtim.",
          ],
        },
        {
          type: "table",
          caption: "Klasat e papërshkueshmërisë nga uji sipas EN 12208",
          head: ["Presioni i provës", "Metoda A", "Metoda B", "Kohëzgjatja"],
          rows: [
            ["0 Pa", "1A", "1B", "spërkatje 15 min"],
            ["50 Pa", "2A", "2B", "si klasa 1 + 5 min"],
            ["100 Pa", "3A", "3B", "si klasa 2 + 5 min"],
            ["150 Pa", "4A", "4B", "si klasa 3 + 5 min"],
            ["200 Pa", "5A", "5B", "si klasa 4 + 5 min"],
            ["250 Pa", "6A", "6B", "si klasa 5 + 5 min"],
            ["300 Pa", "7A", "7B", "si klasa 6 + 5 min"],
            ["450 Pa", "8A", "–", "si klasa 7 + 5 min"],
            ["600 Pa", "9A", "–", "si klasa 8 + 5 min"],
            ["mbi 600 Pa", "Exxx", "–", "hapa 150 Pa, 5 min secili"],
          ],
        },
        {
          type: "p",
          text: [
            "Metoda A është për produkte plotësisht të ekspozuara ndaj motit, metoda B për produkte pjesërisht të mbrojtura. Mbi 600 Pa klasa shkruhet me shkronjën E dhe presionin: E1500 do të thotë që mostra nuk ka lejuar depërtim uji deri në 1 500 Pa.",
          ],
        },

        { type: "h2", id: "era", text: "Rezistenca ndaj ngarkesës së erës (EN 12210)" },
        {
          type: "p",
          text: ["Prova e erës ka tri faza, me presione të lidhura me njëri-tjetrin:"],
        },
        {
          type: "ul",
          items: [
            [
              "Deformimi në P1: mostra ngarkohet me presion pozitiv dhe negativ dhe matet sa përkulet elementi më i deformuar.",
            ],
            [
              "Presioni i përsëritur në P2 = 0,5 × P1: 50 cikle pozitive dhe negative, pastaj përsëritet prova e ajrit.",
            ],
            [
              "Siguria në P3 = 1,5 × P1: një shtytje negative dhe një pozitive; mostra duhet të mbetet e mbyllur, pa shkëputje.",
            ],
          ],
        },
        {
          type: "table",
          caption: "Klasat e ngarkesës së erës sipas EN 12210",
          head: ["Klasa", "P1", "P2", "P3"],
          rows: [
            ["1", "400 Pa", "200 Pa", "600 Pa"],
            ["2", "800 Pa", "400 Pa", "1 200 Pa"],
            ["3", "1 200 Pa", "600 Pa", "1 800 Pa"],
            ["4", "1 600 Pa", "800 Pa", "2 400 Pa"],
            ["5", "2 000 Pa", "1 000 Pa", "3 000 Pa"],
          ],
        },
        {
          type: "p",
          text: [
            "Shkronja para numrit tregon përkuljen frontale relative në P1: A deri në 1/150 të gjatësisë së elementit, B deri në 1/200 dhe C deri në 1/300. C5 është pra presioni më i lartë i klasave numerike (2 000 Pa) me përkuljen më të vogël. Për klasifikim, pas fazave P1 dhe P2 nuk duhet të shihen defekte, dritarja duhet të funksionojë dhe përshkueshmëria e ajrit nuk duhet të rritet më shumë se 20% e kufirit të klasës së marrë më parë.",
          ],
        },

        { type: "h2", id: "mostrat-everest", text: "Rezultatet e mostrave EVEREST" },
        {
          type: "p",
          text: [
            "Këto janë rezultatet e raporteve IRCCOS të publikuara te ",
            { text: "dokumentet teknike", to: { page: "documents" } },
            ". Secili rresht vlen vetëm për mostrën e përshkruar.",
          ],
        },
        {
          type: "table",
          caption: "Klasat e mostrave të provuara",
          head: ["Raporti", "Seria", "Mostra", "Ajri", "Uji", "Era"],
          rows: [
            [
              "RP2147",
              "Alumin 70 000",
              "Dritare me dy kanata, anësore-rrotulluese, 1 447 × 1 650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2146",
              "Alumin 71 000",
              "I njëjti tip dritareje, 1 447 × 1 650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2176",
              "PVC 85 000",
              "Dritare me dy kanata, anësore-rrotulluese, 1 447 × 1 650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2157",
              "Alumin 91 000",
              "Derë rrëshqitëse me dy kanata, 2 000 × 2 400 mm",
              "4",
              "8A",
              "B3",
            ],
            [
              "RP2144",
              "Alumin 92 000",
              "Derë ngrit-dhe-rrëshqit, me përforcim qendror, 2 570 × 2 450 mm",
              "4",
              "8A",
              "C4",
            ],
            ["RP2145", "Alumin 92 000", "E njëjta derë, pa përforcim qendror", "4", "8A", "B4"],
          ],
        },
        {
          type: "p",
          text: [
            "Dy raportet e serisë 92 000 tregojnë pse konfigurimi ka rëndësi. E njëjta derë, me të njëjtat përmasa të deklaruara, merr klasën C4 me përforcim qendror dhe B4 pa të. Presioni i provës është i njëjti (1 600 Pa), por pa përforcim përkulja e matur e kalon kufirin 1/300 të klasës C dhe mbetet brenda kufirit 1/200 të klasës B. Prandaj klasat nuk barten automatikisht nga një konfigurim te tjetri.",
          ],
        },

        { type: "h2", id: "ne-projekt", text: "Si t'i përdorni klasat në projekt" },
        {
          type: "ul",
          items: [
            [
              "Krahasoni klasa të mostrave të ngjashme me dritaren tuaj: i njëjti tip hapjeje, përmasa të afërta, xham i ngjashëm.",
            ],
            [
              "Lexoni raportin e plotë: data, laboratori, përmasa dhe xhami janë po aq të rëndësishme sa klasa.",
            ],
            [
              "Klasat e kërkuara për një ndërtesë i përcakton projektuesi sipas ekspozimit të fasadës dhe rregullave në fuqi.",
            ],
            [
              "Klasa e ajrit plotëson vlerën termike: ",
              { text: "vlera U", to: { page: "article", article: "u-values" } },
              " nuk përfshin humbjet nga rrjedhja e ajrit.",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE është distributor i produkteve EVEREST në Kosovë. Seritë 70 000 dhe 71 000 i gjeni te ",
            { text: "sistemet EVEREST", to: { page: "system", system: "s70000" } },
            ", raportet e plota te ",
            { text: "dokumentet teknike", to: { page: "documents" } },
            ". Për një projekt konkret, ",
            { text: "na kontaktoni", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
    en: {
      metaTitle: "Window air, water and wind classes explained",
      metaDescription:
        "How to read EN 12207, EN 12208 and EN 12210: what class 4, E1500 or C5 means for windows and doors, with the class tables and EVEREST sample test reports.",
      title: "Air, water and wind classes: reading EN 12207, EN 12208 and EN 12210",
      lead: "“Class 4, E1500, C5” are three laboratory results in shorthand. Here is what each one measures, how it is tested and what the EVEREST sample reports say.",
      excerpt:
        "What class 4, E1500 or C5 means, how the tests are run and how to read the EVEREST sample results.",
      body: [
        { type: "h2", id: "three-tests", text: "Three tests, one sample" },
        {
          type: "p",
          text: [
            "Windows and external pedestrian doors are assessed under the product standard EN 14351-1. Weather performance comes from three laboratory tests, each with its own test method and its own classification standard:",
          ],
        },
        {
          type: "table",
          caption: "Tests and standards",
          head: ["Property", "Test method", "Classification", "Example class"],
          rows: [
            ["Air permeability", "EN 1026", "EN 12207", "4"],
            ["Watertightness", "EN 1027", "EN 12208", "E1500"],
            ["Resistance to wind load", "EN 12211", "EN 12210", "C5"],
          ],
        },
        {
          type: "p",
          text: [
            "The tests are run on one specific sample: one opening type, one declared size and one glazing build-up. The IRCCOS reports state that the results relate only to the tested samples and that the report is not a certificate of product conformity.",
          ],
        },

        { type: "h2", id: "air", text: "Air permeability (EN 12207)" },
        {
          type: "p",
          text: [
            "The sample is closed and the air passing through it is measured at rising pressures, up to 600 Pa. The test is run under positive and negative pressure, and the result is the average of the two. The air flow is related to the sample's overall area (m³/(h·m²)) and to the length of the opening joint (m³/(h·m)).",
          ],
        },
        {
          type: "table",
          caption: "Air permeability classes to EN 12207",
          head: [
            "Class",
            "Maximum test pressure",
            "Limit at 100 Pa, by area",
            "Limit at 100 Pa, by joint",
          ],
          rows: [
            ["1", "150 Pa", "50 m³/(h·m²)", "12.50 m³/(h·m)"],
            ["2", "300 Pa", "27 m³/(h·m²)", "6.75 m³/(h·m)"],
            ["3", "600 Pa", "9 m³/(h·m²)", "2.25 m³/(h·m)"],
            ["4", "600 Pa", "3 m³/(h·m²)", "0.75 m³/(h·m)"],
          ],
        },
        {
          type: "p",
          text: [
            "Class 4 is the best: at 100 Pa the sample lets through at most 3 m³ of air per hour per square metre, and the limit holds at every pressure step up to 600 Pa. If the area-based and joint-based results fall in neighbouring classes, the more favourable class is given; if they are two classes apart, the middle class; if further apart, the sample is not classified.",
          ],
        },

        { type: "h2", id: "water", text: "Watertightness (EN 12208)" },
        {
          type: "p",
          text: [
            "In report RP2147, water is sprayed evenly over the outer face of the sample: first for 15 minutes with no pressure, then in 5-minute steps, rising by 50 Pa up to 300 Pa and by 150 Pa after that, until water gets through. The class is the last pressure held without leakage.",
          ],
        },
        {
          type: "table",
          caption: "Watertightness classes to EN 12208",
          head: ["Test pressure", "Method A", "Method B", "Duration"],
          rows: [
            ["0 Pa", "1A", "1B", "spraying 15 min"],
            ["50 Pa", "2A", "2B", "as class 1 + 5 min"],
            ["100 Pa", "3A", "3B", "as class 2 + 5 min"],
            ["150 Pa", "4A", "4B", "as class 3 + 5 min"],
            ["200 Pa", "5A", "5B", "as class 4 + 5 min"],
            ["250 Pa", "6A", "6B", "as class 5 + 5 min"],
            ["300 Pa", "7A", "7B", "as class 6 + 5 min"],
            ["450 Pa", "8A", "–", "as class 7 + 5 min"],
            ["600 Pa", "9A", "–", "as class 8 + 5 min"],
            ["above 600 Pa", "Exxx", "–", "150 Pa steps, 5 min each"],
          ],
        },
        {
          type: "p",
          text: [
            "Method A is for products fully exposed to the weather, method B for partially protected products. Above 600 Pa the class is written as E plus the pressure: E1500 means the sample let no water through up to 1,500 Pa.",
          ],
        },

        { type: "h2", id: "wind", text: "Resistance to wind load (EN 12210)" },
        {
          type: "p",
          text: ["The wind test has three phases, with pressures linked to each other:"],
        },
        {
          type: "ul",
          items: [
            [
              "Deflection at P1: the sample is loaded with positive and negative pressure and the deflection of the most deformed member is measured.",
            ],
            [
              "Repeated pressure at P2 = 0.5 × P1: 50 positive and negative cycles, after which the air test is repeated.",
            ],
            [
              "Safety at P3 = 1.5 × P1: one negative and one positive gust; the sample must stay closed without coming apart.",
            ],
          ],
        },
        {
          type: "table",
          caption: "Wind load classes to EN 12210",
          head: ["Class", "P1", "P2", "P3"],
          rows: [
            ["1", "400 Pa", "200 Pa", "600 Pa"],
            ["2", "800 Pa", "400 Pa", "1,200 Pa"],
            ["3", "1,200 Pa", "600 Pa", "1,800 Pa"],
            ["4", "1,600 Pa", "800 Pa", "2,400 Pa"],
            ["5", "2,000 Pa", "1,000 Pa", "3,000 Pa"],
          ],
        },
        {
          type: "p",
          text: [
            "The letter before the number gives the relative frontal deflection at P1: A up to 1/150 of the member's length, B up to 1/200 and C up to 1/300. C5 is therefore the highest of the numbered pressure classes (2,000 Pa) with the smallest deflection. To be classified, the sample must show no visible defects after P1 and P2, must still work, and its air permeability must not rise by more than 20% of the limit of the class it was given earlier.",
          ],
        },

        { type: "h2", id: "everest-samples", text: "Results of EVEREST samples" },
        {
          type: "p",
          text: [
            "These are the results of the IRCCOS reports published in the ",
            { text: "technical documents", to: { page: "documents" } },
            ". Each row applies only to the sample described.",
          ],
        },
        {
          type: "table",
          caption: "Classes of the tested samples",
          head: ["Report", "Series", "Sample", "Air", "Water", "Wind"],
          rows: [
            [
              "RP2147",
              "Aluminium 70 000",
              "Double-casement tilt-and-turn window, 1,447 × 1,650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2146",
              "Aluminium 71 000",
              "Same window type, 1,447 × 1,650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2176",
              "PVC 85 000",
              "Double-casement tilt-and-turn window, 1,447 × 1,650 mm",
              "4",
              "E1500",
              "C5",
            ],
            [
              "RP2157",
              "Aluminium 91 000",
              "Double-casement sliding door, 2,000 × 2,400 mm",
              "4",
              "8A",
              "B3",
            ],
            [
              "RP2144",
              "Aluminium 92 000",
              "Lift-and-slide door with central reinforcement, 2,570 × 2,450 mm",
              "4",
              "8A",
              "C4",
            ],
            [
              "RP2145",
              "Aluminium 92 000",
              "Same door without central reinforcement",
              "4",
              "8A",
              "B4",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "The two 92 000 reports show why configuration matters. The same door, at the same declared size, is classed C4 with central reinforcement and B4 without it. The test pressure is the same (1,600 Pa), but without the reinforcement the measured deflection exceeds the 1/300 limit of class C and stays within the 1/200 limit of class B. Classes therefore do not carry over automatically from one configuration to another.",
          ],
        },

        { type: "h2", id: "in-a-project", text: "Using the classes in a project" },
        {
          type: "ul",
          items: [
            [
              "Compare classes of samples similar to your window: the same opening type, a similar size and similar glazing.",
            ],
            [
              "Read the full report: the date, laboratory, size and glazing matter as much as the class.",
            ],
            [
              "The classes a building needs are set by its designer, based on façade exposure and the rules in force.",
            ],
            [
              "The air class complements the thermal value: a ",
              { text: "U-value", to: { page: "article", article: "u-values" } },
              " does not include losses from air leakage.",
            ],
          ],
        },
        {
          type: "p",
          text: [
            "AL STORE is a distributor of EVEREST products in Kosovo. The 70 000 and 71 000 series are in ",
            { text: "EVEREST systems", to: { page: "system", system: "s70000" } },
            ", and the full reports are in the ",
            { text: "technical documents", to: { page: "documents" } },
            ". For a specific project, ",
            { text: "contact us", to: { page: "contact" } },
            ".",
          ],
        },
      ],
    },
  },
};
