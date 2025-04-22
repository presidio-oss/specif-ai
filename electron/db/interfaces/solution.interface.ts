import { 
    metadata, 
    integration, 
    documentType, 
    document, 
    conversation, 
    message, 
    businessProcess,
    businessProcessDocuments,
    analyticsLookup
} from '../schema/solution';

export type IMetadata = typeof metadata.$inferSelect;
export type IIntegration = typeof integration.$inferSelect;
export type IDocumentType = typeof documentType.$inferSelect;
export type IDocument = typeof document.$inferSelect;
export type IConversation = typeof conversation.$inferSelect;
export type IMessage = typeof message.$inferSelect;
export type IBusinessProcess = typeof businessProcess.$inferSelect;
export type IBusinessProcessDocuments = typeof businessProcessDocuments.$inferSelect;
export type IAnalyticsLookup = typeof analyticsLookup.$inferSelect;
