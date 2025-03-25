import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
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
import { BedrockValidationPayload } from 'src/app/model/interfaces/chat.interface';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
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

  generateTask(request: ITaskRequest): Promise<ITasksResponse> {
    return this.electronService.createTask(request);
  }

  addUserStory(
    request: IUpdateUserStoryRequest,
  ): Promise<IUserStoryResponse> {
    return this.electronService.addUserStory(request);
  }

  updateUserStory(
    request: IUpdateUserStoryRequest,
  ): Promise<IUserStoryResponse> {
    return this.electronService.updateStory(request)
  }

  addTask(request: IAddTaskRequest): Promise<ITasksResponse> {
    return this.electronService.addTask(request);
  }

  updateTask(request: IAddTaskRequest): Promise<ITasksResponse> {
    return this.electronService.updateTask(request);
  }
  
  validateBedrockId(config: BedrockValidationPayload): Promise<boolean> {
    return this.electronService.validateBedrock(config);
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
