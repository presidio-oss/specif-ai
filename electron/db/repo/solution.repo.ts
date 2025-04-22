import { inArray } from "drizzle-orm";
import * as solutionSchema from '../schema/solution';
import { CreateSolutionRequest, SolutionResponse } from "../../schema/solution/create.schema";
import { SolutionDB } from "../solution.factory";

export class SolutionRepository {
  constructor(private db: SolutionDB) {}
  
  async saveSolutionMetadata(solutionData: CreateSolutionRequest) {
    await this.db.insert(solutionSchema.metadata).values([
      {
        name: solutionData.name,
        description: solutionData.description,
        version: "1.0.0",
        isBrownfield: solutionData.cleanSolution,
        technicalDetails: solutionData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    return true;
  }

  // private async saveRequirement(
  //   req: { title: string; requirement: string },
  //   reqType: string,
  //   count: number
  // ) {
  //   return await this.db.insert(solutionSchema.document).values([
  //     {
  //       name: req.title,
  //       description: req.requirement,
  //       documentTypeId: reqType,
  //       count: count,
  //       createdAt: new Date().toISOString(),
  //       updatedAt: new Date().toISOString(),
  //     },
  //   ]);
  // }

  // async saveRequirements(results: SolutionResponse) {
  //   for (const reqType of ["brd", "prd", "uir", "nfr"] as const) {
  //     if (results[reqType]) {
  //       for (const req of results[reqType]) {
  //         await this.saveRequirement(req, reqType, results[reqType].length);
  //       }
  //     }
  //   }
    
  //   return true;
  // }

  async getSolutionByName(name: string, docTypes?: string[]) {
    // TODO: Filter non-deleted items
    const solutionMetadata = await this.db.select().from(solutionSchema.metadata);
    const documents = await this.db.select().from(solutionSchema.document);
    const documentMetadata = await this.db.select().from(solutionSchema.documentCountByType).where(
      docTypes ? inArray(solutionSchema.documentCountByType.typeName, docTypes) : undefined
    );
    const integrations = await this.db.select().from(solutionSchema.integration);

    const res = {
      solutionMetadata,
      documentMetadata,
      documents,
      integrations
    };
    return res;
  }
}
