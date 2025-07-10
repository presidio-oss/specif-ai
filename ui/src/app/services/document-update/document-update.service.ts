import { Injectable } from '@angular/core';
import { ElectronService } from '../../electron-bridge/electron.service';
import { Observable, Subject } from 'rxjs';
import { ToasterService } from '../toaster/toaster.service';
import { DocumentUpdateRequest, DocumentUpdateResponse } from '../../electron-bridge/electron.interface';
import { IpcRendererEvent } from 'electron';

/**
 * Service for handling document updates
 * Provides methods for searching and replacing text in documents
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUpdateService {
  private updateSubject = new Subject<DocumentUpdateResponse>();
  public updates$ = this.updateSubject.asObservable();

  constructor(
    private electronService: ElectronService,
    private toasterService: ToasterService
  ) {
    // Set up listener for document update events
    if (this.electronService.electronAPI) {
      this.electronService.electronAPI.on('document:*-update', (event: IpcRendererEvent, response: DocumentUpdateResponse) => {
        this.updateSubject.next(response);
      });
    }
  }


  /**
   * Apply a document update request
   * @param request The update request to apply
   * @returns A promise that resolves with the update response
   */
  public applyUpdate(request: DocumentUpdateRequest): Promise<DocumentUpdateResponse> {
    return this.electronService.updateDocument(request);
  }

  /**
   * Listen for document update events for a specific request ID
   * @param requestId The request ID to listen for
   * @param callback The callback to call when an update event is received
   */
  public listenForUpdate(requestId: string, callback: (response: DocumentUpdateResponse) => void): void {
    if (this.electronService.electronAPI) {
      const listener = (event: IpcRendererEvent, response: DocumentUpdateResponse) => {
        if (response.requestId === requestId) {
          callback(response);
          this.electronService.electronAPI?.removeListener(`document:${requestId}-update`, listener);
        }
      };

      this.electronService.electronAPI.on(`document:${requestId}-update`, listener);
    }
  }

  /**
   * Stop listening for document update events for a specific request ID
   * @param requestId The request ID to stop listening for
   * @param listener The listener to remove
   */
  public stopListeningForUpdate(requestId: string, listener: (event: IpcRendererEvent, response: DocumentUpdateResponse) => void): void {
    if (this.electronService.electronAPI) {
      this.electronService.electronAPI.removeListener(`document:${requestId}-update`, listener);
    }
  }
}
