import { REQUIREMENT_TYPE } from "./app.constants";

export const EXPORT_FILE_FORMATS = {
  JSON: 'json',
  EXCEL: 'xlsx',
} as const;

export const SPREADSHEET_HEADER_ROW = {
  [REQUIREMENT_TYPE.BRD]: ['Id', 'Title', 'Description'],
  [REQUIREMENT_TYPE.PRD]: ['Id', 'Title', 'Description'],
  [REQUIREMENT_TYPE.NFR]: ['Id', 'Title', 'Description'],
  [REQUIREMENT_TYPE.UIR]: ['Id', 'Title', 'Description'],
  [REQUIREMENT_TYPE.BP]: ['Id', 'Title', 'Description'],
  [REQUIREMENT_TYPE.TC]: ['Id', 'Title', 'Description'], // FIXME: Update with actual fields
  [REQUIREMENT_TYPE.UC]: ['Id', 'Title', 'Description'], // FIXME: Update with actual fields
  [REQUIREMENT_TYPE.US]: ['Id', 'Parent Id', 'Name', 'Description'],
  [REQUIREMENT_TYPE.TASK]: ['Id', 'Parent Id', 'Title', 'Acceptance Criteria'],
}

export type ExportFileFormat =
  (typeof EXPORT_FILE_FORMATS)[keyof typeof EXPORT_FILE_FORMATS];
