import { Injectable, inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { NGXLogger } from 'ngx-logger';

const EXCEL_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const CSV_TYPE = 'text/csv;charset=utf-8;';

type SheetExportInfo = {
  data: Array<any[]>;
  name?: string;
};

@Injectable({
  providedIn: 'root',
})
export class SpreadSheetService {
  logger = inject(NGXLogger);

  public exportToExcel(sheets: SheetExportInfo[], fileName: string): void {
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();

    sheets.forEach((sheet) => {
      const worksheet: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    this.saveAsFile(excelBuffer, fileName, EXCEL_TYPE, '.xlsx');
  }

  public exportToCsv(data: Array<any[]> = [], fileName: string): void {
    this.logger.debug('data', data);
    const csvData = this.convertToCsv(data);
    this.logger.debug('csv data', csvData);
    this.saveAsFile(csvData, fileName, CSV_TYPE, '.csv');
  }

  private convertToCsv(data: Array<any[]> = []): string {
    return data
      .map((row) => row.map(String).map(this.escapeCsvValue).join(','))
      .join('\n');
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private saveAsFile(
    buffer: any,
    fileName: string,
    fileType: string,
    extension: string,
  ): void {
    const data: Blob = new Blob([buffer], { type: fileType });
    const savingFileName = `${fileName}_export_${new Date().getTime()}${extension}`;
    saveAs(data, savingFileName);
  }
}
