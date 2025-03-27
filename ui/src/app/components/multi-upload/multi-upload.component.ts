import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { extractRawText } from 'mammoth';
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
  @Input() accept: string =
    '.js,.ts,.tsx,.jsx,.html,.css,.json,.xml,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.swift';
  @Input() buttonContent: string = 'Upload Code Files';

  @Output() fileContent = new EventEmitter<string>();
  @Output() filesList = new EventEmitter<string[]>();
  @ViewChild('fileInput') fileInput: any;

  files: string[] = [];
  allFilesContent: string = '';
  private toastService = inject(ToasterService);

  ngAfterViewInit(): void {
    this.clearFileInput();
  }

  ngOnDestroy(): void {
    this.clearFileInput();
  }

  private clearFileInput(): void {
    this.files = [];
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.files = [];
    this.allFilesContent = '';
    const errorFiles: string[] = [];

    Array.from(input.files).forEach((file, index) => {
      if (file.size > 0) {
        this.files.push(file.name);
        this.processFile(file, index);
      } else {
        errorFiles.push(file.name);
      }
    });

    if (errorFiles.length) {
      this.toastService.showError(`Empty file(s): ${errorFiles.join(', ')}`);
      this.clearFileInput();
    }
  }

  private processFile(file: File, index: number): void {
    if (file.name.toLowerCase().endsWith('.docx')) {
      file
        .arrayBuffer()
        .then((buffer) => extractRawText({ arrayBuffer: buffer }))
        .then((result) =>
          this.handleFileContent(file.name, result.value, index),
        )
        .catch((error) =>
          this.toastService.showError(
            `Error reading ${file.name}: ${error.message}`,
          ),
        );
    } else {
      const reader = new FileReader();
      reader.onload = (event) =>
        this.handleFileContent(
          file.name,
          event.target?.result as string,
          index,
        );
      reader.readAsText(file);
    }
  }

  private handleFileContent(
    fileName: string,
    content: string,
    index: number,
  ): void {
    this.allFilesContent += `${fileName}\n\n${content}\n\n`;
    if (index === this.files.length - 1) {
      this.fileContent.emit(this.allFilesContent);
      this.filesList.emit(this.files);
    }
    this.toastService.showSuccess(`${fileName} added successfully!`);
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }
}
