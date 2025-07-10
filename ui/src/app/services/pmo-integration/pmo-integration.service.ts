import { Observable } from 'rxjs';

export interface TicketDetails {
  title: string;
  description: string | null;
}

export interface PmoTicket {
  pmoId: string;
  pmoIssueType: string;
  pmoParentId: string | null;
}

export interface SpecifaiTicket {
  specifaiId: string;
  reqId: string
  specifaiType: string;
  specifaiParentId: string | null;
}

export interface Ticket extends TicketDetails, PmoTicket, SpecifaiTicket {
  child: Ticket[];
  isUpdate?: boolean;
}

export interface PmoTicketCategory {
  newTickets: Array<{
    specifaiId: string;
    title: string;
    description: string;
  }>;
  updateTickets: Array<{
    specifaiId: string;
    pmoId: string;
    title: string;
    description: string;
  }>;
}

/**
 * Abstract service for PMO system integration
 * Handles synchronization between Specifai and PMO systems (JIRA, ADO)
//  */
// export abstract class PmoIntegrationService {
//   /**
//    * Gets tickets under a parent for PMO sync with categorization
//    * @param projectId Specifai project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    */
//   abstract getTicketsForSync(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//   ): Observable<PmoTicketCategory>;

//   /**
//    * Gets tickets from PMO system
//    * @param projectId Specifai project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    */
//   abstract getTicketsFromPmo(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//   ): Observable<PmoTickets[]>;

//   /**
//    * Gets all tickets in Specifai that are mapped to PMO system
//    * @param projectId Specifai project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    * @param ticketIds Optional array of PMO ticket IDs to filter by
//    */
//   abstract getMappedTickets(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//     ticketIds?: string[],
//   ): Observable<PmoTicketMapping[]>;

//   /**
//    * Pulls and syncs selected tickets from PMO to Specifai
//    * @param projectId Specifai Project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    * @param ticketIds PMO ticket IDs to sync
//    */
//   abstract pullFromPmo(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//     ticketIds: string[],
//   ): Observable<PmoSyncResult[]>;

//   /**
//    * Creates new tickets in PMO system
//    * @param projectId Specifai Project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    * @param tickets Array of Specifai tickets to create in PMO
//    */
//   abstract createInPmo(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//     tickets: PmoTickets[],
//   ): Observable<PmoSyncResult[]>;

//   /**
//    * Updates existing tickets in PMO system
//    * @param projectId Specifai Project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    * @param tickets Array of Specifai tickets with PMO mappings to update
//    */
//   abstract updateInPmo(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//     tickets: PmoTickets[],
//   ): Observable<PmoSyncResult[]>;

//   /**
//    * Pushes selected tickets to PMO system (creates new or updates existing)
//    * @param projectId Specifai Project identifier
//    * @param parentId Solution or PRD identifier
//    * @param parentType Type of parent ('solution' | 'prd')
//    * @param tickets Array of Specifai tickets to push
//    * @param options Sync options for create/update operations
//    */
//   abstract pushToPmo(
//     projectId: string,
//     parentId: string,
//     parentType: 'solution' | 'prd',
//     tickets: PmoTickets[],
//     options: PmoSyncOptions,
//   ): Observable<PmoSyncResult[]>;
// }
