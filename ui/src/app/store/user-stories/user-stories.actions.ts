import { ExportRequirementDataOptions } from 'src/app/model/interfaces/exports.interface';
import { ITask } from '../../model/interfaces/IList';

import { IUserStory } from '../../model/interfaces/IUserStory';

export class GetUserStories {
  static readonly type = '[UserStories] Get User Stories';

  constructor(readonly relativePath: string) {}
}

export class SetSelectedProject {
  static readonly type = '[Projects] Set Selected Project';

  constructor(readonly projectPath: string) {}
}

export class SetSelectedFeature {
  static readonly type = '[Projects] Set Selected Feature';

  constructor(readonly projectPath: string) {}
}

export class SetSelectedUserStory {
  static readonly type = '[UserStories] Set Selected User Story';

  constructor(readonly userStoryId: string) {}
}

export class EditUserStory {
  static readonly type = '[UserStories] Edit User Story';

  constructor(
    readonly filePath: string,
    readonly userStory: any,
  ) {}
}

export class ArchiveTask {
  static readonly type = '[UserStories] Archive Task';
  constructor(
    readonly filePath: string,
    readonly userStoryId: string,
    readonly taskId: string,
  ) {}
}

export class ArchiveUserStory {
  static readonly type = '[UserStories] Archive User Story';
  constructor(
    readonly filePath: string,
    readonly userStoryId: string,
  ) {}
}

export class CreateNewUserStory {
  static readonly type = '[UserStories] Create New User Story';

  constructor(
    readonly userStory: any,
    readonly absolutePath: string,
  ) {}
}

export class CreateNewTask {
  static readonly type = '[UserStories] Create New Task';

  constructor(
    readonly task: ITask,
    readonly relativePath: string,
  ) {}
}

export class UpdateTask {
  static readonly type = '[UserStories] Update Task';

  constructor(
    readonly task: ITask,
    readonly relativePath: string,
    readonly redirect?: boolean,
  ) {}
}

export class SetCurrentTaskId {
  static readonly type = '[UserStories] Set Current Task Id';

  constructor(readonly taskId: string) {}
}

export class SetCurrentConfig {
  static readonly type = '[UserStories] Set Current Config';

  constructor(
    readonly config: {
      fileName: string;
      folderName: string;
      projectId: string;
      reqId: string;
      featureId: string;
    },
  ) {}
}

export class ExportUserStories {
  static readonly type = '[UserStories] Export User Stories';

  constructor(public exportOptions: ExportRequirementDataOptions) {}
}
