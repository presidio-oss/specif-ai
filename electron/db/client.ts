import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { store } from "../services/store";
import { Database } from "./types";
import { AppConfig } from "../schema/core/store.schema";
import * as masterSchema from "./master.schema";
import * as solutionSchema from "./solution.schema";
import { documentTypeData } from "./seeds/document-type-data";

export class DatabaseClient {
  private static instance: DatabaseClient;
  private masterDb: Database | null = null;
  private activeSolutionDb: {
    name: string;
    db: Database;
  } | null = null;

  private constructor() {}

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  private getDirectoryPath(): string {
    const appConfig = store.get<AppConfig>("APP_CONFIG");
    if (!appConfig?.directoryPath) {
      throw new Error("directoryPath not configured in APP_CONFIG");
    }
    return appConfig.directoryPath;
  }

  public async initializeMasterDb() {
    if (this.masterDb) {
      throw new Error("Master DB already initialized");
    }

    const directoryPath = this.getDirectoryPath();
    const dbPath = path.join(directoryPath, "master.sqlite");

    const sqlite = createClient({
      url: `file:${dbPath}`,
    });
    const db = drizzle(sqlite, { schema: masterSchema });
    this.masterDb = db;
    await migrate(db, { migrationsFolder: "./drizzle/master" });
    return db;
  }

  public getMasterDb() {
    if (!this.masterDb) {
      throw new Error("Master DB not initialized");
    }
    return this.masterDb;
  }

  public async openSolutionDb(solutionName: string) {
    if (this.activeSolutionDb?.name === solutionName) {
      return this.activeSolutionDb.db;
    }

    this.closeSolutionDb();

    const directoryPath = this.getDirectoryPath();
    const solutionDir = path.join(directoryPath, solutionName);

    if (!fs.existsSync(solutionDir)) {
      fs.mkdirSync(solutionDir, { recursive: true });
    }

    const dbPath = path.join(
      directoryPath,
      `${solutionName}`,
      "solution.sqlite"
    );

    const sqlite = createClient({
      url: `file:${dbPath}`,
    });
    const db = drizzle(sqlite, { schema: solutionSchema });
    await migrate(db, { migrationsFolder: "./drizzle/solution" });
    await db
      .insert(solutionSchema.documentType)
      .values(documentTypeData)
      .onConflictDoNothing();
    this.activeSolutionDb = { name: solutionName, db };
    return db;
  }

  public closeSolutionDb() {
    if (this.activeSolutionDb) {
      this.activeSolutionDb = null;
    }
  }

  public getSolutionDb() {
    if (!this.activeSolutionDb) {
      throw new Error("No solution DB is open");
    }
    return this.activeSolutionDb.db;
  }

  public shutdown() {
    this.closeSolutionDb();
    if (this.masterDb) {
      this.masterDb = null;
    }
  }
}
