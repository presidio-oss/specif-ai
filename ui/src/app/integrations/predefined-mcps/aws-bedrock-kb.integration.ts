import {
  PredefinedMCPIntegration,
  FormField,
  MCPServerOptions,
} from '../../types/mcp.types';
import { McpServerOptionsSchema } from '../../shared/mcp-schemas';

const awsBedrockKbFormFields: FormField[] = [
  {
    type: 'text',
    label: 'AWS Profile Name',
    name: 'awsProfile',
    id: 'aws-profile',
    helpText: 'The AWS profile name configured in your AWS credentials file.',
    required: true,
  },
  {
    type: 'text',
    label: 'AWS Region',
    name: 'awsRegion',
    id: 'aws-region',
    helpText:
      'The AWS region where your Bedrock Knowledge Base resides (e.g., us-east-1).',
    required: true,
    default: 'us-east-1',
  },
  {
    type: 'text',
    label: 'KB Inclusion Tag Key (Optional)',
    name: 'kbInclusionTagKey',
    id: 'kb-inclusion-tag-key',
    helpText:
      'Optional: Specify a tag key to filter which Knowledge Bases are exposed.',
    required: false,
    default: 'specif-mcp-rag-kb',
  },
];

export const AWS_BEDROCK_KB_INTEGRATION: PredefinedMCPIntegration<
  typeof awsBedrockKbFormFields
> = {
  id: 'specif_awslabs.bedrock-kb-retrieval-mcp-server',
  title: 'AWS Bedrock KB',
  description: 'Connect to an AWS Bedrock Knowledge Base retrieval server.',
  iconPath: './assets/img/logo/aws_dark_bg_transparent_logo.svg',
  readmeUrl: 'https://github.com/awslabs/mcp/tree/main/src/bedrock-kb-retrieval-mcp-server',
  formFields: awsBedrockKbFormFields,

  // Function to build the MCPServerOptions object from the form data (env vars)
  buildConfig: (formData: any): MCPServerOptions => {
    const envVars: Record<string, string> = {};

    envVars['AWS_PROFILE'] = formData.awsProfile;
    envVars['AWS_REGION'] = formData.awsRegion;
    envVars['KB_INCLUSION_TAG_KEY'] = formData.kbInclusionTagKey;

    const config: MCPServerOptions = {
      transportType: 'stdio',
      command: 'uvx',
      args: ['awslabs.bedrock-kb-retrieval-mcp-server@latest'],
      env: envVars,
      disabled: false,
      metadata: {},
      name: "AWS Bedrock Knowledge Base"
    };

    // Validate the constructed config against the schema
    const validation = McpServerOptionsSchema.safeParse(config);

    if (!validation.success) {
      console.error(
        'Failed to build valid AWS Bedrock KB MCP config:',
        validation.error,
      );

      throw new Error(
        'Invalid configuration generated for AWS Bedrock KB MCP.',
      );
    }

    return validation.data;
  },

  // Function to populate form fields from existing MCPServerOptions (for editing)
  buildFormDataFromConfig: (options: MCPServerOptions) => {
    if (options.transportType !== 'stdio') {
      console.warn(
        'AWS Bedrock KB integration expected stdio transport, received:',
        options.transportType,
      );
      return {};
    }

    const fields = {
      awsProfile: options.env?.['AWS_PROFILE'] || '',
      awsRegion: options.env?.['AWS_REGION'] || '',
      kbInclusionTagKey: options.env?.['KB_INCLUSION_TAG_KEY'] || '',
    };

    return fields;
  },
};
