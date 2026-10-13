"use client";

import { Button } from "@/components/ui/button";

export function ErrorPanel({ digest, onRetry }: { digest?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="border-line bg-surface mx-auto max-w-lg rounded-lg border p-6">
      <h1 className="text-xl font-semibold">Diçka shkoi keq</h1>
      <p className="text-ink-muted mt-2 text-sm">
        Faqja nuk mund të hapej për shkak të një gabimi të papritur. Provoni përsëri. Nëse gabimi
        vazhdon, njoftoni administratorin.
      </p>
      {digest && (
        <p className="text-ink-muted mt-3 text-xs">
          Kodi i gabimit: <code>{digest}</code>
        </p>
      )}
      <Button className="mt-5" onClick={onRetry}>
        Provo përsëri
      </Button>
    </div>
  );
}
