import { withTransaction } from "../utils/transaction.decorator";
import { DatabaseClient } from "../db/client";
import { metadata, document } from "../db/solution.schema";
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
  async saveSolutionMetadata(
    solutionData: CreateSolutionRequest,
    tx?: any 
  ) {
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
}