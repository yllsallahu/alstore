import { sql } from "drizzle-orm";
import { boolean, check, index, jsonb, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";

import { app, createdAt, enumCheck, id, instant, orgId, stampedAt } from "./_base";
import {
  APPROVAL_DECISIONS,
  IDEMPOTENCY_STATUSES,
  ROLES,
  SETTLEMENT_TARGET_TYPES,
  USER_STATUSES,
} from "./enums";

/** `id` equals the Supabase `auth.users.id`; the FK to `auth.users` is added only on Supabase (PHASE_02 §2). */
export const users = app.table(
  "users",
  {
    id: uuid("id").primaryKey(),
    orgId: orgId(),
    displayName: text("display_name").notNull(),
    status: text("status").notNull().default("INVITED"),
    createdAt: createdAt(),
    disabledAt: instant("disabled_at"),
  },
  (t) => [
    enumCheck("users_status_ck", t.status, USER_STATUSES),
    check("users_disabled_at_ck", sql`(${t.status} = 'DISABLED') = (${t.disabledAt} is not null)`),
  ],
);

/** Exactly one role per user (PK on user_id). Authorization reads this table, never user_metadata. */
export const userRoles = app.table(
  "user_roles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    orgId: orgId(),
    role: text("role").notNull(),
    grantedBy: uuid("granted_by").references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [enumCheck("user_roles_role_ck", t.role, ROLES)],
);

export const approvals = app.table(
  "approvals",
  {
    id: id(),
    orgId: orgId(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    approvalKind: text("approval_kind").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    actorRole: text("actor_role").notNull(),
    requesterId: uuid("requester_id").references(() => users.id),
    requiresFourEyes: boolean("requires_four_eyes").notNull().default(false),
    decision: text("decision").notNull(),
    comment: text("comment"),
    subjectHash: text("subject_hash"),
    decidedAt: instant("decided_at").notNull().defaultNow(),
  },
  (t) => [
    enumCheck("approvals_decision_ck", t.decision, APPROVAL_DECISIONS),
    enumCheck("approvals_actor_role_ck", t.actorRole, ROLES),
    check(
      "approvals_four_eyes_ck",
      sql`not ${t.requiresFourEyes} or (${t.requesterId} is not null and ${t.requesterId} <> ${t.actorId})`,
    ),
    index("approvals_subject_idx").on(t.subjectType, t.subjectId),
  ],
);

export const auditEvents = app.table(
  "audit_events",
  {
    id: id(),
    orgId: orgId(),
    occurredAt: stampedAt("occurred_at"),
    actorId: uuid("actor_id").references(() => users.id),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    requestId: text("request_id"),
    idempotencyKey: text("idempotency_key"),
    beforeHash: text("before_hash"),
    afterHash: text("after_hash"),
    safeDetails: jsonb("safe_details").notNull().default({}),
  },
  (t) => [
    check(
      "audit_events_actor_role_ck",
      sql`${t.actorRole} is null or ${t.actorRole} in ('DIRECTOR', 'ACCOUNTANT')`,
    ),
    index("audit_events_entity_idx").on(t.entityType, t.entityId),
    index("audit_events_occurred_idx").on(t.occurredAt),
  ],
);

export const idempotencyKeys = app.table(
  "idempotency_keys",
  {
    id: id(),
    orgId: orgId(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    key: text("key").notNull(),
    operation: text("operation").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull().default("IN_PROGRESS"),
    resultType: text("result_type"),
    resultId: uuid("result_id"),
    createdAt: createdAt(),
    completedAt: instant("completed_at"),
  },
  (t) => [
    unique("idempotency_keys_scope_uq").on(t.orgId, t.actorId, t.key),
    enumCheck("idempotency_keys_status_ck", t.status, IDEMPOTENCY_STATUSES),
    check(
      "idempotency_keys_completed_ck",
      sql`(${t.status} = 'COMPLETED') = (${t.completedAt} is not null)`,
    ),
  ],
);

/** One mutable lock row per settlement target (DATABASE_TRANSACTION_BOUNDARIES §4 level 7). */
export const settlementTargets = app.table(
  "settlement_targets",
  {
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    orgId: orgId(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.targetType, t.targetId] }),
    enumCheck("settlement_targets_type_ck", t.targetType, SETTLEMENT_TARGET_TYPES),
  ],
);
