import { environment } from 'src/environments/environment';

export interface ThinkingProcessConfig {
  title: string;
  subtitle: string;
  loadingMessage: string;
  thinkingSectionTitle: string;
  actionsSectionTitle: string;
}

export const defaultConfig: ThinkingProcessConfig = {
  title: 'Creating Solution',
  subtitle: 'Processing your request',
  loadingMessage: `Sit back & let the ${environment.ThemeConfiguration.appName} do its thing...`,
  thinkingSectionTitle: 'Thinking Process',
  actionsSectionTitle: 'Actions Taken',
};
