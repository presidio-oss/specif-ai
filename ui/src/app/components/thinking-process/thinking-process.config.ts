import { environment } from 'src/environments/environment';

export interface ThinkingProcessConfig {
  title: string;
  subtitle: string;
}

export const defaultConfig: ThinkingProcessConfig = {
  title: 'Creating Solution',
  subtitle: `Sit back & let the ${environment.ThemeConfiguration.appName} do its job...`,
};
