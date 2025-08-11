import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { truncateMarkdown } from 'src/app/utils/markdown.utils';
import { IProjectMetadata } from 'src/app/model/interfaces/projects.interface';
import { PmoUrlService } from '../../../services/pmo-url/pmo-url.service';
import { ToasterService } from '../../../services/toaster/toaster.service';
import { ButtonComponent } from '../button/button.component';
import { heroArrowTopRightOnSquare } from '@ng-icons/heroicons/outline';
import { provideIcons } from '@ng-icons/core';

@Component({
  selector: 'app-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
  standalone: true,
  imports: [NgIf, RichTextEditorComponent, ButtonComponent],
  providers: [
    provideIcons({
      heroArrowTopRightOnSquare,
    }),
  ],
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

  constructor(
    private pmoUrlService: PmoUrlService,
    private toast: ToasterService,
  ) {}

  getPmoLogo(): string | null {
    const selectedPmoTool =
      this.payload?.metadata?.integration?.selectedPmoTool;

    if (selectedPmoTool === 'ado') {
      return 'assets/img/logo/azure_devops_logo.svg';
    } else if (selectedPmoTool === 'jira') {
      return 'assets/img/logo/mark_gradient_blue_jira.svg';
    }

    return null;
  }

  /**
   * Handle PMO ID click to open the item in external PMO tool
   * @param pmoId The PMO ID (Jira ticket key or ADO work item ID)
   */
  async onPmoIdClick(pmoId: string | undefined): Promise<void> {
    const selectedPmoTool =
      this.payload?.metadata?.integration?.selectedPmoTool;
    if (!selectedPmoTool || !pmoId || !this.payload.metadata) {
      return;
    }
    try {
      await this.pmoUrlService.openPmoItem(
        pmoId,
        selectedPmoTool as 'jira' | 'ado',
        this.payload.metadata,
      );
    } catch (error) {
      this.toast.showError(
        `Failed to open ${selectedPmoTool.toUpperCase()} item: ${pmoId}`,
      );
    }
  }
}
