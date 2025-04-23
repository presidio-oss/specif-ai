import { inArray, eq, or, like, and } from "drizzle-orm";
import * as solutionSchema from "../schema/solution";
import { SolutionDB } from "../solution.factory";
import {
  documentInsertSchema,
  ICreateDocument,
  ICreateMetadata,
} from "../interfaces/solution.interface";
import { metadataInsertSchema } from "../interfaces/solution.interface";
import {
  documentCountByType,
  document,
  documentLinks,
} from "../schema/solution";

export class SolutionRepository {
  constructor(private db: SolutionDB) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }
  }

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
            eq(document.isDeleted, false),
            or(
              like(document.name, `%${searchQuery}%`),
              like(document.description, `%${searchQuery}%`),
              like(document.documentNumber, `%${searchQuery}%`)
            )
          )
        )
      : baseQuery.where(eq(document.isDeleted, false));

    const documents = await query;
    console.log("Exited <SolutionRepository.getAllDocuments>");
    return documents;
  }

  async getDocumentTypesWithCount() {
    console.log("Entered <SolutionRepository.getDocumentTypesWithCount>");
    const documentCount = await this.db.select().from(documentCountByType);
    console.log("Exited <SolutionRepository.getDocumentTypesWithCount>");
    return documentCount;
  }

  async getDocument(documentId: number) {
    console.log("Entered <SolutionRepository.getDocument>");
    const result = await this.db
      .select()
      .from(document)
      .where(eq(document.id, documentId))
      .get();
    console.log("Exited <SolutionRepository.getDocument>");
    // TODO: Return Links too
    return result;
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
}
