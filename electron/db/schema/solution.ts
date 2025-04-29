import { count, sql, eq } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  sqliteView,
} from "drizzle-orm/sqlite-core";

export const docTypeEnum = ["PRD", "BRD"] as const;
export const  UserTypeEnum = ["user", "assistant"] as const;

export const commonColumns = {
  createdAt: text({ mode: "text" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: text({ mode: "text" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  isDeleted: integer({ mode: "boolean" }).default(false).notNull(),
};

export const metadata = sqliteTable("metadata", {
  id: integer().primaryKey(),
  name: text({ mode: "text" }).unique().notNull(),
  description: text({ mode: "text" }).notNull(),
  technicalDetails: text({ mode: "text" }).notNull(),
  isBrownfield: integer({ mode: "boolean" }).default(false),
  ...commonColumns,
});

export const integration = sqliteTable("integration", {
  id: integer().primaryKey(),
  config: text({ mode: "json" }),
  ...commonColumns,
});

export const documentType = sqliteTable("documentType", {
  id: text().primaryKey(),
  name: text({ mode: "text" }).notNull(),
  typeLabel: text({ mode: "text" }).notNull(),
  isActive: integer({ mode: "boolean" }).default(true),
  ...commonColumns,
});

export const document = sqliteTable("document", {
  id: integer().primaryKey(),
  name: text({ mode: "text" }).notNull(),
  description: text({ mode: "text" }).notNull(),
  jiraId: text({ mode: "text" }),
  documentTypeId: text().references(() => documentType.id),
  ...commonColumns,
});

export const documentLinks = sqliteTable("documentLinks", {
  id: integer().primaryKey(),
  sourceDocumentId: integer().references(() => document.id),
  targetDocumentId: integer().references(() => document.id),
  ...commonColumns,
});

export const documentCountByType = sqliteView("documentCountByType").as((qb) =>
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

export const conversation = sqliteTable("conversation", {
  id: integer().primaryKey(),
  documentId: integer()
    .notNull()
    .references(() => document.id),
  ...commonColumns,
});

export const message = sqliteTable("message", {
  id: integer().primaryKey(),
  conversationId: integer()
    .notNull()
    .references(() => conversation.id),
  message: text({ mode: "text" }).notNull(),
  userType: text({ enum: UserTypeEnum }).notNull(),
  isApplied: integer({ mode: "boolean" }).default(false),
  ...commonColumns,
});

export const businessProcess = sqliteTable("businessProcess", {
  id: integer().primaryKey(),
  name: text({ mode: "text" }).notNull(),
  description: text({ mode: "text" }).notNull(),
  flowchart: text({ mode: "text" }),
  documentTypeId: text().references(() => documentType.id),
  ...commonColumns,
});

export const businessProcessDocuments = sqliteTable(
  "businessProcessDocuments",
  {
    id: integer().primaryKey(),
    businessProcessId: integer()
      .notNull()
      .references(() => businessProcess.id),
    documentId: integer()
      .notNull()
      .references(() => document.id),
    docType: text({ enum: docTypeEnum }).notNull(),
  }
);

export const analyticsLookup = sqliteTable("analyticsLookup", {
  id: integer().primaryKey(),
  targetType: text({ mode: "text" }).notNull(),
  targetId: text({ mode: "text" }).notNull(),
  isLiked: integer({ mode: "boolean" }).default(false),
  ...commonColumns,
});

export const auditTracker = sqliteTable("auditTracker", {
  id: integer().primaryKey(),
  auditType: text({ mode: "text" }),
  docId: integer().references(() => document.id),
  description: text({ mode: "text" }),
  context: text({ mode: "json" }),
  createdBy: text({ mode: "text" }),
  ...commonColumns,
});
