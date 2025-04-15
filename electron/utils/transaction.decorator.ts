import { DatabaseClient } from '../db/client';

/**
 * Decorator that wraps a method with a database transaction.
 * Provides transaction context to the method and handles rollback on failure.
 * 
 * Usage:
 * ```typescript
 * class SolutionRepository {
 *   @withTransaction()
 *   async saveRequirements(results: SolutionResponse, tx?: any) {
 *     // Use tx instead of getting a new db connection
 *     for (const reqType of ["brd", "prd", "uir", "nfr"] as const) {
 *       if (results[reqType]) {
 *         for (const req of results[reqType]) {
 *           await this.saveRequirement(tx, req, reqType, results[reqType].length);
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export function withTransaction() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const db = DatabaseClient.getInstance().getSolutionDb();

      return await db.transaction(async (tx) => {
        return await originalMethod.apply(this, [...args, tx]);
      });
    };

    return descriptor;
  };
}
