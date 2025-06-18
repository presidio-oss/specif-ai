import { Injectable, inject } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { ElectronService } from '../../electron-bridge/electron.service';
import { ITestCaseRequest, ITestCasesResponse } from '../../model/interfaces/test-case/testcase.interface';

@Injectable({
  providedIn: 'root',
})
export class TestCaseService {
  private logger = inject(NGXLogger);
  private electronService = inject(ElectronService);

  async generateTestCases(request: ITestCaseRequest): Promise<ITestCasesResponse> {
    try {
      this.logger.debug('Generating test cases with request:', request);
      
      const response = await this.electronService.createTestCases(request);
      
      this.logger.debug('Test cases generated successfully:', response);
      return response;
    } catch (error) {
      this.logger.error('Error generating test cases:', error);
      throw error;
    }
  }

  parseTestCaseResponse(response: ITestCasesResponse | undefined): ITestCasesResponse {
    if (!response || !response.testCases) {
      return { testCases: [] };
    }
    return response;
  }
}
