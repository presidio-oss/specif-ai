export type GetSolutionsResponse = {
  project: string;
  metadata: {
    id: number;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}[];
