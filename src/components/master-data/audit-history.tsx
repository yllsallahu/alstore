import { formatInstant } from "@/lib/dates";

const ACTION_LABELS: Record<string, string> = {
  "product.create": "Produkti u krijua",
  "product.update": "Produkti u ndryshua",
  "product.unit_change.request": "U kërkua ndryshimi i njësisë",
  "product.unit_change.approve": "Ndryshimi i njësisë u miratua",
  "product.unit_change.reject": "Ndryshimi i njësisë u refuzua",
  "product.unit_change.cancel": "Kërkesa për njësinë u anulua",
  "customer.create": "Klienti u krijua",
  "customer.update": "Klienti u ndryshua",
  "customer.verify_manual": "Kontroll manual i identitetit",
  "customer.suspend": "Klienti u pezullua",
  "customer.reinstate": "Pezullimi u hoq",
  "supplier.create": "Furnitori u krijua",
  "supplier.update": "Furnitori u ndryshua",
  "import.upload": "Skedari u ngarkua (parashikim)",
  "import.remap": "Kolonat u ndryshuan",
  "import.approve": "Importi u miratua",
  "import.reject": "Importi u refuzua",
  "opening.batch.create": "U hap numërimi fillestar",
  "opening.line.save": "Rresht numërimi u ruajt",
  "opening.line.remove": "Rresht numërimi u hoq",
  "opening.counted": "Numërimi përfundoi",
  "opening.reopen": "Numërimi u hap përsëri",
  "opening.reconcile": "Rakordimi me Excel u regjistrua",
  "opening.post": "Gjendja fillestare u nënshkrua dhe u regjistrua",
  "cutover.plan.create": "Plani i kalimit u krijua",
  "cutover.plan.update": "Plani i kalimit u ndryshua",
  "invoice.series.propose": "Seria e faturave u propozua",
  "invoice.series.update": "Propozimi i serisë u ndryshua",
};

const ROLE_LABELS: Record<string, string> = { DIRECTOR: "Drejtori", ACCOUNTANT: "Kontabilisti" };

const FIELD_LABELS: Record<string, string> = {
  name: "emri",
  legalName: "emri ligjor",
  category: "kategoria",
  unit: "njësia",
  barcode: "barkodi",
  referencePurchasePrice: "çmimi referues",
  active: "statusi",
  identifiers: "numrat identifikues",
  address: "adresa",
  city: "qyteti",
  country: "shteti",
  invoiceReferenceNote: "referenca e faturave",
};

export interface HistoryItem {
  id: string;
  occurredAt: Date;
  action: string;
  actorRole: string | null;
  details: unknown;
}

export function AuditHistory({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) return <p className="text-ink-muted text-sm">Nuk ka ende histori.</p>;
  return (
    <ol className="divide-line divide-y">
      {items.map((item) => {
        const changed = (item.details as { changed?: string[] } | null)?.changed;
        return (
          <li key={item.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
            <time className="text-ink-muted shrink-0 text-sm tabular-nums sm:w-36">
              {formatInstant(item.occurredAt)}
            </time>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{ACTION_LABELS[item.action] ?? item.action}</p>
              <p className="text-ink-muted">
                {item.actorRole ? (ROLE_LABELS[item.actorRole] ?? item.actorRole) : "Sistemi"}
                {changed &&
                  changed.length > 0 &&
                  ` · ndryshuan: ${changed.map((f) => FIELD_LABELS[f] ?? f).join(", ")}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
