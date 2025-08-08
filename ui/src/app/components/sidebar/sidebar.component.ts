import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AsyncPipe, NgClass, NgForOf, NgIf } from '@angular/common';
import { NgIconComponent } from '@ng-icons/core';
import { BadgeComponent } from '../core/badge/badge.component';
import { ButtonComponent } from '../core/button/button.component';
import { Router } from '@angular/router';
import { getDescriptionFromInput } from '../../utils/common.utils';
import { FILTER_STRINGS } from '../../constants/app.constants';
import { RequirementTypeEnum } from 'src/app/model/enum/requirement-type.enum';
import { IconPairingEnum } from '../../model/enum/file-type.enum';
import { ISelectedFolder } from 'src/app/model/interfaces/IList';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    AsyncPipe,
    BadgeComponent,
    ButtonComponent,
    NgIconComponent,
    NgForOf,
  ],
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() directories: { name: string; children: string[] }[] = [];
  @Input() selectedFolder: ISelectedFolder | null = null;
  @Input() appName: string = '';
  @Input() haiFolder: { key: string; value: string }[] = [];
  @Input() isCreatingSolution: boolean = false;
  newModuleFlag: boolean = false;

  ngOnInit(): void {
    this.newModuleFlag = localStorage.getItem('NEW_MODULE_FLAG') === 'true';
    if (!this.newModuleFlag) {
      localStorage.setItem('NEW_MODULE_FLAG', 'false');
    }
  }

  ngOnDestroy(): void {
    localStorage.setItem('NEW_MODULE_FLAG', 'true');
  }
  
  @Output() folderSelected = new EventEmitter<any>();
  @Output() addDocument = new EventEmitter<string>();
  @Output() addBPDocument = new EventEmitter<void>();
  @Output() navigateToTestCases = new EventEmitter<void>();

  constructor(private router: Router) {}

  selectFolder(folder: any): void {
    this.folderSelected.emit(folder);
  }

  navigateToAdd(folderName: string): void {
    this.addDocument.emit(folderName);
  }

  navigateToBPAdd(): void {
    this.addBPDocument.emit();
  }

  navigateToTestCasesHome(): void {
    this.navigateToTestCases.emit();
  }

  getDescription(input: string | undefined): string | null {
    return getDescriptionFromInput(input);
  }

  directoryContainsFolder(
    folderName: string,
    directories: { name: string; children: string[] }[]
  ): boolean {
    return directories.some(
      (dir) => dir.name.includes(folderName) && !this.isArchived(dir)
    );
  }

  isArchived(directories: { name: string; children: string[] }): boolean {
    if (directories.name === RequirementTypeEnum.PRD)
      return directories.children
        .filter((child) => child.includes(FILTER_STRINGS.BASE))
        .every((child) => child.includes(FILTER_STRINGS.ARCHIVED));
    return directories.children.every((child) =>
      child.includes(FILTER_STRINGS.ARCHIVED)
    );
  }

  getIconName(key: string): string {
    const icon = IconPairingEnum[key as keyof typeof IconPairingEnum];
    return icon || 'defaultIcon';
  }
}
