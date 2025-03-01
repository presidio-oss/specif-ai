import { Injectable } from '@angular/core';
import { State, Action, Selector, StateContext } from '@ngxs/store';
import {
  CreateNewTask,
  CreateNewUserStory,
  EditUserStory,
  ArchiveTask,
  ArchiveUserStory,
  GetUserStories,
  SetCurrentConfig,
  SetCurrentTaskId,
  SetSelectedProject,
  SetSelectedUserStory,
  UpdateTask,
  ExportUserStories,
} from './user-stories.actions';
import { AppSystemService } from '../../services/app-system/app-system.service';
import { NGXLogger } from 'ngx-logger';
import { IUserStory } from '../../model/interfaces/IUserStory';
import { ITask } from '../../model/interfaces/ITask';
import { Router } from '@angular/router';
import { RequirementExportService } from 'src/app/services/export/requirement-export.service';
import { REQUIREMENT_TYPE } from 'src/app/constants/app.constants';
import { ToasterService } from 'src/app/services/toaster/toaster.service';

export interface UserStoriesStateModel {
  userStories: IUserStory[];
  taskMap: { [key in string]: ITask[] };
  selectedUserStoryId: string | null;
  selectedProject: string;
  selectedTaskId: string | null;
  fileContent: string;
  currentConfig: {
    projectId: string;
    fileName: string;
    folderName: string;
    reqId: string;
    featureId: string;
  } | null;
}

@State<UserStoriesStateModel>({
  name: 'userStories',
  defaults: {
    userStories: [],
    taskMap: {},
    selectedUserStoryId: null,
    selectedProject: '',
    fileContent: '',
    selectedTaskId: null,
    currentConfig: null,
  },
})
@Injectable()
export class UserStoriesState {
  constructor(
    private appSystemService: AppSystemService,
    private logger: NGXLogger,
    private router: Router,
    private toast: ToasterService,
    private requirementExportService: RequirementExportService
  ) { }

  @Selector()
  static getUserStories(state: UserStoriesStateModel) {
    return state.userStories;
  }

  @Selector()
  static getTaskList(state: UserStoriesStateModel) {
    console.log(
      state.taskMap[state.selectedUserStoryId as string],
      state.taskMap,
    );
    return state.taskMap[state.selectedUserStoryId as string] || [];
  }

  @Selector()
  static getSelectedUserStory(state: UserStoriesStateModel) {
    return state.userStories.find(
      (story) => story.id === state.selectedUserStoryId,
    );
  }

  @Selector()
  static getSelectedTask(state: UserStoriesStateModel) {
    return state.taskMap[state.selectedUserStoryId as string]?.find(
      (task) => task.id === state.selectedTaskId,
    );
  }

  @Selector()
  static getSelectedProject(state: UserStoriesStateModel) {
    return state.selectedProject;
  }

  @Selector()
  static getCurrentConfig(state: UserStoriesStateModel) {
    return state.currentConfig;
  }

  @Action(GetUserStories)
  add(
    ctx: StateContext<UserStoriesStateModel>,
    { relativePath }: GetUserStories,
  ) {
    const state = ctx.getState();
    this.appSystemService
      .readFile(relativePath)
      .then((res) => {
        this.logger.debug(res, relativePath);
        if (!res) {
          ctx.patchState({
            userStories: []
          });
          return;
        }
        const userStories: Array<IUserStory> = JSON.parse(res).features || [];
        const stories: IUserStory[] = [];
        const taskMap: { [key in string]: ITask[] } = {};
        this.logger.debug('userStories ==>', userStories);
        userStories.forEach((story: IUserStory) => {
          stories.push({
            id: story.id,
            name: story.name,
            description: story.description,
            tasks: story.tasks,
            archivedTasks: story.archivedTasks,
            chatHistory: story.chatHistory,
            storyTicketId: story.storyTicketId
          });
          this.logger.debug('story ==>', story);
          taskMap[story.id] = story.tasks as ITask[];
        });
        ctx.patchState({
          userStories: [...stories],
          fileContent: res,
          taskMap: { ...state.taskMap, ...taskMap },
        });
      })
      .catch((error) => {
        this.logger.error('Error in reading file', error);
      });
  }

