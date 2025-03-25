import { Injectable } from '@angular/core';
import { ISolutionResponse, ICreateSolutionRequest } from '../../model/interfaces/projects.interface';
import { ElectronService } from '../../electron-bridge/electron.service';

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  constructor(private electronService: ElectronService) {}

  async generateDocumentsFromLLM(data: ICreateSolutionRequest): Promise<ISolutionResponse> {
    return this.electronService.createSolution(data);
  }
}
