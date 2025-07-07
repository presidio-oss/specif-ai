import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';
import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';

@Component({
  selector: 'app-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  standalone: true,
  imports: [NgIf, RichTextEditorComponent],
})
export class ListItemComponent {
  @Input() payload!: {
    name: string;
    description: string;
    id: string;
    pmoId?: string;
    metadata?: IProjectMetadata;
  };
  @Input() tag!: string;

  getPmoLogo(): string | null {
    console.log(this.payload);
    const selectedPmoTool =
      this.payload?.metadata?.integration?.selectedPmoTool;

    if (selectedPmoTool === 'ado') {
      return 'assets/img/logo/azure_devops_logo.svg';
    } else if (selectedPmoTool === 'jira') {
      return 'assets/img/logo/mark_gradient_blue_jira.svg';
    }

    return null;
  }
}
