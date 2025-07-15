export interface IList{
  folderName: string
  fileName: string
  content: IProjectDocument
}

export interface SelectedDocument {
  requirement: string;
  fileName: string;
}

export interface IProjectDocument {
  requirement?: string;
  title?: string;
  pmoId?: string;
  features?: IFeature[];
  linkedBRDIds?: string[];
  selectedBRDs?: SelectedDocument[];
  selectedPRDs?: SelectedDocument[];
  chatHistory?: [];
}

export interface IFeature {
  id?: string;
  name?: string;
  description?: string;
  tasks?: ITask[];
}

export interface ITask {
  list?: string;
  acceptance?: string;
  id?: string;
  chatHistory?: [];
}

export interface ISelectedFolder {
  title: string;
  id?: string;
  metadata?: any;
}
