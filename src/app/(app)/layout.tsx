import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { getServerEnv } from "@/lib/env";
import { getRequestContext } from "@/server/auth/session";
import { getShellAccess } from "@/server/auth/shell-access";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

import { runInTransaction } from "@/server/db/client";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const access = getShellAccess(getServerEnv());
  if (!access.allowed) redirect("/hyrje");

  const ctx = await getRequestContext();
  let previewUser = null;
  if (ctx.kind === "ready" && ctx.preview) {
    const [row] = await runInTransaction(ctx.db, { orgId: ctx.actor.orgId }, (tx) =>
      tx
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, ctx.actor.userId)),
    );
    previewUser = { role: ctx.actor.role, displayName: row?.displayName ?? "" };
  }

  return (
    <AppShell preview={access.mode === "preview"} previewUser={previewUser}>
      {children}
    </AppShell>
  );
}
