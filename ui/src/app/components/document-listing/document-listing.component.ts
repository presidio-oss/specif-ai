import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../../store/projects/projects.state';
import { BehaviorSubject, combineLatest, Observable, Subscription, first } from 'rxjs';
import { BulkReadFiles, ExportRequirementData } from '../../store/projects/projects.actions';
import {
  getDescriptionFromInput,
  truncateWithEllipsis,
} from '../../utils/common.utils';
import { filter, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { IList } from '../../model/interfaces/IList';
import { RequirementTypeEnum } from '../../model/enum/requirement-type.enum';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { BadgeComponent } from '../core/badge/badge.component';
import { ButtonComponent } from '../core/button/button.component';
import { NgIconComponent } from '@ng-icons/core';
import { SearchInputComponent } from '../core/search-input/search-input.component';
import { SearchService } from '../../services/search/search.service';
import { APP_INFO_COMPONENT_ERROR_MESSAGES } from '../../constants/messages.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';
import { MatMenuModule } from '@angular/material/menu';
import { FOLDER_REQUIREMENT_TYPE_MAP } from 'src/app/constants/app.constants';
import { ExportFileFormat } from 'src/app/constants/export.constants';
import { RichTextEditorComponent } from '../core/rich-text-editor/rich-text-editor.component';
import { processPRDContentForView } from '../../utils/prd.utils';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';

@Component({
  selector: 'app-document-listing',
  templateUrl: './document-listing.component.html',
  styleUrls: ['./document-listing.component.scss'],
  standalone: true,
  imports: [
    NgIf,
    AsyncPipe,
    BadgeComponent,
    ButtonComponent,
    NgIconComponent,
    NgForOf,
    SearchInputComponent,
    MatMenuModule,
    RichTextEditorComponent,
    NgClass
],
})
export class DocumentListingComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(SearchInputComponent) searchInput!: SearchInputComponent;

  loadingProjectFiles$ = this.store.select(ProjectsState.loadingProjectFiles);
  requirementTypes: any = RequirementTypeEnum;
  private searchTerm$ = new BehaviorSubject<string>('');

  appInfo: any = {};
  originalDocumentList$: Observable<IList[]> = this.store.select(ProjectsState.getSelectedFileContents);
  documentList$!: Observable<(IList & { id: string; formattedRequirement: string | null })[]>;
  filteredDocumentList$!: Observable<(IList & { id: string; formattedRequirement: string | null })[]>;
  selectedFolder: any = {};
  private combinedSubject = new BehaviorSubject<{ title: string; id: string }>({ title: '', id: '' });
  private subscription: Subscription = new Subscription();
  private scrollContainer: HTMLElement | null = null;

  @Input() set folder(value: { title: string; id: string; metadata: any }) {
    this.appInfo = value.metadata;
    this.selectedFolder = value;
    this.combinedSubject.next({ title: value.title, id: value.id });

    // Reset scroll position when a new folder is set
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }

    // Reset search input when a new folder is set
    if (this.searchInput) {
      this.searchInput.clearSearch();
    }
  }

  currentRoute: string;
  constructor(
    private store: Store, 
    private router: Router, 
    private searchService: SearchService, 
    private toast: ToasterService) {
    this.currentRoute = this.router.url;
    this.documentList$ = combineLatest([
      this.originalDocumentList$,
      this.combinedSubject,
    ]).pipe(
      map(([documents, folder]) =>
        documents.map((doc) => ({
          ...doc,
          id: folder.id,
          formattedRequirement: this.formatRequirementForView(doc.content?.requirement, doc.folderName)
        })),
      ),
    );

    this.filteredDocumentList$ = this.searchService.filterItems(
      this.documentList$,
      this.searchTerm$,
      (doc) => [doc.fileName, doc.content?.title],
    );
  }

  onSearch(term: string) {
    this.searchTerm$.next(term);
  }

  ngOnInit() {
    this.subscription.add(
      combineLatest([this.combinedSubject, this.loadingProjectFiles$])
        .pipe(
          filter(([folder, isLoading]) => !!folder && !isLoading),
          switchMap(([folder, _]) => {
            return this.store.dispatch(new BulkReadFiles(folder.title));
          }),
        )
        .subscribe(),
    );
  }

  ngAfterViewInit() {
    // Set up the scroll container reference to the correct element
    this.scrollContainer = document.querySelector('.doc-section-height');

    // Add scroll event listener to the scrollable container
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', () => {
        this.saveScrollPosition();
      });
    }

    // Restore scroll position if available
    this.restoreScrollPosition();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.saveScrollPosition();
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.saveScrollPosition.bind(this)); // Clean up event listener
    }
  }

  private saveScrollPosition() {
    if (this.scrollContainer) {
      const scrollY = this.scrollContainer.scrollTop;
      sessionStorage.setItem('scrollPosition', scrollY.toString());
    }
  }

  private restoreScrollPosition() {
    const savedScrollPosition = sessionStorage.getItem('scrollPosition');
    if (savedScrollPosition && this.scrollContainer) {
      this.scrollContainer.scrollTop = parseInt(savedScrollPosition, 10);
    }
  }

  navigateToEdit({ id, folderName, fileName, content }: any) {
    const url = folderName === this.requirementTypes.BP ? '/bp-edit' : '/edit';
    this.router.navigate([url], {
      state: { data: this.appInfo, id, folderName, fileName, req: content },
    });
  }

  navigateToUserStories(item: any) {
    this.router.navigate(['/user-stories', item.id], {
      state: {
        data: this.appInfo,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
      },
    });
  }

  navigateToAdd(id: any, folderName: any) {
    if (folderName === this.requirementTypes.BP) {
      // Check if any non-archived PRD or BRD exists
      this.store.select(ProjectsState.getProjectsFolders).pipe(first()).subscribe(directories => {
        const prdDir = directories.find(dir => dir.name === 'PRD');
        const brdDir = directories.find(dir => dir.name === 'BRD');

        // For PRD, only check base files that aren't archived
        const hasPRD = prdDir && prdDir.children
          .filter(child => child.includes('-base.json'))
          .some(child => !child.includes('-archived'));

        // For BRD, only check base files that aren't archived
        const hasBRD = brdDir && brdDir.children
          .filter(child => child.includes('-base.json'))
          .some(child => !child.includes('-archived'));

        if (!hasPRD && !hasBRD) {
          this.toast.showWarning(APP_INFO_COMPONENT_ERROR_MESSAGES.REQUIRES_PRD_OR_BRD);
          return;
        }

        this.router.navigate(['/bp-add'], {
          state: {
            data: this.appInfo,
            id,
            folderName,
            breadcrumb: {
              name: 'Add Document',
              link: this.currentRoute,
              icon: 'add',
            },
          },
        });
      });
    } else {
      this.router.navigate(['/add'], {
        state: {
          data: this.appInfo,
          id,
          folderName,
          breadcrumb: {
            name: 'Add Document',
            link: this.currentRoute,
            icon: 'add',
          },
        },
      });
    }
  }

  navigateToBPFlow(item: any) {
    this.router.navigate(['/bp-flow/view', item.id], {
      state: {
        data: this.appInfo,
        id: item.id,
        folderName: item.folderName,
        fileName: item.fileName,
        req: item.content,
        selectedFolder: {
          title: item.folderName,
          id: this.appInfo.id,
          metadata: this.appInfo,
        },
      },
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

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  private formatRequirementForView(requirement: string | undefined, folderName: string): string | null {
    if (!requirement) return null;
    
    const requirementType = FOLDER_REQUIREMENT_TYPE_MAP[folderName];

    if (requirementType === this.requirementTypes.PRD) {
      return processPRDContentForView(requirement, 150); // 150 chars per section
    }

    return truncateMarkdown(requirement, {
      maxChars: 180,
      ellipsis: true,
    });
  }
}
