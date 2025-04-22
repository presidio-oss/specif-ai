import { masterSolutions } from '../schema/master';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod';


// Table: MasterSolutions
// Below would contain the zod schema and its infered type

export const masterSolutionSelectSchema = createSelectSchema(masterSolutions);
export const masterSolutionInsertSchema = createInsertSchema(masterSolutions);

export type IMasterSolution = z.infer<typeof masterSolutionSelectSchema>;
export type ICreateMasterSolution = z.infer<typeof masterSolutionInsertSchema>;