  @Action(SetSelectedUserStory)
  setSelectedUserStory(
    ctx: StateContext<UserStoriesStateModel>,
    { userStoryId }: SetSelectedUserStory,
  ) {
    ctx.patchState({
      selectedUserStoryId: userStoryId,
    });
  }

  @Action(SetSelectedProject)
  setSelectedProject(
    ctx: StateContext<UserStoriesStateModel>,
    { projectPath }: SetSelectedProject,
  ) {
    ctx.patchState({
      selectedProject: projectPath,
    });
  }

  @Action(EditUserStory)
  async editUserStory(
    ctx: StateContext<UserStoriesStateModel>,
    { filePath, userStory }: EditUserStory,
  ) {
    const state = ctx.getState();

    const updatedUserStories = state.userStories.map((us) => {
      if (us.id === userStory.id) {
        return { ...us, ...userStory };
      }
      return us;
    });

    const fileContent = JSON.stringify({
      features: updatedUserStories,
      archivedFeatures: JSON.parse(state.fileContent).archivedFeatures || [],
    });

    await this.appSystemService.createFileWithContent(
      `${state.selectedProject}/${filePath}`,
      fileContent,
    );

    ctx.patchState({
      userStories: updatedUserStories,
    });
  }

  @Action(ArchiveTask)
  async archiveTask(
    ctx: StateContext<UserStoriesStateModel>,
    { filePath, userStoryId, taskId }: ArchiveTask,
  ) {
    const state = ctx.getState();

    const fileContent = JSON.parse(state.fileContent);

    const storyIndex = fileContent.features.findIndex(
      (story: IUserStory) => story.id === userStoryId,
    );
    const story = fileContent.features[storyIndex];

    const taskIndex = story.tasks.findIndex(
      (task: ITask) => task.id === taskId,
    );

    const [removedTask] = story.tasks.splice(taskIndex, 1);
    story.archivedTasks = [...(story.archivedTasks || []), removedTask];

    const updatedContent = JSON.stringify(fileContent);

    await this.appSystemService.createFileWithContent(
      `${state.selectedProject}/${filePath}`,
      updatedContent,
    );

    ctx.patchState({
      fileContent: updatedContent,
      userStories: fileContent.features,
      taskMap: {
        ...state.taskMap,
        [userStoryId]: story.tasks,
      },
    });
  }

  @Action(ArchiveUserStory)
  async archiveUserStory(
    ctx: StateContext<UserStoriesStateModel>,
    { filePath, userStoryId }: ArchiveUserStory,
  ) {
    const state = ctx.getState();
    const fileContent = JSON.parse(state.fileContent);

    const storyIndex = fileContent.features.findIndex(
      (story: IUserStory) => story.id === userStoryId,
    );

    const [removedStory] = fileContent.features.splice(storyIndex, 1);
    fileContent.archivedFeatures = [
      ...(fileContent.archivedFeatures || []),
      removedStory,
    ];

    const updatedContent = JSON.stringify(fileContent);

    await this.appSystemService.createFileWithContent(
      `${state.selectedProject}/${filePath}`,
      updatedContent,
    );

    ctx.patchState({
      fileContent: updatedContent,
      userStories: fileContent.features,
    });
  }

  @Action(CreateNewUserStory)
  async createNewUserStory(
    ctx: StateContext<UserStoriesStateModel>,
    { userStory, absolutePath }: CreateNewUserStory,
  ) {
    const state = ctx.getState();

    const newId = `US${state.userStories.length + 1}`;

    const newUserStory = { id: newId, ...userStory, tasks: [] };
    const updatedUserStories = [...state.userStories, newUserStory];

    const fileContent = JSON.stringify(
      {
        features: updatedUserStories,
        archivedFeatures: JSON.parse(state.fileContent).archivedFeatures || [],
      },
      null,
      2,
    );

    console.log(`${state.selectedProject}/${absolutePath}`, 'absinthe');

    await this.appSystemService.createFileWithContent(
      `${state.selectedProject}/${absolutePath}`,
      fileContent,
    );

    ctx.patchState({
      userStories: updatedUserStories,
    });
  }

