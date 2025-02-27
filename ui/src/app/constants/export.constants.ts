export const EXPORT_FILE_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  EXCEL: 'xlsx',
} as const;

export type ExportFileFormat =
  (typeof EXPORT_FILE_FORMATS)[keyof typeof EXPORT_FILE_FORMATS];
