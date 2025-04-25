import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { 
    metadata, 
    document,
    documentType,
    businessProcess,
    businessProcessDocuments,
    conversation,
    message,
} from '../schema/solution';

// Table: Metadata
// Below would contain the zod schema and its infered type

export const metadataSelectSchema = createSelectSchema(metadata);
export const metadataInsertSchema = createInsertSchema(metadata);

export type IMetadata = z.infer<typeof metadataSelectSchema>;
export type ICreateMetadata = z.infer<typeof metadataInsertSchema>;

// Table: Document
// Below would contain the zod schema and its infered type

export const documentSelectSchema = createSelectSchema(document);
export const documentInsertSchema = createInsertSchema(document);
export const documentUpdateSchema = createUpdateSchema(document);

export type IDocument = z.infer<typeof documentSelectSchema>;
export type ICreateDocument = z.infer<typeof documentInsertSchema>;
export type IUpdateDocument = z.infer<typeof documentUpdateSchema>;

// Table: Document Type
// Below would contain the zod schema and its infered type

export const documentTypeSelectSchema = createSelectSchema(documentType);
export const documentTypeInsertSchema = createInsertSchema(documentType);

export type IDocumentType = z.infer<typeof documentTypeSelectSchema>;
export type ICreateDocumentType = z.infer<typeof documentTypeInsertSchema>;

// Table: Business Process
// Below would contain the zod schema and its infered type
export const businessProcessSelectSchema = createSelectSchema(businessProcess);
export const businessProcessInsertSchema = createInsertSchema(businessProcess);
export const businessProcessUpdateSchema = createUpdateSchema(businessProcess);

export type IBusinessProcess = z.infer<typeof businessProcessSelectSchema>;
export type ICreateBusinessProcess = z.infer<typeof businessProcessInsertSchema>;
export type IUpdateBusinessProcess = z.infer<typeof businessProcessUpdateSchema>;

// Table : BusinessProcessDocuments
// Below would contain the zod schema and its infered type
export const businessProcessDocumentsSelectSchema = createSelectSchema(businessProcessDocuments);
export const businessProcessDocumentsInsertSchema = createInsertSchema(businessProcessDocuments);
export const businessProcessDocumentsUpdateSchema = createUpdateSchema(businessProcessDocuments);

export type IBusinessProcessDocuments = z.infer<typeof businessProcessDocumentsSelectSchema>;
export type ICreateBusinessProcessDocuments = z.infer<typeof businessProcessDocumentsInsertSchema>;
export type IUpdateBusinessProcessDocuments = z.infer<typeof businessProcessDocumentsUpdateSchema>;


// Table: Conversion
// Below would contain the zod schema and its infered type
export const conversionSelectSchema = createSelectSchema(conversation);
export const conversionInsertSchema = createInsertSchema(conversation);
export const conversionUpdateSchema = createUpdateSchema(conversation);

export type IConversation = z.infer<typeof conversionSelectSchema>;
export type ICreateConversation = z.infer<typeof conversionInsertSchema>;
export type IUpdateConversation = z.infer<typeof conversionUpdateSchema>;

// Table: Message
// Below would contain the zod schema and its infered type
export const messageSelectSchema = createSelectSchema(message);
export const messageInsertSchema = createInsertSchema(message);
export const messageUpdateSchema = createUpdateSchema(message);

export type IMessage = z.infer<typeof messageSelectSchema>;
export type ICreateMessage = z.infer<typeof messageInsertSchema>;
export type IUpdateMessage = z.infer<typeof messageUpdateSchema>;
