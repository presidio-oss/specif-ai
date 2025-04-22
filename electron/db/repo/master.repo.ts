import { eq, and, SQL } from "drizzle-orm";
import { } from "drizzle-orm";
import * as masterSchema from "../schema/master";
import { MasterDB } from "../master.factory";
import { ICreateMasterSolution, IMasterSolution, masterSolutionInsertSchema } from "../interfaces/master.interface";

export class MasterRepository {
  private defaultSolutionAllowedColumns = {
    id: masterSchema.masterSolutions.id,
    name: masterSchema.masterSolutions.name,
    description: masterSchema.masterSolutions.description,
    createdAt: masterSchema.masterSolutions.createdAt,
    updatedAt: masterSchema.masterSolutions.updatedAt
  }
  private defaultSolutionQueryFilters = [
    eq(masterSchema.masterSolutions.isDeleted, false)
  ]

  constructor(private db: MasterDB) {
    if (!this.db) {
      throw new Error("Invalid database instance.");
    }
  }

  async getSolution(solutionDetail: Partial<Pick<IMasterSolution, 'name' | 'id'>>) {
    console.log('Entered <MasterRepository.getSolution>')

    const filters: SQL[] = [];
    const masterSolutionSchema = masterSchema.masterSolutions

    if (solutionDetail.id) filters.push(eq(masterSolutionSchema.id, solutionDetail.id))
    if (solutionDetail.name) filters.push(eq(masterSolutionSchema.name, solutionDetail.name))

    const response = await this.db
      .select(this.defaultSolutionAllowedColumns)
      .from(masterSchema.masterSolutions)
      .where(
        and(
          ...filters,
          ...this.defaultSolutionQueryFilters
        )
      )
      .limit(1);

    console.log('Exited <MasterRepository.getSolution>')
    return (response && response.length) ? response[0] : null;
  }

  async getAllSolutions() {
    console.log('Entered <MasterRepository.getAllSolution>')

    const response = await this.db
      .select(this.defaultSolutionAllowedColumns)
      .from(masterSchema.masterSolutions)
      .where(
        and(...this.defaultSolutionQueryFilters)
      );

    console.log('Exited <MasterRepository.getAllSolution>')
    return response;
  }

  async createMasterSolution(solutionDetail: ICreateMasterSolution) {
    console.log('Entered <MasterRepository.createMasterSolution>')

    // Validate the data
    const parsedData = masterSolutionInsertSchema.safeParse(solutionDetail);
    if (!parsedData.success) {
      console.error(`Error occurred while validating incoming data, Error: ${parsedData.error}`);
      throw new Error('Schema validation failed')
    }

    const response = await this.db
      .insert(masterSchema.masterSolutions)
      .values(parsedData.data)
      .returning()

    console.log('Exited <MasterRepository.createMasterSolution>')
    return (response && response.length) ? response[0] : null;
  }
}
