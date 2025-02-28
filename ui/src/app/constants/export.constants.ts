export const EXPORT_FILE_FORMATS = {
  JSON: 'json',
  EXCEL: 'xlsx',
} as const;

export type ExportFileFormat =
  (typeof EXPORT_FILE_FORMATS)[keyof typeof EXPORT_FILE_FORMATS];
