export interface ContentGenerationProcess {
  type: "solution" | "story" | "task";
  displayName: string;
  isInProgress: boolean;
}

class ContentGenerationManager {
  private processes: Map<string, ContentGenerationProcess> = new Map();

  setProcessStatus(
    type: ContentGenerationProcess["type"],
    isInProgress: boolean
  ): void {
    const displayNames = {
      solution: "Solution Generation",
      story: "Story Generation",
      task: "Task Generation",
    };

    this.processes.set(type, {
      type,
      displayName: displayNames[type],
      isInProgress,
    });
  }

  isAnyProcessInProgress(): boolean {
    return Array.from(this.processes.values()).some(
      (process) => process.isInProgress
    );
  }

  getActiveProcesses(): ContentGenerationProcess[] {
    return Array.from(this.processes.values()).filter(
      (process) => process.isInProgress
    );
  }

  getActiveProcessNames(): string[] {
    return this.getActiveProcesses().map((process) => process.displayName);
  }

  clear(): void {
    this.processes.clear();
  }
}

export const contentGenerationManager = new ContentGenerationManager();
