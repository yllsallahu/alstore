import { Suspense } from "react";

import { PreviewRoleSwitch } from "./preview-role-switch";

export interface PreviewUser {
  role: "DIRECTOR" | "ACCOUNTANT";
  displayName: string;
}

const ROLE_LABELS = { DIRECTOR: "Drejtori", ACCOUNTANT: "Kontabilisti" } as const;

/**
 * Development preview notice. With a local database it names the synthetic user acting and
 * lets the developer switch role (four-eyes and accountant-only screens); never in staging or
 * production (env validation).
 */
export function PreviewBanner({ user }: { user: PreviewUser | null }) {
  return (
    <div
      role="note"
      className="border-warn/30 bg-warn-soft text-warn flex flex-col gap-2 border-b px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8"
    >
      {user ? (
        <>
          <p>
            Pamje paraprake për zhvillim: përdorues sintetik në bazën lokale, pa të dhëna reale.
            Vepron si <strong>{ROLE_LABELS[user.role]}</strong> ({user.displayName}).
          </p>
          <Suspense>
            <PreviewRoleSwitch
              to={user.role === "DIRECTOR" ? "ACCOUNTANT" : "DIRECTOR"}
              label={`Kalo te ${user.role === "DIRECTOR" ? "Kontabilisti" : "Drejtori"}`}
            />
          </Suspense>
        </>
      ) : (
        <p>Pamje paraprake për zhvillim: pa llogari, pa të dhëna reale. Asnjë veprim nuk ruhet.</p>
      )}
    </div>
  );
}
