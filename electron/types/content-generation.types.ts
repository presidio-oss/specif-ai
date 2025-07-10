export enum ContentGenerationType {
  Solution = 'solution',
  Story = 'story',
  Task = 'task',
  TestCase = 'test_case',
}

export interface ContentGenerationProcess {
  solutionId: string;
  type: ContentGenerationType;
  displayName: string;
  isInProgress: boolean;
}
