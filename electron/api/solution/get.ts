import type { IpcMainInvokeEvent } from "electron";
import type { GetSolutionsResponse } from "../../schema/solution/get.schema";
import { traceBuilder } from "../../utils/trace-builder";
import { COMPONENT, OPERATIONS } from "../../helper/constants";
import { masterFactory } from "../../db/master.factory";
import { solutionFactory } from "../../db/solution.factory";

export async function getSolutions(
  event: IpcMainInvokeEvent
): Promise<GetSolutionsResponse> {
  try {
    console.log("[get-solutions] Fetching all solutions...");

    const traceName = traceBuilder(COMPONENT.SOLUTION, OPERATIONS.GET);
    console.log(`[get-solutions] Using trace: ${traceName}`);

    // Get Master repository instance
    const masterRepo = masterFactory.getRepository()

    // Get all the solution details
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

export async function getSolutionByName(
  event: IpcMainInvokeEvent,
  name: string,
  docTypes?: string[]
) {
  // Get Master repository instance
  const masterRepo = masterFactory.getRepository()

  // Check whether the solution exists
  const solutionDetail = await masterRepo.getSolution({ name });
  if (!solutionDetail) {
    throw new Error('Solution does not exists')
  }

  // Get Solution repository
  const solutionRepo = await solutionFactory.getRepository(solutionDetail.id)

  return await solutionRepo.getSolutionByName(name, docTypes);
}
