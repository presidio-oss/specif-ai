/** 
 * Enum representing available modes for document enhancement.
 * 
 * - ADD: Adding a new document.
 * - UPDATE: Updating an existing document.
 */
export enum PromptMode {
  ADD = 'add',
  UPDATE = 'update',
}

/** 
 * Core structure representing basic document metadata.
 * 
 * @property name - Title of the document.
 * @property description - Short description or summary of the document.
 * @property jiraId - (Optional) Associated Jira ID for traceability.
 * @property documentTypeId - Type identifier of the document (e.g., PRD, BRD).
 */
export interface DocumentData {
  name: string;
  description: string;
  jiraId?: string;
  documentTypeId: string;
}

/** 
 * Base request schema for all document operations.
 * 
 * @property solutionId - ID of the associated solution.
 * @property documentData - Metadata information about the document.
 */
export interface BaseDocumentRequest {
  solutionId: number;
  documentData: DocumentData;
}

/** 
 * Interface for operations that optionally link documents together.
 * 
 * @property linkedDocuments - Optional list of document IDs linked to the document.
 */
export interface WithLinkedDocuments {
  linkedDocuments?: number[];
}

/** 
 * Schema for creating a new document.
 * 
 * Extends:
 * - BaseDocumentRequest
 * - WithLinkedDocuments
 */
export interface CreateDocumentRequest extends BaseDocumentRequest, WithLinkedDocuments {}

/** 
 * Schema for updating an existing document.
 * 
 * Extends:
 * - BaseDocumentRequest
 * 
 * @property documentId - ID of the document to update.
 */
export interface UpdateDocumentRequest extends BaseDocumentRequest {
  documentId: number;
}

/** 
 * Base schema structure for enhancement-related prompts (e.g., LLM document improvements).
 * 
 * Extends:
 * - BaseDocumentRequest
 * 
 * @property solutionName - Name of the parent solution.
 * @property solutionDescription - Description of the parent solution.
 * @property fileContent - Raw content of the document (optional).
 * @property mode - Enhancement mode (ADD or UPDATE).
 */
export interface BaseEnhanceDocument extends BaseDocumentRequest {
  solutionName: string;
  solutionDescription: string;
  fileContent?: string;
  mode: PromptMode;
}

/** 
 * Schema for enhancing requirement-level documents (e.g., BRDs).
 * 
 * Extends:
 * - BaseEnhanceDocument
 * - WithLinkedDocuments
 */
export interface RequirementEnhance extends BaseEnhanceDocument, WithLinkedDocuments {}

/** 
 * Schema for enhancing user story documents.
 * 
 * Extends:
 * - BaseEnhanceDocument
 * 
 * @property prdName - Name of the parent PRD.
 * @property prdDescription - Description of the parent PRD.
 * @property newStoryDescription - Content for the new user story.
 */
export interface UserStoryEnhance extends BaseEnhanceDocument {
  prdName: string;
  prdDescription: string;
  newStoryDescription: string;
}

/** 
 * Schema for enhancing task documents.
 * 
 * Extends:
 * - BaseEnhanceDocument
 * 
 * @property storyName - Name of the parent user story.
 * @property storyDescription - Description of the parent user story.
 * @property newTaskDescription - Content for the new task.
 */
export interface TaskEnhance extends BaseEnhanceDocument {
  storyName: string;
  storyDescription: string;
  newTaskDescription: string;
}
