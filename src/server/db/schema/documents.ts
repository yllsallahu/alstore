import { sql } from "drizzle-orm";
import { bigint, check, index, text, unique, uuid } from "drizzle-orm/pg-core";

import { app, createdAt, enumCheck, id, orgId, sha256Check } from "./_base";
import { users } from "./auth-audit";
import { DOCUMENT_FILE_STATUSES, DOCUMENT_ROLES } from "./enums";

export const documentFiles = app.table(
  "document_files",
  {
    id: id(),
    orgId: orgId(),
    storageBucket: text("storage_bucket").notNull(),
    objectPath: text("object_path").notNull(),
    sha256: text("sha256").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    status: text("status").notNull().default("QUARANTINE"),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("document_files_sha_uq").on(t.orgId, t.sha256),
    unique("document_files_object_uq").on(t.storageBucket, t.objectPath),
    sha256Check("document_files_sha_ck", t.sha256),
    check("document_files_size_ck", sql`${t.sizeBytes} > 0`),
    enumCheck("document_files_status_ck", t.status, DOCUMENT_FILE_STATUSES),
  ],
);

export const documentLinks = app.table(
  "document_links",
  {
    id: id(),
    orgId: orgId(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documentFiles.id),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    role: text("role").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    unique("document_links_uq").on(t.documentId, t.entityType, t.entityId, t.role),
    enumCheck("document_links_role_ck", t.role, DOCUMENT_ROLES),
    index("document_links_entity_idx").on(t.entityType, t.entityId),
  ],
);
