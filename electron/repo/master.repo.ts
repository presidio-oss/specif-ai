import { DatabaseClient } from "../db/client";
import { masterSolutions } from "../db/master.schema";
import { eq, and } from "drizzle-orm";
import { Client } from "@libsql/client/lib-esm/node";
import { LibSQLDatabase } from "drizzle-orm/libsql";

export class MasterRepository {
  private dbClient: DatabaseClient;
  private masterDb?: LibSQLDatabase<Record<string, unknown>> & {
    $client: Client;
  };

  constructor() {
    this.dbClient = DatabaseClient.getInstance();
  }

  async initializeMasterDb() {
    this.masterDb = await this.dbClient.initializeMasterDb();
  }

  async getSolutionByName(name: string) {
    if (!this.masterDb) {
      throw new Error("Master DB is not initialized");
    }

    return await this.masterDb
      .select({
        name: masterSolutions.name,
        description: masterSolutions.description,
        solutionPath: masterSolutions.solutionPath,
        createdAt: masterSolutions.createdAt,
        updatedAt: masterSolutions.updatedAt,
      })
      .from(masterSolutions)
      .where(
        and(
          eq(masterSolutions.name, name),
          eq(masterSolutions.isDeleted, false)
        )
      );
  }

  async getAllSolutions() {
    if (!this.masterDb) {
      throw new Error("Master DB is not initialized");
    }

    return await this.masterDb
      .select({
        name: masterSolutions.name,
        description: masterSolutions.description,
        solutionPath: masterSolutions.solutionPath,
        createdAt: masterSolutions.createdAt,
        updatedAt: masterSolutions.updatedAt,
      })
      .from(masterSolutions)
      .where(eq(masterSolutions.isDeleted, false));
  }

  async createMasterSolution(name: string, description: string) {
    if (!this.masterDb) {
      throw new Error("Master DB is not initialized");
    }

    await this.masterDb.insert(masterSolutions).values([
      {
        name,
        description,
        solutionPath: name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
  }
}
