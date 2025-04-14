import { z } from "zod";

export type IResponseFormatInput<
  TStructuredResponse extends Record<string, any> = Record<string, any>
> =
  | {
      prompt: string;
      schema: z.ZodType<TStructuredResponse>;
    }
  | z.ZodType<TStructuredResponse>;
