export type GetSolutionsResponse = {
  project: string;
  metadata: {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}[];
