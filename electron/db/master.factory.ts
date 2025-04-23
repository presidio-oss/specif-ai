import * as fs from "fs";
import path from 'path';
import { LibSQLTransaction } from 'drizzle-orm/libsql';
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as masterSchema from "./schema/master";
import { MasterRepository } from "./repo/master.repo";
import { store } from "../services/store";

export type MasterDB = LibSQLDatabase<typeof masterSchema> | LibSQLTransaction<typeof masterSchema, any>;

export class MasterFactory {
    static DEFAULT_DB_PATH = 'master.sqlite'
    private static db: MasterDB | undefined = undefined;

    createDatabase(dbPath: string) {
        console.log('Entered <MasterFactory.createDatabase>')

        if (!fs.existsSync(dbPath)) {
            throw new Error('Database path does not exists, please verify.')
        }

        dbPath = path.join(dbPath, MasterFactory.DEFAULT_DB_PATH);

        // Create database instance
        const sqlite = createClient({
            url: `file:${dbPath}`,
        });
        const db = drizzle(sqlite, { schema: masterSchema });

        console.log('Exited <MasterFactory.createDatabase>')
        return db;
    }

    getDatabase() {
        console.log('Entered <MasterFactory.getDatabase>')

        if (!MasterFactory.db) {
            console.log('No master database instance found, creating from the current working directory');
            this.setDatabase();
        }

        console.log('Exited <MasterFactory.getDatabase>')
        return MasterFactory.db;
    }

    setDatabase(dbPath: string | null = null) {
        console.log('Entered <MasterFactory.setDatabase>')

        // Default fallback to working directory from the store
        if (!dbPath) {
            const appConfig = store.getAppConfig();
            if (!(appConfig && appConfig.directoryPath)) {
                throw new Error('Invalid directory path, please verify.')
            }

            dbPath = appConfig.directoryPath
        }

        // Overrides the existing database instance
        MasterFactory.db = this.createDatabase(dbPath);

        console.log('Exited <MasterFactory.setDatabase>')
    }

    getRepository() {
        console.log('Entered <MasterFactory.getRepository>')

        // Get database instance
        const db = this.getDatabase();
        if (!db) {
            throw new Error("Invalid database instance.");
        }

        // Create new master repository
        const repo = new MasterRepository(db);

        console.log('Exited <MasterFactory.getRepository>')
        return repo;
    }

    async runWithTransaction<T>(
        fn: (repo: MasterRepository) => Promise<T>
    ): Promise<T> {
        const db = this.getDatabase();
        if (!db) {
            throw new Error("Invalid database instance.");
        }

        return db.transaction(async (tx) => {
            const repo = new MasterRepository(tx);
            return await fn(repo);
        });
    }

    closeActiveDBConnection() {
        if (MasterFactory.db) {
            MasterFactory.db = undefined;
        }
    }
}

export const masterFactory = new MasterFactory();