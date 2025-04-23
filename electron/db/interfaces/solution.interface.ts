import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { 
    metadata, 
    document,
    documentType,
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

export type IDocument = z.infer<typeof documentSelectSchema>;
export type ICreateDocument = z.infer<typeof documentInsertSchema>;

// Table: Document Type
// Below would contain the zod schema and its infered type

export const documentTypeSelectSchema = createSelectSchema(documentType);
export const documentTypeInsertSchema = createInsertSchema(documentType);

export type IDocumentType = z.infer<typeof documentTypeSelectSchema>;
export type ICreateDocumentType = z.infer<typeof documentTypeInsertSchema>;
