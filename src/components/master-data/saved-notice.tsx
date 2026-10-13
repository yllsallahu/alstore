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
};

/** Shown after a redirect from a committed command (never before the commit). */
export function SavedNotice({ code }: { code: string | undefined }) {
  const message = code ? MESSAGES[code] : undefined;
  if (!message) return null;
  return (
    <Alert tone="success" role="status" className="mb-4">
      {message}
    </Alert>
  );
}
