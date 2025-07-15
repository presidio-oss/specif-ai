import { EventEmitter, Signal } from '@angular/core';
import { IProjectMetadata } from '../model/interfaces/projects.interface';

export interface PmoIntegrationBase {
  projectId: string;
  projectMetadata: IProjectMetadata;
  connectionStatusChange: EventEmitter<boolean>;

  isConnected: Signal<boolean>;
  isProcessing: Signal<boolean>;

  onConnect(): void;
  onDisconnect(): void;

  ngOnInit?(): void;
}
