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
      type: 'doc',
      label: 'Core Features',
      id: 'current/core-features',
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
