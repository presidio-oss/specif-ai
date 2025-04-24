import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";

export type Database = ReturnType<typeof drizzle>;
