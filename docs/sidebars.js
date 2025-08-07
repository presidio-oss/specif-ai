// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'doc',
      id: 'current/index',
      label: 'Introduction',
    },
    {
      type: 'doc',
      label: 'Getting Started',
      id: 'current/getting-started',
    },
    {
      type: 'category',
      label: 'Core Features',
      items: [
        {
          type: 'doc',
          id: 'current/core-features',
          label: 'Overview',
        },
        {
          type: 'doc',
          id: 'current/solution-creation-management',
          label: 'Solution Creation & Management',
        },
        {
          type: 'doc',
          id: 'current/requirement-types',
          label: 'Requirements Document Types',
        },
        {
          type: 'doc',
          id: 'current/business-workflows',
          label: 'Visualizing Business Workflows',
        },
        {
          type: 'doc',
          id: 'current/ai-interaction',
          label: 'AI Interaction & Features',
        },
        {
          type: 'doc',
          id: 'current/ai-generated-content',
          label: 'Agent-Driven Content Generation',
        },
        {
          type: 'doc',
          id: 'current/export-integration',
          label: 'Export & Integration Options',
        },
      ],
    },
    {
      type: 'category',
      label: 'Integrations',
      items: [
        {
          type: 'doc',
          id: 'current/integrations-setup',
          label: 'Solution Integrations',
        },
        {
          type: 'doc',
          id: 'current/JIRA-README',
          label: 'Detailed JIRA Setup',
        },
        {
          type: 'doc',
          id: 'current/ADO-README',
          label: 'Detailed Azure DevOps Setup',
        },
        {
          type: 'doc',
          id: 'current/aws-bedrock-kb-configuration',
          label: 'Detailed AWS Bedrock KB MCP Setup',
        },
      ],
    },
    {
      type: 'doc',
      label: 'Advanced',
      id: 'current/advanced-features',
    },
    {
      type: 'doc',
      id: 'current/troubleshooting',
      label: 'Troubleshooting',
    },
  ],
};

module.exports = sidebars;
