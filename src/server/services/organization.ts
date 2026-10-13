import { randomUUID } from "node:crypto";

import { z } from "zod";

import { writeAudit } from "@/server/audit/audit";
import { runInTransaction, type Db } from "@/server/db/client";
import { orgSettings, organizations, userRoles, users } from "@/server/db/schema";

export const bootstrapInputSchema = z.object({
  legalName: z.string().trim().min(1).max(200),
  director: z.object({
    /** Supabase `auth.users.id` of the owner's personal account. */
    userId: z.uuid(),
    displayName: z.string().trim().min(1).max(120),
  }),
});

export type BootstrapInput = z.infer<typeof bootstrapInputSchema>;

/**
 * Documented server-side system operation (ROLE_PERMISSION_MATRIX P-01 note): creates the
 * organization, its settings and the first DIRECTOR. Never reachable from UI signup.
 */
export async function bootstrapOrganization(db: Db, rawInput: BootstrapInput) {
  const input = bootstrapInputSchema.parse(rawInput);
  const orgId = randomUUID();
  await runInTransaction(db, { orgId }, async (tx) => {
    await tx.insert(organizations).values({ id: orgId, legalName: input.legalName });
    await tx.insert(orgSettings).values({ orgId });
    await tx.insert(users).values({
      id: input.director.userId,
      orgId,
      displayName: input.director.displayName,
      status: "ACTIVE",
    });
    await tx.insert(userRoles).values({ userId: input.director.userId, orgId, role: "DIRECTOR" });
    await writeAudit(tx, {
      orgId,
      actor: null,
      action: "organization.bootstrap",
      entityType: "organization",
      entityId: orgId,
      details: { directorUserId: input.director.userId },
    });
  });
  return { orgId };
}
