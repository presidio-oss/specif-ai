import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';

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
    jiraTicketId?: string;
  };
  @Input() tag!: string;
}
