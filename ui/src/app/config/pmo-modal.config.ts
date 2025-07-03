export interface PmoModalConfig {
  title: string;
  serviceName: string;
  connectionLabels: {
    connected: string;
    disconnected: string;
    checking: string;
  };
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
    connectionLabels: {
      connected: 'ADO integration is connected and ready',
      disconnected: 'ADO integration is not configured or connection failed',
      checking: 'Checking ADO integration status...',
    },
    itemLabels: {
      topLevel: 'Feature',
      midLevel: 'PlatformFeature',
      bottomLevel: 'User Story',
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
    connectionLabels: {
      connected: 'Jira integration is connected and ready',
      disconnected: 'Jira integration is not configured or connection failed',
      checking: 'Checking Jira integration status...',
    },
    itemLabels: {
      topLevel: 'Epic',
      midLevel: 'Story',
      bottomLevel: 'Sub-task',
    },
    badgeColors: {
      topLevel: 'bg-indigo-100 text-indigo-800',
      midLevel: 'bg-cyan-100 text-cyan-800',
      bottomLevel: 'bg-orange-100 text-orange-800',
    },
  },
};
