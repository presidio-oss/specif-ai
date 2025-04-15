import type { IpcMainInvokeEvent } from "electron";
import type { GetSolutionsResponse } from "../../schema/solution/get.schema";
import { MasterRepository } from "../../repo/master.repo";
import { traceBuilder } from "../../utils/trace-builder";
import { COMPONENT, OPERATIONS } from "../../helper/constants";

export async function getSolutions(
  event: IpcMainInvokeEvent
): Promise<GetSolutionsResponse> {
  try {
    console.log("[get-solutions] Fetching all solutions...");

    const traceName = traceBuilder(COMPONENT.SOLUTION, OPERATIONS.GET);
    console.log(`[get-solutions] Using trace: ${traceName}`);

    const masterRepo = new MasterRepository();
    await masterRepo.initializeMasterDb();

    const dbSolutions = await masterRepo.getAllSolutions();

    const solutions = dbSolutions.map((solution) => ({
      project: solution.name,
      metadata: {
        id: solution.name,
        name: solution.name,
        description: solution.description,
        createdAt: solution.createdAt,
        updatedAt: solution.updatedAt,
      },
    }));

    console.log(`[get-solutions] Found ${solutions.length} solutions`);
    return solutions;
  } catch (error) {
    console.error("Error in getSolutions:", error);
    throw error;
  }
}
