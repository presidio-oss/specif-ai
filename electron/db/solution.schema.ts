import { count, sql, eq } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  sqliteView,
} from "drizzle-orm/sqlite-core";

export const docTypeEnum = ["PRD", "BRD"] as const;
export type DocType = (typeof docTypeEnum)[number];

export const commonColumns = {
  createdAt: text("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
};

export const metadata = sqliteTable("Metadata", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  technicalDetails: text("technical_details").notNull(),
  isBrownfield: integer("is_brownfield", { mode: "boolean" }).default(false),
  version: text("version").notNull(),
  ...commonColumns,
});

export const integration = sqliteTable("Integration", {
  id: integer("id").primaryKey(),
  config: text("config"),
  ...commonColumns,
});

export const documentType = sqliteTable("DocumentType", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  typeLabel: text("type_label").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  ...commonColumns,
});

export const document = sqliteTable("Document", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  jiraId: text("jira_id"),
  documentTypeId: text("document_type_id")
    .references(() => documentType.id, { onDelete: "set null" })
    .notNull(),
  ...commonColumns,
});

export const documentCountByType = sqliteView("DocumentCountByType").as((qb) =>
  qb
    .select({
      documentTypeId: documentType.id,
      typeName: documentType.name,
      typeLabel: documentType.typeLabel,
      count: count(document.id).as("count"),
    })
    .from(documentType)
    .leftJoin(document, eq(document.documentTypeId, documentType.id))
    .groupBy(documentType.id)
);

export const conversation = sqliteTable("Conversation", {
  id: integer("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => document.id, { onDelete: "cascade" }),
  title: text("title"),
  ...commonColumns,
});

export const message = sqliteTable("Message", {
  id: integer("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  role: text("role").notNull(),
  isApplied: integer("is_applied", { mode: "boolean" }).default(false),
  ...commonColumns,
});

export const businessProcess = sqliteTable("BusinessProcess", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  flowchart: text("flowchart"),
  ...commonColumns,
});

export const businessProcessDocuments = sqliteTable(
  "BusinessProcessDocuments",
  {
    businessProcessId: integer("business_process_id")
      .notNull()
      .references(() => businessProcess.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    docType: text("doc_type", { enum: docTypeEnum }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.businessProcessId, t.documentId, t.docType] }),
  ]
);

export const analyticsLookup = sqliteTable("AnalyticsLookup", {
  id: integer("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  isLiked: integer("is_liked", { mode: "boolean" }).default(false),
  ...commonColumns,
});