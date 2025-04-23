import path from "path";

import { migrate } from "drizzle-orm/libsql/migrator";
import { LibSQLDatabase } from "drizzle-orm/libsql";

import { masterFactory } from "../master.factory";
import { solutionFactory } from "../solution.factory";
import * as masterSchema from "../schema/master";
import * as solutionSchema from "../schema/solution";

export class MigrationUtils {
  private static readonly MIGRATIONS_DIR = {
    MASTER: path.join("drizzle", "master"),
    SOLUTION: path.join("drizzle", "solution"),
  };

  /**
   * Applies migrations for the master database
   */
  static async migrateMaster(): Promise<void> {
    console.log("Entered <MigrationUtils.migrateMaster>");

    const db = masterFactory.getDatabase();

    const dbInstance = db as LibSQLDatabase<typeof masterSchema>;
    await migrate(dbInstance, {
      migrationsFolder: this.MIGRATIONS_DIR.MASTER,
    });

    console.log("Exited <MigrationUtils.migrateMaster>");
  }

  /**
   * Applies migrations for a specific solution database
   * @param solutionId - The ID of the solution to migrate
   */
  static async migrateSolution(solutionId: number): Promise<void> {
    console.log(
      `Entered <MigrationUtils.migrateSolution> for solution ${solutionId}`
    );

    const db = await solutionFactory.getDatabase(solutionId);

    const dbInstance = db as LibSQLDatabase<typeof solutionSchema>;
    await migrate(dbInstance, {
      migrationsFolder: this.MIGRATIONS_DIR.SOLUTION,
    });

    console.log(
      `Exited <MigrationUtils.migrateSolution> for solution ${solutionId}`
    );
  }
}
