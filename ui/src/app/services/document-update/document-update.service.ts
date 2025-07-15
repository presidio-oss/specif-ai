import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ToasterService } from '../toaster/toaster.service';
import { DocumentUpdateRequest, DocumentUpdateResponse } from '../../electron-bridge/electron.interface';

/**
 * Service for handling document updates
 * Provides methods for searching and replacing text in documents
 * Simplified version that directly uses the Electron IPC API
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUpdateService {
  constructor(
    private electronService: ElectronService,
    private toasterService: ToasterService
  ) {}

  /**
   * Apply a document update request
   * @param request The update request to apply
   * @returns A promise that resolves with the update response
   */
  public applyUpdate(request: DocumentUpdateRequest): Promise<DocumentUpdateResponse> {
    return this.electronService.updateDocument(request);
  }
}
