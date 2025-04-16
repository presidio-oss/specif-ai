import { Injectable } from '@angular/core';
import { ISolutionResponse, ICreateSolutionRequest, ISetRootDirectoryResponse, IProject } from '../../model/interfaces/projects.interface';
import { ElectronService } from '../../electron-bridge/electron.service';

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  constructor(private electronService: ElectronService) {}
  
  async setRootDirectory(): Promise<ISetRootDirectoryResponse> {
    try {
      const result = await this.electronService.setRootDirectory();
      return result;
    } catch (error) {
      console.error('Error setting root directory:', error);
      return {
        success: false,
        error: 'Failed to set root directory',
      };
    }
  }

  async generateDocumentsFromLLM(data: ICreateSolutionRequest): Promise<ISolutionResponse> {
    return this.electronService.createSolution(data);
  }

  async getSolutions(): Promise<IProject[]> {
    try {
      return await this.electronService.getSolutions();
    } catch (error) {
      console.error('Error getting solutions:', error);
      throw error;
    }
  }

  async getsolutionByName(name: string) {
    try {
      const result = await this.electronService.getSolutionByName(name);
      return result;
    } catch (error) {
      console.error('Error getting solution by name:', error);
      throw error;
    }
  }
}