import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { ElectronService } from '../../electron-bridge/electron.service';
import {
  IUpdateUserStoryRequest,
  IUserStoriesRequest,
  IUserStory,
  IUserStoryResponse,
} from '../../model/interfaces/IUserStory';
import {
  IAddRequirementRequest,
  IUpdateRequirementRequest,
} from '../../model/interfaces/IRequirement';
import { map } from 'rxjs/operators';
import {
  IAddTaskRequest,
  IAddTaskResponse,
  IEditTaskResponse,
  ITask,
  ITaskRequest,
  ITasksResponse,
} from '../../model/interfaces/ITask';
import {
  IAddBusinessProcessRequest,
  IAddBusinessProcessResponse,
  IFlowChartRequest,
  IFlowchartResponse,
  IUpdateProcessRequest,
  IUpdateProcessResponse,
} from '../../model/interfaces/IBusinessProcess';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  GENERATE_TASK_URL: string = `solutions/task`;
  GENERATE_USER_STORIES_URL: string = `solutions/stories`;
  ADD_USER_STORY: string = `solutions/story/add`;
  UPDATE_USER_STORY: string = `solutions/story/update`;
  ADD_TASK: string = `solutions/task/add`;
  UPDATE_TASK: string = `solutions/task/update`;
  UPDATE_REQUIREMENT: string = `requirement:update`;
  ADD_REQUIREMENT: string = `requirement:add`;
  ADD_BUSINESS_PROCESS: string = `solutions/business_process/add`;
  UPDATE_BUSINESS_PROCESS: string = `solutions/business_process/update`;
  ADD_FLOW_CHART: string = `solutions/flowchart`;
  VALIDATE_BEDROCK_ID: string = `solutions/integration/knowledgebase/validation`;

  constructor(
    private http: HttpClient,
    private electronService: ElectronService
  ) {}

  generateUserStories(request: IUserStoriesRequest): Promise<IUserStory[]> {
    return this.electronService.createStories(request)
      .then((response: IUserStoryResponse) => {
        return this.parseUserStoryResponse(response);
      });
  }

  addBusinessProcess(
    request: IAddBusinessProcessRequest,
  ): Promise<IAddBusinessProcessResponse> {
    return this.electronService.addBusinessProcess(request);
  }

  updateBusinessProcess(
    request: IUpdateProcessRequest,
  ): Promise<IUpdateProcessResponse> {
    return this.electronService.updateBusinessProcess(request);
  }

  addFlowChart(request: IFlowChartRequest): Promise<IFlowchartResponse> {
    return this.electronService.createFlowchart(request);
  }

  updateRequirement(
    request: IUpdateRequirementRequest,
  ): Promise<IEditTaskResponse> {
    return this.electronService.updateRequirement(request);
  }

  addRequirement(
    request: IAddRequirementRequest,
  ): Promise<IAddTaskResponse> {
    return this.electronService.addRequirement(request);
  }

  generateTask(request: ITaskRequest): Observable<ITasksResponse> {
    const headers = new HttpHeaders({
      skipLoader: 'true',
    });
    return this.http.post<ITasksResponse>(this.GENERATE_TASK_URL, request, {
      headers,
    });
  }

  addUserStory(
    request: IUpdateUserStoryRequest,
  ): Observable<IUserStoryResponse> {
    return this.http.post<IUserStoryResponse>(this.ADD_USER_STORY, request);
  }

  updateUserStory(
    request: IUpdateUserStoryRequest,
  ): Promise<IUserStoryResponse> {
    return this.electronService.updateStory(request)
  }

  addTask(request: IAddTaskRequest): Observable<ITasksResponse> {
    return this.http.post<ITasksResponse>(this.ADD_TASK, request);
  }

  updateTask(request: IAddTaskRequest): Observable<ITasksResponse> {
    return this.http.put<ITasksResponse>(this.UPDATE_TASK, request);
  }

  validateBedrockId(bedrockId: string): Observable<boolean> {
    return this.http
      .post<{ isValid: boolean }>(this.VALIDATE_BEDROCK_ID, { bedrockId })
      .pipe(map((response) => response.isValid));
  }

  parseTaskResponse(response: ITasksResponse | undefined): ITask[] {
    const tasksArray: ITask[] = [];
    if (!response) {
      return tasksArray;
    }
    response.tasks.forEach((feature: any) => {
      const id = feature.id;
      for (const [list, acceptance] of Object.entries(feature)) {
        if (list !== 'id') {
          tasksArray.push({ list, acceptance: acceptance as string, id });
        }
      }
    });
    return tasksArray;
  }

  parseUserStoryResponse(
    response: IUserStoryResponse,
    existingUserStories?: IUserStory[],
  ): IUserStory[] {
    const userStoriesArray: IUserStory[] = [];
    response.features.forEach((feature: any) => {
      const id = feature.id;
      const tasks: ITask[] = existingUserStories
        ? existingUserStories.find((us) => us.id === id)?.tasks || []
        : [];
      for (const [name, description] of Object.entries(feature)) {
        if (name !== 'id') {
          userStoriesArray.push({
            id,
            name,
            description: description as string,
            tasks,
          });
        }
      }
    });
    return userStoriesArray;
  }
}
