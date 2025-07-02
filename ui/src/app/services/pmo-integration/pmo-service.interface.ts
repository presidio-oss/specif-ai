import { Ticket } from './pmo-integration.service';

export interface PmoConnectionStatus {
  isConnected: boolean;
  organization?: string;
  projectName?: string;
  hasValidCredentials?: boolean;
  errorMessage?: string;
}

export interface PmoService {
  /**
   * Configure the PMO service with credentials and connection details
   */
  configure(config: any): void;

  /**
   * Get features hierarchy from the PMO system
   * Returns a hierarchical structure of tickets (Features -> User Stories -> Tasks)
   */
  getFeaturesHierarchy(): Promise<Ticket[]>;

  /**
   * Validate PMO credentials and connection
   */
  validateCredentials(config: any): Promise<{ isValid: boolean; errorMessage?: string }>;
}
