import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
} from "drizzle-orm/sqlite-core";

export const metadata = sqliteTable("Metadata", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  techStacks: text("tech_stacks"),
  isBrownfield: integer("is_brownfield", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const integration = sqliteTable("Integration", {
  id: integer("id").primaryKey(),
  config: text("config"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const documentType = sqliteTable("DocumentType", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  typeLabel: text("type_label"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const document = sqliteTable("Document", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  jiraId: text("jira_id"),
  documentTypeId: text("document_type_id")
    .notNull()
    .references(() => documentType.id, { onDelete: "set null" }),
  metadataId: integer("metadata_id")
    .notNull()
    .references(() => metadata.id, { onDelete: "cascade" }),
  count: integer("count").default(0),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const conversation = sqliteTable("Conversation", {
  id: integer("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => document.id, { onDelete: "cascade" }),
  title: text("title"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const message = sqliteTable("Message", {
  id: integer("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  isApplied: integer("is_applied", { mode: "boolean" }).default(false),
  externalMessageId: text("external_message_id"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const businessFlow = sqliteTable("BusinessFlow", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  flowchart: text("flowchart"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});

export const businessFlowDocuments = sqliteTable(
  "BusinessFlow_Documents",
  {
    businessFlowId: integer("business_flow_id")
      .notNull()
      .references(() => businessFlow.id, { onDelete: "cascade" }),
    documentId: integer("document_id")
      .notNull()
      .references(() => document.id, { onDelete: "cascade" }),
    docType: text("doc_type", { enum: ["PRD", "BRD"] }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.businessFlowId, t.documentId, t.docType] })]
);

export const analyticsLookup = sqliteTable("AnalyticsLookup", {
  id: integer("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  isLiked: integer("is_liked", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").default("CURRENT_TIMESTAMP"),
});