  @Action(CreateNewTask)
  createNewTask(
    ctx: StateContext<UserStoriesStateModel>,
    { task, relativePath }: CreateNewTask,
  ) {
    const state = ctx.getState();
    const newFileContent = JSON.parse(state.fileContent);
    if (state.taskMap.hasOwnProperty(state.selectedUserStoryId as string)) {
      const newTaskList = [
        ...(state.taskMap[state.selectedUserStoryId as string] as ITask[]),
      ];
      newTaskList?.push(task as ITask);
      // state.taskMap.delete(state.selectedUserStoryId as string);
      ctx.patchState({
        taskMap: {
          ...state.taskMap,
          [state.selectedUserStoryId as string]: newTaskList as ITask[],
        },
      });
      // state.taskMap.set(
      //   state.selectedUserStoryId as string,
      //   newTaskList as ITask[],
      // );
    }
    newFileContent.features.forEach((story: IUserStory) => {
      if (story.id === state.selectedUserStoryId) {
        if (!story.tasks) {
          story.tasks = [];
        }
        this.logger.debug('task =>', task);
        story.tasks?.push(task as ITask);
      }
    });
    this.logger.debug('logger =>', newFileContent);
    this.appSystemService
      .createFileWithContent(relativePath, JSON.stringify(newFileContent));
  }

  @Action(UpdateTask)
  updateTask(
    ctx: StateContext<UserStoriesStateModel>,
    { task, relativePath, redirect }: UpdateTask,
  ) {
    const state = ctx.getState();
    const taskList = state.taskMap[state.selectedUserStoryId as string];
    const existingTasks = taskList.filter((t) => t.id !== task.id);
    existingTasks.push(task as ITask);
    ctx.patchState({
      taskMap: {
        ...state.taskMap,
        [state.selectedUserStoryId as string]: existingTasks,
      },
    });
    const newFileContent = JSON.parse(state.fileContent);
    newFileContent.features.forEach((story: IUserStory, index: number) => {
      if (story.id === state.selectedUserStoryId) {
        story.tasks?.forEach((t: ITask, j: number) => {
          if (t.id === task.id) {
            newFileContent.features[index].tasks[j] = task;
          }
        });
      }
    });
    this.logger.debug(newFileContent);
    this.appSystemService
      .createFileWithContent(relativePath, JSON.stringify(newFileContent))
      .then(() => {
        redirect && this.router
          .navigate([`/task-list/${state.selectedUserStoryId}`])
          .then();
      });
  }

  @Action(SetCurrentTaskId)
  setCurrentTaskId(
    ctx: StateContext<UserStoriesStateModel>,
    { taskId }: SetCurrentTaskId,
  ) {
    ctx.patchState({
      selectedTaskId: taskId,
    });
  }

  @Action(SetCurrentConfig)
  setCurrentConfig(
    ctx: StateContext<UserStoriesStateModel>,
    { config }: SetCurrentConfig,
  ) {
    ctx.patchState({
      currentConfig: config,
    });
  }

  @Action(ExportUserStories)
  exportUserStories(
    ctx: StateContext<UserStoriesStateModel>,
    { exportOptions }: ExportUserStories,
  ) {
    try {
      const state = ctx.getState();
      const prdId = state.currentConfig?.reqId;
      
      this.toast.showInfo(`Exporting user stories of prd ${prdId}`);
      this.requirementExportService.exportRequirementData(
        {
          prdId: state.currentConfig?.reqId!,
          userStories: state.userStories,
        },
        {
          projectName: state.selectedProject,
          type: exportOptions.type,
        },
        REQUIREMENT_TYPE.US,
      );
    } catch (error) {
      const message = `Failed to export user stories: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.logger.error(error);
      this.logger.error(message);
      this.toast.showError(message);
    }
  }
}
