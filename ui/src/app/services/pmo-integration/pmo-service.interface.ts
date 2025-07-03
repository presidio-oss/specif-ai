import { Ticket } from './pmo-integration.service';

export interface PmoConnectionStatus {
  isConnected: boolean;
  errorMessage?: string;
}

export interface PmoService {
  /**
   * Configure the PMO service with credentials and connection details
   * Gets configuration from project metadata
   */
  configure(): Promise<void>;

  /**
   * Get features hierarchy from the PMO system
   * Returns a hierarchical structure of tickets (Features -> User Stories -> Tasks)
   */
  getWorkPlanItemsHierarchy(): Promise<Ticket[]>;

  /**
   * Validate PMO credentials and connection
   * Gets configuration from project metadata
   */
  validateCredentials(): Promise<{ isValid: boolean; errorMessage?: string }>;
}
