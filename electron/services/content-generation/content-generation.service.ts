import {
  ContentGenerationProcess,
  ContentGenerationType,
} from "../../types/content-generation.types";

class ContentGenerationManager {
  private processes: Map<string, ContentGenerationProcess> = new Map();

  setContentGenerationStatus(
    solutionId: string,
    type: ContentGenerationType,
    isInProgress: boolean
  ): void {
    const displayNames: Record<ContentGenerationType, string> = {
      [ContentGenerationType.Solution]: "Solution Generation",
      [ContentGenerationType.Story]: "Story Generation",
      [ContentGenerationType.Task]: "Task Generation",
      [ContentGenerationType.TestCase]: "Test Case Generation",
    };

    const key = `${solutionId}-${type}`;
    this.processes.set(key, {
      solutionId,
      type,
      displayName: displayNames[type],
      isInProgress,
    });
  }

  isAnyContentGenerationInProgress(): boolean {
    return Array.from(this.processes.values()).some(
      (process) => process.isInProgress
    );
  }

  getActiveContentGenerationProcesses(): ContentGenerationProcess[] {
    return Array.from(this.processes.values()).filter(
      (process) => process.isInProgress
    );
  }

  getActiveContentGenerationProcessNames(): string[] {
    return this.getActiveContentGenerationProcesses().map(
      (process) => process.displayName
    );
  }

  clearAllContentGenerationProcesses(): void {
    this.processes.clear();
  }
}

export const contentGenerationManager = new ContentGenerationManager();
