export enum ContentGenerationType {
  Solution = 'solution',
  Story = 'story',
  Task = 'task',
}

export interface ContentGenerationProcess {
  solutionId: string;
  type: ContentGenerationType;
  displayName: string;
  isInProgress: boolean;
}
