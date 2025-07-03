import { Injectable, Injector } from '@angular/core';
import { PmoService } from './pmo-service.interface';
import { AdoService } from '../../integrations/ado/ado.service';
import { JiraService } from '../../integrations/jira/jira.service';

@Injectable({
  providedIn: 'root'
})
export class PmoServiceFactory {
  constructor(private injector: Injector) {}

  /**
   * Get the appropriate PMO service based on the type
   * @param pmoType The type of PMO system ('ado' | 'jira')
   * @returns The corresponding PMO service instance
   */
  getPmoService(pmoType: 'ado' | 'jira'): PmoService {
    switch (pmoType) {
      case 'ado':
        return this.injector.get(AdoService);
      case 'jira':
        // Note: JiraService will need to be updated to implement PmoService interface
        return this.injector.get(JiraService) as any; // Temporary cast until JiraService is updated
      default:
        throw new Error(`Unsupported PMO type: ${pmoType}`);
    }
  }

  /**
   * Get all supported PMO types
   */
  getSupportedPmoTypes(): string[] {
    return ['ado', 'jira'];
  }
}
