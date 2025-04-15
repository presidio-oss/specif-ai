// SolutionRepository.ts
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

  async saveSolutionMetadata(
    solutionData: CreateSolutionRequest
  ) {
    if (this.solutionDb) {
      await this.solutionDb.insert(metadata).values([
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

      return this.dbClient.getSolutionDb();
    } else {
      throw new Error("Failed to initialize solution DB");
    }
  }

  private async saveRequirement(
    db: any,
    req: { title: string; requirement: string },
    reqType: string,
    count: number
  ) {
    return await db.insert(document).values([
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

  async saveRequirements(results: SolutionResponse) {
    const db = this.dbClient.getSolutionDb();
    for (const reqType of ["brd", "prd", "uir", "nfr"] as const) {
      if (results[reqType]) {
        for (const req of results[reqType]) {
          await this.saveRequirement(db, req, reqType, results[reqType].length);
        }
      }
    }
  }
}
