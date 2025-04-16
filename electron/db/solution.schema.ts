import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const docTypeEnum = ["PRD", "BRD"] as const;
export type DocType = (typeof docTypeEnum)[number];

export const commonColumns = {
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
};

export const metadata = sqliteTable("Metadata", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  technicalDetails: text("technical_details"),
  isBrownfield: integer("is_brownfield", { mode: "boolean" }).default(false),
  version: text("version"),
  ...commonColumns,
});

export const integration = sqliteTable("Integration", {
  id: integer("id").primaryKey(),
  config: text("config", { mode: "json" }),
  ...commonColumns,
});

export const documentType = sqliteTable("DocumentType", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  typeLabel: text("type_label"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  ...commonColumns,
});

export const document = sqliteTable("Document", {
  id: integer("id").primaryKey(),
  documentNumber: integer("document_number").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  jiraId: text("jira_id"),
  documentTypeId: text("document_type_id")
    .notNull()
    .references(() => documentType.id, { onDelete: "set null" }),
  count: integer("count").default(0),
  ...commonColumns,
});

export const documentLinks = sqliteTable("DocumentLinks", {
  documentLinkId: integer("document_link_id").primaryKey(),
  sourceDocumentId: integer("source_document_id").references(
    () => document.id,
    { onDelete: "set null" }
  ),
  targetDocumentId: integer("target_document_id").references(
    () => document.id,
    { onDelete: "set null" }
  ),
  sourceDocumentType: text("source_document_type").notNull(),
  targetDocumentType: text("target_document_type").notNull(),
  createdBy: text("created_by"),
  createdAt: text("created_at"),
  isDeleted: integer("is_deleted", { mode: "boolean" }).default(false),
});

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
  userType: text("user_type").notNull(),
  isApplied: integer("is_applied", { mode: "boolean" }).default(false),
  ...commonColumns,
});

export const businessProcess = sqliteTable("BusinessProcess", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  flowchart: text("flowchart"),
  ...commonColumns,
});

export const businessProcessDocuments = sqliteTable(
  "BusinessProcessDocuments",
  {
    id: integer("id").primaryKey(),
    businessProcessId: integer("business_process_id")
      .notNull()
      .references(() => businessProcess.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    docType: text("doc_type", { enum: docTypeEnum }).notNull(),
  }
);

export const analyticsLookup = sqliteTable("AnalyticsLookup", {
  id: integer("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  isLiked: integer("is_liked", { mode: "boolean" }).default(false),
  ...commonColumns,
});

export const auditTracker = sqliteTable("AuditTracker", {
  id: integer("id").primaryKey(),
  auditType: text("audit_type"),
  docId: integer("doc_id").references(() => document.id),
  description: text("description"),
  context: text("context", { mode: "json" }),
  createdBy: text("created_by"),
  createdAt: text("created_at"),
});
