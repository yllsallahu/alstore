import { Alert } from "@/components/ui/alert";

const MESSAGES: Record<string, string> = {
  krijuar: "U ruajt.",
  ndryshuar: "Ndryshimet u ruajtën.",
  kerkese: "Kërkesa për ndryshimin e njësisë u regjistrua dhe pret miratimin e përdoruesit tjetër.",
  "vendim-approve": "Ndryshimi i njësisë u miratua dhe u zbatua.",
  "vendim-reject": "Kërkesa u refuzua.",
  "vendim-cancel": "Kërkesa u anulua.",
  verifikuar: "Kontrolli manual u regjistrua.",
  pezulluar: "Klienti u pezullua. Nuk mund të faturohet.",
  rikthyer: "Pezullimi u hoq. Klienti duhet të verifikohet përsëri.",
  rregull: "Rregulli u ruajt.",
  "rregull-hequr": "Rregulli u çaktivizua.",
  ngarkuar:
    "Skedari u lexua. Ky është vetëm një parashikim: asnjë produkt, numërim ose stok nuk është krijuar.",
  kolonat: "Kolonat u ruajtën dhe parashikimi u rifreskua.",
  refuzuar: "Importi u refuzua. Mbetet i regjistruar për auditim dhe nuk ka asnjë efekt.",
  rreshti: "Rreshti i numërimit u ruajt.",
  hequr: "Rreshti u hoq nga numërimi.",
  numeruar: "Numërimi u shënua si i përfunduar. Rreshtat tani janë të ngrira.",
  rihapur: "Numërimi u hap përsëri një hap prapa.",
  rakorduar: "Rakordimi me Excel-in u regjistrua. Pret nënshkrimin e drejtorit.",
  regjistruar:
    "Gjendja fillestare u nënshkrua dhe u regjistrua në stok në momentin e kalimit. Plani i kalimit u mbyll.",
  plani: "Plani i kalimit u ruajt.",
  seria: "Propozimi i serisë së faturave u ruajt. Asnjë faturë nuk është lëshuar.",
};

/** Shown after a redirect from a committed command (never before the commit). */
export function SavedNotice({ code }: { code: string | undefined }) {
  const approved = code ? /^miratuar-(\d+)$/.exec(code) : null;
  const message = approved
    ? `Importi u miratua: ${approved[1]} rreshta u zbatuan.`
    : code
      ? MESSAGES[code]
      : undefined;
  if (!message) return null;
  return (
    <Alert tone="success" role="status" className="mb-4">
      {message}
    </Alert>
  );
}
