import { z } from 'zod';
import {
  McpServerOptionsSchema,
  McpSettingsSchema,
} from '../shared/mcp-schemas';

export type MCPSettings = z.infer<typeof McpSettingsSchema>;
export type MCPServerOptions = z.infer<typeof McpServerOptionsSchema>;

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  name: string;
  uri: string;
  description: string;
}

export type MCPServerDetails = MCPServerOptions & {
  id: string;
  status: 'connected' | 'error';
  errors?: string[];
  tools: MCPTool[];
  resources: MCPResource[];
};

export type ValidateMCPServersResponse = MCPServerDetails[];

// mcp integration

export type FormField = (
  | { type: 'text'; default?: string }
  | { type: 'textarea'; default?: string }
) & {
  label: string;
  helpText: string;
  name: string;
  id: string;
  required: boolean;
};

export type PredefinedMCPIntegration<FormFieldsType extends Array<FormField>> =
  {
    id: string;
    title: string;
    description: string;
    iconPath: string;
    readmeUrl?: string;
    formFields: FormFieldsType;
    buildFormDataFromConfig: (
      options: MCPServerOptions,
    ) => Record<string, string | number>;
    buildConfig: (formData: any) => MCPServerOptions;
  };
