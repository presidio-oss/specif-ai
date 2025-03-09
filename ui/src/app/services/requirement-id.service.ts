import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { ProjectsState } from '../store/projects/projects.state';
import { UpdateMetadata } from '../store/projects/projects.actions';
import { REQUIREMENT_TYPE, RequirementType } from '../constants/app.constants';
import { IProjectMetadata } from '../model/interfaces/projects.interface';

@Injectable({
  providedIn: 'root',
})
export class RequirementIdService {
  constructor(private store: Store) {}

  public getNextRequirementId(
    requirementType: RequirementType,
    autoIncrement = false,
  ): number {
    const metadata = this.getMetadata();

    const currentId = metadata.requirementsIdCounter[requirementType] ?? 0;
    const nextRequirementId = currentId + 1;

    if (autoIncrement) {
      this.updateRequirementCounters({ [requirementType]: nextRequirementId });
    }

    return nextRequirementId;
  }

  public updateRequirementCounters(
    requirementCounters: Partial<Record<RequirementType, number>>,
  ): void {
    const metadata = this.getMetadata();

    this.store.dispatch(
      new UpdateMetadata(metadata.id, {
        ...metadata,
        requirementsIdCounter: {
          ...metadata.requirementsIdCounter,
          ...requirementCounters,
        },
      }),
    );
  }

  private getMetadata(): Omit<IProjectMetadata, 'requirementsIdCounter'> & {
    requirementsIdCounter: Record<RequirementType, number>;
  } {
    const metadata = this.store.selectSnapshot(ProjectsState.getMetadata);
    console.log(metadata);

    return {
      ...metadata,
      requirementsIdCounter:
        metadata.requirementsIdCounter || this.getInitialCounters(),
    };
  }

  private getInitialCounters(): Record<RequirementType, number> {
    return Object.fromEntries(
      Object.values(REQUIREMENT_TYPE).map((type) => [type, 0]),
    ) as Record<RequirementType, number>;
  }
}
