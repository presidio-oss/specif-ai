import * as fs from "fs";
import path from 'path';
import { drizzle, LibSQLDatabase, LibSQLTransaction } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as solutionSchema from "./schema/solution";
import { masterFactory, MasterFactory } from "./master.factory";
import { SolutionRepository } from "./repo/solution.repo";
import { store } from "../services/store";

export type SolutionDB = LibSQLDatabase<typeof solutionSchema> | LibSQLTransaction<typeof solutionSchema, any>;

export class SolutionFactory {
    static DEFAULT_DB_PATH = 'solution.sqlite'

    // This would hold one solution database instance at a time
    // We can even convert this to hold all the solution database instance, but for now that wasn't required
    private static dbDetails: { id: number, db: SolutionDB } | undefined = undefined;

    constructor(private masterFactory: MasterFactory) { }

    createDatabase(dbPath: string) {
        console.log('Entered <SolutionFactory.createDatabase>')

        if (!fs.existsSync(dbPath)) {
            throw new Error('Database path does not exists, please verify.')
        }

        dbPath = path.join(dbPath, SolutionFactory.DEFAULT_DB_PATH);

        // Create database instance
        const sqlite = createClient({
            url: `file:${dbPath}`,
        });
        const db = drizzle(sqlite, { schema: solutionSchema });

        console.log('Exited <SolutionFactory.createDatabase>')
        return db;
    }

    async getDatabase(solutionId: number) {
        console.log('Entered <SolutionFactory.getDatabase>')

        if (!SolutionFactory.dbDetails || SolutionFactory.dbDetails.id !== solutionId) {
            console.log(`No solution database instance found, so creating one with the ID: ${solutionId}`);
            await this.setDatabase(solutionId);
        }

        if (!SolutionFactory.dbDetails) {
            throw new Error('Invalid database details');
        }

        console.log('Exited <SolutionFactory.getDatabase>')
        return SolutionFactory.dbDetails.db;
    }

    async setDatabase(solutionId: number) {
        console.log('Entered <SolutionFactory.setDatabase>')

        // Check whether the solution exists
        const masterRepo = this.masterFactory.getRepository();
        const solutionDetail = await masterRepo.getSolution({ id: solutionId });

        if (!solutionDetail) {
            throw new Error('Cannot create solution database: Solution does not exists')
        }

        // Initialize database
        const { directoryPath } = store.getAppConfig() || {};
        if (!directoryPath || !fs.existsSync(directoryPath)) {
            throw new Error('Invalid base directory');
        }

        // Check if the solution directory present
        const solutionDBPath = `${directoryPath}/${solutionDetail.name}`;
        if (!fs.existsSync(solutionDBPath)) {
            fs.mkdirSync(solutionDBPath)
        }

        const db = this.createDatabase(solutionDBPath);
        SolutionFactory.dbDetails = { id: solutionDetail.id, db }

        console.log('Exited <SolutionFactory.setDatabase>')
    }

    async getRepository(solutionId: number) {
        console.log('Entered <SolutionFactory.getRepository>')

        // Get database instance
        const db = await this.getDatabase(solutionId);

        // Create new master repository
        const repo = new SolutionRepository(db);

        console.log('Exited <SolutionFactory.getRepository>')
        return repo;
    }

    async runWithTransaction<T>(
        solutionId: number,
        fn: (repo: SolutionRepository) => Promise<T>
    ): Promise<T> {
        const db = await this.getDatabase(solutionId);

        return db.transaction(async (tx) => {
            const repo = new SolutionRepository(tx);
            return await fn(repo);
        });
    }

    closeActiveDBConnection() {
        if (SolutionFactory.dbDetails) {
            SolutionFactory.dbDetails = undefined;
        }
    }
}

export const solutionFactory = new SolutionFactory(masterFactory);