import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ISolutionResponse, ICreateSolutionRequest } from '../../model/interfaces/projects.interface';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  constructor(private httpService: HttpClient) {}

  generateDocumentsFromLLM(data: ICreateSolutionRequest): Observable<ISolutionResponse> {
    const url = `solutions/create`;
    return this.httpService.post<ISolutionResponse>(url, data);
  }
}
