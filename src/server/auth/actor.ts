import { and, eq, sql } from "drizzle-orm";

import type { Db, Tx } from "@/server/db/client";
import { userRoles, users } from "@/server/db/schema";
import { ROLES } from "@/server/db/schema/enums";

import { AuthorizationError, type Actor, type Role } from "./permissions";

const isRole = (value: string): value is Role => (ROLES as readonly string[]).includes(value);

/**
 * Builds the actor for a server-verified session user. Role and status always come from
 * `app.user_roles` / `app.users`, never from JWT claims or user_metadata.
 */
export async function loadActor(
  db: Db,
  userId: string,
  session: { mfaVerified: boolean },
): Promise<Actor> {
  const rows = await db.execute<{ org_id: string; role: string; status: string }>(
    sql`select org_id, role, status from app.resolve_actor(${userId}::uuid)`,
  );
  const row = rows[0];
  if (!row || row.status !== "ACTIVE" || !isRole(row.role)) {
    throw new AuthorizationError("ACCOUNT_INACTIVE", "session");
  }
  return { userId, orgId: row.org_id, role: row.role, mfaVerified: session.mfaVerified };
}

/**
 * Re-validates the actor inside the business transaction (DTB §2.5) and holds a share lock so
 * a concurrent disable cannot interleave with the command.
 */
export async function assertActorActive(tx: Tx, actor: Actor): Promise<void> {
  const [row] = await tx
    .select({ status: users.status, role: userRoles.role })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .where(and(eq(users.id, actor.userId), eq(users.orgId, actor.orgId)))
    .for("share");
  if (!row || row.status !== "ACTIVE" || row.role !== actor.role) {
    throw new AuthorizationError("ACCOUNT_INACTIVE", "session");
  }
}
