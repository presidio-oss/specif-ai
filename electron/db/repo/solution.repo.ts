import { inArray, eq, or, like, and } from "drizzle-orm";
import * as solutionSchema from "../schema/solution";
import { SolutionDB } from "../solution.factory";
import {
  businessProcessDocumentsInsertSchema,
  businessProcessInsertSchema,
  documentInsertSchema,
  ICreateBusinessProcess,
  ICreateBusinessProcessDocuments,
  documentUpdateSchema,
  ICreateDocument,
  ICreateMetadata,
  IUpdateDocument,
  IUpdateBusinessProcess,
  IUpdateBusinessProcessDocuments,
} from "../interfaces/solution.interface";
import { metadataInsertSchema } from "../interfaces/solution.interface";
import {
  documentCountByType,
  document,
  documentLinks,
  businessProcess,
  businessProcessDocuments
} from "../schema/solution";
import { documentTypeData } from "../seeds/document-type-data";

export class SolutionRepository {
  constructor(private db: SolutionDB) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }
  }

  private defaultDocumentQueryFilters = [
    eq(document.isDeleted, false)
  ]

  private defaultBusinessProcessQueryFilters = [
    eq(businessProcess.isDeleted, false)
  ]

  // TODO: Add isDeleted check for all the functions

  // Table: Metadata
  // Below are the functions related to Metadata table

  async saveMetadata(metadataDetail: ICreateMetadata) {
    console.log('Entered <SolutionRepository.saveMetadata>')

    // Validate the data
    const parsedData = metadataInsertSchema.safeParse(metadataDetail);
    if (!parsedData.success) {
      console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
      throw new Error('Schema validation failed')
    }

    const response = await this.db
      .insert(solutionSchema.metadata)
      .values(parsedData.data)
      .returning()

    console.log('Exited <SolutionRepository.saveMetadata>')
    return (response && response.length) ? response[0] : null;
  }

  // Table: Document
  // Below are the functions related to Metadata table

  async createRequirement(requirementDetail: ICreateDocument) {
    console.log('Entered <SolutionRepository.createRequirement>')

    // Validate the data
    const parsedData = documentInsertSchema.safeParse(requirementDetail);
    if (!parsedData.success) {
      console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
      throw new Error('Schema validation failed')
    }

    const response = await this.db
      .insert(solutionSchema.document)
      .values(parsedData.data)
      .returning()

    console.log('Exited <SolutionRepository.createRequirement>')
    return (response && response.length) ? response[0] : null;
  }

  async getAllDocuments(searchQuery?: string) {
    console.log("Entered <SolutionRepository.getAllDocuments>");

    const baseQuery = this.db.select().from(document);

    const query = searchQuery
      ? baseQuery.where(
          and(
            ...this.defaultDocumentQueryFilters,
            or(
              like(document.name, `%${searchQuery}%`),
              like(document.description, `%${searchQuery}%`),
              like(document.id, `%${searchQuery}%`)
            )
          )
        )
      : baseQuery.where(and(...this.defaultDocumentQueryFilters));

    const documents = await query;
    console.log("Exited <SolutionRepository.getAllDocuments>");
    return documents;
  }

  async getDocumentTypesWithCount() {
    console.log("Entered <SolutionRepository.getDocumentTypesWithCount>");
    const documentCount = await this.db.select().from(documentCountByType).where(and(...this.defaultDocumentQueryFilters));
    console.log("Exited <SolutionRepository.getDocumentTypesWithCount>");
    return documentCount;
  }

  async getDocument(documentId: number) {
    console.log("Entered <SolutionRepository.getDocument>");
    const result = await this.db
      .select()
      .from(document)
      .where(and(eq(document.id, documentId), ...this.defaultDocumentQueryFilters))
      .get();
    console.log("Exited <SolutionRepository.getDocument>");
    // TODO: Return Links too
    return result;
  }

  async updateDocument(documentData: Partial<IUpdateDocument>) {
    console.log("Entered <SolutionRepository.updateDocument>");
    const parsedData = documentUpdateSchema.partial().safeParse(documentData);
    if (!parsedData.success) {
      console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
      throw new Error('Schema validation failed')
    }
    if (!documentData.id) {
      throw new Error("Document id is required for update.");
    }
    const response = await this.db
      .update(document)
      .set(parsedData.data)
      .where(and(eq(document.id, documentData.id), ...this.defaultDocumentQueryFilters))
      .returning();
    console.log("Exited <SolutionRepository.updateDocument>");
    return response && response.length ? response[0] : null;
  }
  
  async createDocumentLinks(data: {
    sourceDocumentId: number;
    targetDocumentId: number;
    createdBy?: string;
  }[]) {
    console.log("Entered <SolutionRepository.createDocumentLinksBatch>");
    const response = await this.db
      .insert(documentLinks)
      .values(data)
      .returning();
  
    console.log("Exited <SolutionRepository.createDocumentLinksBatch>");
    return response;
  }

  // FIXME: where are we using this function? and can we optimise this?
  async getSolutionByName(name: string, docTypes?: string[]) {
    // TODO: Filter non-deleted items
    const solutionMetadata = await this.db
      .select()
      .from(solutionSchema.metadata);
    const documents = await this.db.select().from(solutionSchema.document);
    const documentMetadata = await this.db
      .select()
      .from(solutionSchema.documentCountByType)
      .where(
        docTypes
          ? inArray(solutionSchema.documentCountByType.typeName, docTypes)
          : undefined
      );
    const integrations = await this.db
      .select()
      .from(solutionSchema.integration);

    const res = {
      solutionMetadata,
      documentMetadata,
      documents,
      integrations,
    };
    return res;
  }

  // Table: Document Type
  // Below are the functions related to Document Type table
  async createDocumentType() {
    console.log("Entered <SolutionRepository.createDocumentType>");

    const response = await this.db
      .insert(solutionSchema.documentType)
      .values(documentTypeData)
      .returning();

    console.log("Exited <SolutionRepository.createDocumentType>");
    return response && response.length ? response[0] : null;
  }

  // Table: Business Process
  // Below are the functions related to Business Process table
  async getBusinessProcessCount() {
    console.log("Entered <SolutionRepository.getBusinessProcessCount>");
    const count = await this.db
      .select({ count: businessProcess.id })
      .from(businessProcess)
      .where(and(...this.defaultBusinessProcessQueryFilters));
    console.log("Exited <SolutionRepository.getBusinessProcessCount>");
    return count[0]?.count || 0;
  }

  async getAllBusinessProcesses(searchQuery?: string) {
    console.log("Entered <SolutionRepository.getAllBusinessProcesses>");

    const baseQuery = this.db.select().from(businessProcess);

    const query = searchQuery
      ? baseQuery.where(
          and(
            ...this.defaultBusinessProcessQueryFilters,
            or(
              like(businessProcess.name, `%${searchQuery}%`),
              like(businessProcess.description, `%${searchQuery}%`)
            )
          )
        )
      : baseQuery.where(and(...this.defaultBusinessProcessQueryFilters));

    const result = await query;
    console.log("Exited <SolutionRepository.getAllBusinessProcesses>");
    return result;
  }

  async getBusinessProcess(businessProcessId: number) {
    console.log("Entered <SolutionRepository.getBusinessProcess>");
    const results = await this.db
      .select({
        businessProcess: businessProcess,
        documents: businessProcessDocuments
      })
      .from(businessProcess)
      .leftJoin(
        businessProcessDocuments,
        eq(businessProcess.id, businessProcessDocuments.businessProcessId)
      )
      .where(
        and(
          eq(businessProcess.id, businessProcessId),
          ...this.defaultBusinessProcessQueryFilters
        )
      );
    console.log("Exited <SolutionRepository.getBusinessProcess>");
    return results;
  }

  async createBusinessProcess(businessProcessDetail: ICreateBusinessProcess) {
    console.log("Entered <SolutionRepository.createBusinessProcess>");

    // Validate the data
    const parsedData = businessProcessInsertSchema.safeParse(businessProcessDetail);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const response = await this.db
      .insert(businessProcess)
      .values(parsedData.data)
      .returning();

    console.log("Exited <SolutionRepository.createBusinessProcess>");
    return response && response.length ? response[0] : null;
  }

  async getBusinessProcessFlowchart(businessProcessId: number) {
    console.log("Entered <SolutionRepository.getBusinessProcessFlowchart>");
    const result = await this.db
      .select({ flowchart: businessProcess.flowchart })
      .from(businessProcess)
      .where(
        and(
          eq(businessProcess.id, businessProcessId),
          ...this.defaultBusinessProcessQueryFilters
        )
      )
      .get();
    console.log("Exited <SolutionRepository.getBusinessProcessFlowchart>");
    return result?.flowchart;
  }

  async updateBusinessProcess(
    businessProcessId: number,
    businessProcessDetail: Partial<IUpdateBusinessProcess>
  ) {
    console.log("Entered <SolutionRepository.updateBusinessProcess>");

    // Validate the data
    const parsedData = businessProcessInsertSchema.safeParse(businessProcessDetail);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const response = await this.db
      .update(businessProcess)
      .set({
        ...parsedData.data,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(businessProcess.id, businessProcessId),
          ...this.defaultBusinessProcessQueryFilters
        )
      )
      .returning();

    console.log("Exited <SolutionRepository.updateBusinessProcess>");
    return response && response.length ? response[0] : null;
  }

  // Table: Business Process Documents
  // Below are the functions related to Business Process Documents table
  async createBusinessProcessDocument(
    documentDetail: ICreateBusinessProcessDocuments
  ) {
    console.log("Entered <SolutionRepository.createBusinessProcessDocument>");

    // Validate the data
    const parsedData =
      businessProcessDocumentsInsertSchema.safeParse(documentDetail);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const response = await this.db
      .insert(businessProcessDocuments)
      .values(parsedData.data)
      .returning();

    console.log("Exited <SolutionRepository.createBusinessProcessDocument>");
    return response && response.length ? response[0] : null;
  }

  async getBusinessProcessDocuments(businessProcessId: number) {
    console.log("Entered <SolutionRepository.getBusinessProcessDocuments>");
    const result = await this.db
      .select()
      .from(businessProcessDocuments)
      .where(
        eq(
          solutionSchema.businessProcessDocuments.businessProcessId,
          businessProcessId
        )
      );
    console.log("Exited <SolutionRepository.getBusinessProcessDocuments>");
    return result;
  }

  async updateBusinessProcessDocument(
    businessProcessId: number,
    documentId: number,
    documentDetail: Partial<IUpdateBusinessProcessDocuments>
  ) {
    console.log("Entered <SolutionRepository.updateBusinessProcessDocument>");

    // Validate the data
    const parsedData =
      businessProcessDocumentsInsertSchema.safeParse(documentDetail);
    if (!parsedData.success) {
      console.error(
        `Error occurred while validating incoming data, Error: ${parsedData.error}`
      );
      throw new Error("Schema validation failed");
    }

    const response = await this.db
      .update(businessProcessDocuments)
      .set({
        ...parsedData.data,
      })
      .where(
        and(
          eq(
            solutionSchema.businessProcessDocuments.businessProcessId,
            businessProcessId
          ),
          eq(solutionSchema.businessProcessDocuments.documentId, documentId)
        )
      )
      .returning();

    console.log("Exited <SolutionRepository.updateBusinessProcessDocument>");
    return response && response.length ? response[0] : null;
  }

  async deleteBusinessProcessDocument(
    businessProcessId: number,
    documentId: number
  ) {
    console.log("Entered <SolutionRepository.deleteBusinessProcessDocument>");
    const result = await this.db
      .delete(businessProcessDocuments)
      .where(
        and(
          eq(
            solutionSchema.businessProcessDocuments.businessProcessId,
            businessProcessId
          ),
          eq(solutionSchema.businessProcessDocuments.documentId, documentId)
        )
      )
      .returning();
    console.log("Exited <SolutionRepository.deleteBusinessProcessDocument>");
    return result;
  }
}
