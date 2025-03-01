import { Clipboard } from '@angular/cdk/clipboard';
import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class ClipboardService {
  constructor(private logger: NGXLogger, private clipboard: Clipboard) {}

  public copyToClipboard(data: string | object): boolean {
    if (data === null || data === undefined) {
      return false;
    }

    try {
      let contentToCopy: string;

      if (typeof data === 'object') {
        contentToCopy = JSON.stringify(data);
      } else {
        contentToCopy = data;
      }

      return this.clipboard.copy(contentToCopy);
    } catch (error) {
      this.logger.error('Failed to copy to clipboard:', error);
      return false;
    }
  }
}
