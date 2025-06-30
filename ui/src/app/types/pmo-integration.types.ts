import { Type, ComponentRef } from '@angular/core';

export interface PmoIntegrationConfig {
  id: string;
  name: string;
  displayName: string;
  logoPath: string;
  component: Type<any> | ComponentRef<any>;
  isEnabled: boolean;
  order: number;
}

export interface PmoConnectionStatus {
  [key: string]: boolean;
}

export interface PmoIntegrationData {
  [key: string]: any;
}

export interface PmoIntegrationEvent {
  type: string;
  isConnected: boolean;
  data?: any;
}
