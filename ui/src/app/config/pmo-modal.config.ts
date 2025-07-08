export interface PmoModalConfig {
  title: string;
  serviceName: string;
  itemLabels: {
    topLevel: string;
    midLevel: string;
    bottomLevel: string;
  };
  badgeColors: {
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
    badgeColors: {
      topLevel: 'bg-purple-100 text-purple-800',
      midLevel: 'bg-blue-100 text-blue-800',
      bottomLevel: 'bg-green-100 text-green-800',
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
    badgeColors: {
      topLevel: 'bg-indigo-100 text-indigo-800',
      midLevel: 'bg-cyan-100 text-cyan-800',
      bottomLevel: 'bg-orange-100 text-orange-800',
    },
  },
};
