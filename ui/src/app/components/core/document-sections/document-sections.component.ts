import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { SectionInfo } from 'src/app/utils/section.utils';

@Component({
  selector: 'app-document-sections',
  templateUrl: './document-sections.component.html',
  standalone: true,
  imports: [
    NgClass,
    NgFor,
    NgIf,
  ]
})
export class DocumentSectionsComponent {
  @Input() sections: SectionInfo[] = [];
  @Input() selectedSection: SectionInfo | null = null;
  @Output() sectionSelected = new EventEmitter<string>();
  
  /**
   * Select a section by its ID
   * 
   * @param sectionId The ID of the section to select
   */
  selectSection(sectionId: string): void {
    this.sectionSelected.emit(sectionId);
  }
}
