import { eq, and, SQL } from "drizzle-orm";
import { } from "drizzle-orm";
import * as masterSchema from "../schema/master";
import { MasterDB } from "../master.factory";
import { IMasterSolution } from "../interfaces/master.interface";

export class MasterRepository {
  private defaultSolutionAllowedColumns = {
    id: masterSchema.masterSolutions.id,
    name: masterSchema.masterSolutions.name,
    description: masterSchema.masterSolutions.description,
    solutionPath: masterSchema.masterSolutions.solutionPath,
    createdAt: masterSchema.masterSolutions.createdAt,
    updatedAt: masterSchema.masterSolutions.updatedAt
  }

  constructor(private db: MasterDB) { }

  async getSolutionByName(name: string) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }

    return await this.db
      .select(this.defaultSolutionAllowedColumns)
      .from(masterSchema.masterSolutions)
      .where(
        and(
          eq(masterSchema.masterSolutions.name, name),
          eq(masterSchema.masterSolutions.isDeleted, false)
        )
      );
  }

  async getSolution(solutionDetail: Partial<Pick<IMasterSolution, 'name' | 'id' | 'solutionPath'>>) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }

    const filters: SQL[] = [];
    const masterSolutionSchema = masterSchema.masterSolutions

    if (solutionDetail.id) filters.push(eq(masterSolutionSchema.id, solutionDetail.id))
    if (solutionDetail.name) filters.push(eq(masterSolutionSchema.name, solutionDetail.name))
    if (solutionDetail.solutionPath) filters.push(eq(masterSolutionSchema.solutionPath, solutionDetail.solutionPath))


    const response = await this.db
      .select(this.defaultSolutionAllowedColumns)
      .from(masterSchema.masterSolutions)
      .where(
        and(
          ...filters,
          eq(masterSchema.masterSolutions.isDeleted, false)
        )
      )
      .limit(1);

    return (response && response.length) ? response[0] : null;
  }

  async getAllSolutions() {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }

    return await this.db
      .select(this.defaultSolutionAllowedColumns)
      .from(masterSchema.masterSolutions)
      .where(eq(masterSchema.masterSolutions.isDeleted, false));
  }

  async createMasterSolution(name: string, description: string) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }

    await this.db.insert(masterSchema.masterSolutions).values([
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
