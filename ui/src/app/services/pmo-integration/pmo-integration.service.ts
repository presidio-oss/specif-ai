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
  reqId: string;
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
