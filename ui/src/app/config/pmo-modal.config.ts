export interface PmoModalConfig {
  title: string;
  serviceName: string;
  itemLabels: {
    topLevel: string;
    midLevel: string;
    bottomLevel: string;
  };
}

export const PMO_MODAL_CONFIGS: { [key: string]: PmoModalConfig } = {
  ado: {
    title: 'Pull from ADO',
    serviceName: 'Azure DevOps',
    itemLabels: {
      topLevel: 'Product Requirement',
      midLevel: 'User Story',
      bottomLevel: 'Task',
    },
  },
  jira: {
    title: 'Pull from Jira',
    serviceName: 'Jira',
    itemLabels: {
      topLevel: 'Product Requirement',
      midLevel: 'User Story',
      bottomLevel: 'Task',
    },
  },
};
