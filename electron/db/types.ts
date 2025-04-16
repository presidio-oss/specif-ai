import { drizzle } from "drizzle-orm/libsql";

export type Database = ReturnType<typeof drizzle>;
