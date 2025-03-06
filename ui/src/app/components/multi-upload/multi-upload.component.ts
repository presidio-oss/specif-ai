import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ButtonComponent } from '../core/button/button.component';
import { ToasterService } from '../../services/toaster/toaster.service';
import { NgIconComponent } from '@ng-icons/core';

@Component({
  selector: 'app-multi-upload',
  templateUrl: './multi-upload.component.html',
  styleUrls: ['./multi-upload.component.scss'],
  standalone: true,
  imports: [NgIf, NgForOf, ButtonComponent, NgIconComponent],
})
export class MultiUploadComponent implements AfterViewInit, OnDestroy {
  files: string[] = [];
  allFilesContent: any = '';
  @Output() fileContent = new EventEmitter<string>();
  @Output() filesList = new EventEmitter<string[]>();
  @ViewChild('fileInput') fileInput: any;

  toastService = inject(ToasterService);

  ngAfterViewInit(): void {
    this.clearFileInput();
  }

  ngOnDestroy(): void {
    this.clearFileInput();
  }

  clearFileInput(): void {
    this.files = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: any): void {
    const selectedFiles = event.target.files;
    if (selectedFiles.length > 0) {
      this.files = [];
      const errorFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        if (selectedFiles[i].size > 0) {
          this.files.push(selectedFiles[i].name);
          this.readFileContent(selectedFiles[i], i);
        } else {
          errorFiles.push(selectedFiles[i].name);
        }
      }
      if (errorFiles.length > 0) {
        this.toastService.showError(`Empty file(s): ${errorFiles.join(', ')}`);
        this.fileInput.nativeElement.value = '';
      }
    }
  }

  readFileContent(file: File, index: number): void {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      this.allFilesContent += file.name + '\n\n' + event.target.result + '\n\n';
      if (index === this.files.length - 1) {
        this.fileContent.emit(this.allFilesContent);
        this.filesList.emit(this.files);
      }
      this.toastService.showSuccess(`${file.name} added successfully!`);
    };
    reader.readAsText(file);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
}
