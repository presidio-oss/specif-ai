import { DatabaseClient } from '../db/client';

/**
 * Decorator that wraps a method with a database transaction.
 * Simply provides transaction context to the method and handles rollback on failure.
 * 
 * Usage:
 * ```typescript
 * class AccountService {
 *   @withTransaction()
 *   async transferMoney(from: string, to: string, amount: number, tx?: any) {
 *     await tx.update(accounts)
 *       .set({ balance: sql`${accounts.balance} - ${amount}` })
 *       .where(eq(accounts.name, from));
 *     
 *     await tx.update(accounts)
 *       .set({ balance: sql`${accounts.balance} + ${amount}` })
 *       .where(eq(accounts.name, to));
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
