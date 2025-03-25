import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SetCurrentConfig } from '../../store/user-stories/user-stories.actions';
import { NGXLogger } from 'ngx-logger';
import { Store } from '@ngxs/store';

import {
  AddBreadcrumb,
  DeleteBreadcrumb,
} from '../../store/breadcrumb/breadcrumb.actions';
import { FeatureService } from '../../services/feature/feature.service';
import { IFlowChartRequest } from '../../model/interfaces/IBusinessProcess';
import {
  GetFlowChartAction,
  SetFlowChartAction,
} from '../../store/business-process/business-process.actions';
import { ProjectsState } from '../../store/projects/projects.state';
import { BusinessProcessState } from '../../store/business-process/business-process.state';

import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import panzoom from 'panzoom';
import { LoadingService } from '../../services/loading.service';
import { ButtonComponent } from '../../components/core/button/button.component';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-business-process-flow',
  templateUrl: './business-process-flow.component.html',
  styleUrls: ['./business-process-flow.component.scss'],
  standalone: true,
  imports: [ButtonComponent, NgIf],
})
export class BusinessProcessFlowComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  router = inject(Router);
  logger = inject(NGXLogger);
  store = inject(Store);
  activatedRoute = inject(ActivatedRoute);

  @ViewChild('mermaidContainer', { static: false })
  mermaidContainer!: ElementRef;
  private panzoomInstance: any;
  selectedProject$ = this.store.select(ProjectsState.getSelectedProject);
  selectedProcessFlowDiagram$ = this.store.select(
    BusinessProcessState.getSelectedFlowChart,
  );

  errorBlockVisible: boolean = false;
  errorMessage: string =
    "It looks like the description you entered doesn't contain enough details to generate a valid process flow. Please Provide a more relevant description or select relevant PRDs and BRDs to generate the process flow.";
  mode: string | null = 'view';
  projectId: string = '';
  projectName: string = '';
  folderName: string = '';
  fileName: string = '';
  selectedRequirement: any = {};
  data: any = {};
  selectedBusinessProcess = {
    diagram: '',
    download: false,
    regenerate: false,
  };
  requirementId: string = '';
  currentLabel: string = '';

  constructor(
    private featureService: FeatureService,
    private loadingService: LoadingService,
  ) {
    this.mode = this.activatedRoute.snapshot.paramMap.get('mode');
    const navigation = this.router.getCurrentNavigation();
    this.projectId = navigation?.extras?.state?.['id'];
    this.folderName = navigation?.extras?.state?.['folderName'];
    this.fileName = navigation?.extras?.state?.['fileName'];
    this.selectedRequirement = navigation?.extras?.state?.['req'];
    this.data = navigation?.extras?.state?.['data'];
    this.requirementId = this.fileName.split('-')[0];
    this.currentLabel = `${this.requirementId ?? ''} - Flow chart`;
    // Setting current config in state.
    this.store.dispatch(
      new SetCurrentConfig({
        projectId: this.projectId,
        folderName: this.folderName,
        fileName: this.fileName,
        reqId: this.requirementId,
        featureId: '',
      }),
    );

    // Add folder breadcrumb
    // Eg: BP
    this.store.dispatch(
      new AddBreadcrumb({
        label: this.folderName,
        url: `/apps/${this.projectId}`,
        state: {
          data: this.data,
          selectedFolder: {
            title: this.folderName,
            id: this.projectId,
            metadata: this.data,
          },
        },
      }),
    );

    // Add current BP flow chart breadcrumb
    // Eg: BP1 - Flow chart
    this.store.dispatch(
      new AddBreadcrumb({
        label: `${this.requirementId ?? ''} - Flow chart`,
        url: this.router.url,
        state: {
          data: this.data,
          id: this.projectId,
          folderName: this.folderName,
        },
      }),
    );
  }

  ngOnInit() {
    this.loadingService.setLoading(true);
    // Get current project name.
    this.selectedProject$.subscribe((selectedProj) => {
      this.projectName = selectedProj;
    });
    // Get Flow chart for selected business process.
    this.store.dispatch(
      new GetFlowChartAction(
        `${this.projectName}/${this.folderName}/${this.fileName}`,
      ),
    );
    // Initialize Mermaid configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default', // Ensure consistent theme across diagrams
      flowchart: {
        useMaxWidth: true, // Ensure diagrams respect container width
      },
    });
    setTimeout(() => {
      this.fetchProcessFlowDiagram();
    }, 1000);
  }

  ngAfterViewInit(): void {
    this.initializePanZoom();
  }

  async fetchProcessFlowDiagram() {
    this.selectedProcessFlowDiagram$.subscribe(async (response) => {
      this.selectedBusinessProcess.diagram = response;
    });
    if (!this.selectedBusinessProcess.diagram) {
      await this.generateProcessFlowDiagram();
    } else {
      await this.setFlowDiagram(this.selectedBusinessProcess.diagram);
    }
  }

  async setFlowDiagram(flowChartSyntax: string) {
    const element: any = document.querySelector('.mermaid');
    try {
      const { svg } = await mermaid.render('mermaid', `${flowChartSyntax}`);
      element!.innerHTML = svg;
      this.selectedBusinessProcess.download = true;
      this.loadingService.setLoading(false);
      this.selectedBusinessProcess.regenerate = true;
      mermaid.contentLoaded();
    } catch (error) {
      console.error('Syntax error while rendering mermaid diagram:', error);
      const element = document.getElementById('dmermaid');
      if (element) {
        element.style.display = 'none';
      }
      this.errorBlockVisible = true;
      this.selectedBusinessProcess.regenerate = true;
      this.loadingService.setLoading(false);
      this.selectedBusinessProcess.download = false;
    }
  }

  async generateProcessFlowDiagram() {
    this.errorBlockVisible = false;
    const request: IFlowChartRequest = {
      id: this.requirementId,
      title: this.selectedRequirement.title,
      description: this.selectedRequirement.requirement,
      selectedBRDs: this.selectedRequirement.selectedBRDs,
      selectedPRDs: this.selectedRequirement.selectedPRDs,
    };
    
    this.featureService.addFlowChart(request)
      .then((response: any) => {
        this.store.dispatch(
          new SetFlowChartAction(
            `${this.projectName}/${this.folderName}/${this.fileName}`,
            response.flowChartData,
          ),
        );
        this.setFlowDiagram(response.flowChartData);
      })
      .catch((error) => {
        console.error('Error from BE while generating flow chart', error);
        this.errorBlockVisible = true;
      });
  }

  private getSvgWithDimensions() {
    const element: any = document.querySelector('.mermaid');
    const svgElement = element?.querySelector('svg');

    if (!svgElement) {
      throw new Error('SVG element not found');
    }

    const viewBox =
      svgElement.getAttribute('viewBox')?.split(' ').map(Number) || [];
    const width = viewBox[2] || svgElement.width.baseVal.value;
    const height = viewBox[3] || svgElement.height.baseVal.value;

    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute('width', width.toString());
    clonedSvg.setAttribute('height', height.toString());

    return { svg: clonedSvg, width, height };
  }

  private prepareSvgForExport(svg: SVGElement): string {
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBase64 = btoa(decodeURIComponent(encodeURIComponent(svgData)));
    return `data:image/svg+xml;base64,${svgBase64}`;
  }

  private createAndDownloadPng(
    img: HTMLImageElement,
    width: number,
    height: number,
    scaleFactor: number,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.drawImage(img, 0, 0);

      const pngData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${this.projectName}-${this.requirementId}-process-flow.png`;
      link.href = pngData;
      link.click();
    }
  }

  downloadDiagram(): void {
    if (!this.mermaidContainer?.nativeElement) return;

    this.loadingService.setLoading(true);

    try {
      const { svg, width, height } = this.getSvgWithDimensions();
      const svgDataUrl = this.prepareSvgForExport(svg);

      const scaleFactor = 10; // For image quality
      const img = new Image();

      img.onload = () => {
        this.createAndDownloadPng(img, width, height, scaleFactor);
        this.loadingService.setLoading(false);
      };

      img.src = svgDataUrl;
    } catch (error) {
      console.error('Error during diagram export:', error);
      this.loadingService.setLoading(false);
    }
  }

  initializePanZoom(): void {
    if (this.mermaidContainer && this.mermaidContainer.nativeElement) {
      const element: any = document.querySelector('.mermaid');
      this.panzoomInstance = panzoom(element, {
        zoomSpeed: 1,
        maxZoom: 5,
        minZoom: 0.5,
        initialZoom: 1,
        bounds: true,
        boundsPadding: 0.1,
      });
    }
  }

  resetZoom(): void {
    if (this.panzoomInstance) {
      this.panzoomInstance.moveTo(0, 0);
      this.panzoomInstance.zoomAbs(0, 0, 1);
    }
  }

  ngOnDestroy(): void {
    this.store.dispatch(new DeleteBreadcrumb(this.currentLabel));
  }
}
