import { withTransaction } from "../utils/transaction.decorator";
import { DatabaseClient } from "../db/client";
import { metadata, document, integration, documentCountByType } from "../db/solution.schema";
import type {
  SolutionResponse,
  CreateSolutionRequest,
} from "../schema/solution/create.schema";
import { Client } from "@libsql/client/lib-esm/node";
import { LibSQLDatabase } from "drizzle-orm/libsql";

export class SolutionRepository {
  private dbClient: DatabaseClient;
  private solutionName: string;
  private solutionDb?: LibSQLDatabase<Record<string, unknown>> & {
    $client: Client;
  };

  constructor(solutionName: string) {
    this.dbClient = DatabaseClient.getInstance();
    this.solutionName = solutionName;
  }

  async initializeSolutionDb() {
    this.solutionDb = await this.dbClient.openSolutionDb(this.solutionName);
  }

  @withTransaction()
  async saveSolutionMetadata(solutionData: CreateSolutionRequest, tx?: any) {
    await tx.insert(metadata).values([
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

  private async saveRequirement(
    tx: any,
    req: { title: string; requirement: string },
    reqType: string,
    count: number
  ) {
    return await tx.insert(document).values([
      {
        name: req.title,
        description: req.requirement,
        documentTypeId: reqType,
        count: count,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }

  @withTransaction()
  async saveRequirements(results: SolutionResponse, tx?: any) {
    for (const reqType of ["brd", "prd", "uir", "nfr"] as const) {
      if (results[reqType]) {
        for (const req of results[reqType]) {
          await this.saveRequirement(tx, req, reqType, results[reqType].length);
        }
      }
    }
    
    return true;
  }

  async getSolutionByName(name: string) {
    const currentDb = this.dbClient.getSolutionDb();

    const solutioMetadata = await currentDb.select().from(metadata);
    const documents = await currentDb.select().from(document);
    const documentMetadata = await currentDb.select().from(documentCountByType)
    const integrations = await currentDb.select().from(integration);

    const res = {
      solutioMetadata,
      documentMetadata,
      documents,
      integrations
    };
    return res;
  }
}
