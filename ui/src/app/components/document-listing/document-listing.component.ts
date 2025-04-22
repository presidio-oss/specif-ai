import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { of, BehaviorSubject, Observable, Subscription } from 'rxjs';
import { SearchService } from '../../services/search/search.service';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { IList } from '../../model/interfaces/IList';
import { Document } from 'src/app/model/interfaces/projects.interface';
import { DocumentTypeMappingEnum } from 'src/app/model/enum/requirement-type.enum';
import { processPRDContentForView } from '../../utils/prd.utils';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';
import { getDescriptionFromInput } from '../../utils/common.utils';
import { SearchInputComponent } from '../core/search-input/search-input.component';
import { BadgeComponent } from '../core/badge/badge.component';
import { ButtonComponent } from '../core/button/button.component';
import { NgIconComponent } from '@ng-icons/core';
import { MatMenuModule } from '@angular/material/menu';
import { FOLDER_REQUIREMENT_TYPE_MAP } from 'src/app/constants/app.constants';
import { EXPORT_FILE_FORMATS, ExportFileFormat } from 'src/app/constants/export.constants';
import { RichTextEditorComponent } from '../core/rich-text-editor/rich-text-editor.component';
import { NgIf, AsyncPipe, NgForOf, NgClass } from '@angular/common';
import { ExportDropdownComponent } from 'src/app/export-dropdown/export-dropdown.component';
import { ExportRequirementData } from 'src/app/store/projects/projects.actions';
import { Store } from '@ngxs/store';

@Component({
  selector: 'app-document-listing',
  templateUrl: './document-listing.component.html',
  styleUrls: ['./document-listing.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    NgForOf,
    NgClass,
    BadgeComponent,
    ButtonComponent,
    NgIconComponent,
    MatMenuModule,
    RichTextEditorComponent,
    SearchInputComponent,
    NgClass,
    ExportDropdownComponent
],
})
export class DocumentListingComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @Input() documents: Document[] = [];
  @Input() selectedType: string = '';

  documentTypes = DocumentTypeMappingEnum;
  @ViewChild(SearchInputComponent) searchInput!: SearchInputComponent;
  private scrollContainer: HTMLElement | null = null;
  private searchTerm$ = new BehaviorSubject<string>('');
  filteredDocumentList$!: Observable<(IList & { id: string; formattedRequirement: string | null })[]>;
  private subs = new Subscription();

  // For Export Dropdown Options
  exportOptions: { label: string; callback: () => void }[] = [];
  exportedFolderName: string = '';

  currentRoute: string;

  constructor(
    private searchService: SearchService,
    private router: Router,
    private toast: ToasterService,
    private store: Store, 
  ) {
    this.currentRoute = this.router.url;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['documents'] || changes['selectedType']) {
      this.buildList();
    }
  }

  ngOnInit() {
    // ensure initial build
    this.buildList();
  }

  ngAfterViewInit() {
    this.scrollContainer = document.querySelector('.doc-section-height');
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.saveScrollPosition.bind(this));
      const pos = sessionStorage.getItem('scrollPosition');
      if (pos) this.scrollContainer.scrollTop = parseInt(pos, 10);
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.saveScrollPosition.bind(this));
    }
  }

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  private buildList() {
    // debug: inspect inputs
    console.debug('DocumentListing buildList', {
      selectedType: this.selectedType,
      totalDocs: this.documents.length,
    });

    // 1) filter by matching type (case-insensitive) and non-deleted
    const docsOfType = this.documents.filter(
      d =>
        d.documentTypeId?.toLowerCase() === this.selectedType?.toLowerCase() &&
        !d.isDeleted
    );

    console.debug(`Found ${docsOfType.length} docs for type`, this.selectedType);

    // 2) map to IList + formattedRequirement
    const items = docsOfType.map(d => {
      const base: IList = {
        fileName: String(d.id),
        folderName: d.documentTypeId,
        content: {
          requirement: d.description,
          title: d.name,
          epicTicketId: d.jiraId ?? undefined,
        }
      };
      return {
        ...base,
        id: String(d.id),
        formattedRequirement: this.formatRequirementForView(
          base.content.requirement,
          base.folderName
        )
      };
    });

    // 3) plug into search pipe. initial term is '', so all items should show
    this.filteredDocumentList$ = this.searchService.filterItems(
      of(items),
      this.searchTerm$,
      doc => [doc.fileName, doc.content.title, doc.content.epicTicketId ?? '']
    );
  }

  private saveScrollPosition() {
    if (this.scrollContainer) {
      sessionStorage.setItem('scrollPosition', String(this.scrollContainer.scrollTop));
    }
  }

  navigateToEdit(item: any) {
    const url =
      item.folderName === DocumentTypeMappingEnum.BP ? '/bp-edit' : '/edit';
    this.router.navigate([url], {
      state: {
        data: item,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
      },
    });
  }

  navigateToUserStories(item: any) {
    this.router.navigate(['/user-stories', item.id], {
      state: {
        data: item,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
      },
    });
  }

  navigateToBPFlow(item: any) {
    this.router.navigate(['/bp-flow/view', item.id], {
      state: {
        data: item,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
        selectedFolder: {
          title: item.folderName,
          id: item.id,
          metadata: item,
        },
      },
    });
  }

  getDescription(input?: string): string | null {
    return getDescriptionFromInput(input);
  }

  private formatRequirementForView(
    requirement?: string,
    folderName?: string
  ): string | null {
    if (!requirement) return null;
    if (folderName === DocumentTypeMappingEnum.PRD) {
      return processPRDContentForView(requirement, 150);
    }
    return truncateMarkdown(requirement, {
      maxChars: 180,
      ellipsis: true,
    });
  }

  exportDocumentList(folder: string, format: ExportFileFormat) {
    const requirementType = FOLDER_REQUIREMENT_TYPE_MAP[folder];

    this.store.dispatch(
      new ExportRequirementData(requirementType, {
        type: format,
      }),
    );
  }

  getExportOptions(folderName: string) {
    if (!folderName) {
      console.warn('Folder name is undefined');
      return [];
    }

    if (this.exportedFolderName === folderName) {
      return this.exportOptions;
    }
        
    const exportJson = () => {
      this.exportDocumentList(folderName, EXPORT_FILE_FORMATS.JSON);
    };

    const exportExcel = () => {
      this.exportDocumentList(folderName, EXPORT_FILE_FORMATS.EXCEL);
    };

    this.exportedFolderName = folderName;
    this.exportOptions = [
      {
        label: 'Copy JSON to Clipboard',
        callback: exportJson.bind(this)
      },
      {
        label: 'Download as Excel (.xlsx)',
        callback: exportExcel.bind(this)
      }
    ];
    return this.exportOptions;
  }
}
