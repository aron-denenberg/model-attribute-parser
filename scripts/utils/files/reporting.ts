import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import * as fs from 'fs';
import path from "path";

export interface ErrorLine {
  error: Error,
  data: any | undefined,
}

export interface SuccessLine {
  data: any,
}

export type CsvData = Record<string, string | Date | number | undefined>;

export type CsvInputData = {
  options: {
    columns: string[] | boolean,
    header: true,
    fromLine?: number,
  },
  data: CsvData,
  filePath: string,
}

export type CsvOutputData = {
  options: {
    columns: string[],
    header: true,
    fromLine?: number,
  },
  data: CsvData[],
  filePath: string,
}

export class FileReportingUtils {
  static exportCsv(csvOutputData: CsvOutputData, skipLine = 0) {
    const content = stringify(
      csvOutputData.data as any,
      csvOutputData.options,
    );

    console.log(content.toString());

    return fs.writeFileSync(
      csvOutputData.filePath, 
      [
        ...(Array(skipLine).fill('INTENTIONALLY LEFT BLANK')),
        content
      ].join('\n'));
  }

  static processCsv<T>(input: Omit<CsvInputData, 'data'>): T[] {
    const csvContents = fs.readFileSync(input.filePath);

    return parse(csvContents, {
      ...input.options,
      delimiter: ',',
    });
  }

  static getFilePath(fileName: string, dataLength: number) {
    return path.posix.basename(`${__dirname}/${fileName}-${dataLength}.csv`);
  }

  static generateSuccessAndErrorFiles<T>(params: {
    baseFileName: string,
    errors: {
      rows: ErrorLine[],
      columns: string[],
    },
    successes: {
      rows: SuccessLine[],
      columns: string[]
    }
  }) {
    const successfileData = FileReportingUtils.prepSuccessFileData(
      {
        fileName: params.baseFileName,
        rows: params.successes.rows,
        columns: params.successes.columns,
      }
    );

    console.log(`Writing successes to ${successfileData.filePath}`);

    FileReportingUtils.exportCsv(successfileData, 3);
    
    const errorFileData = FileReportingUtils.prepErrorFileData(
      {
        fileName: params.baseFileName,
        rows: params.errors.rows,
        columns: params.errors.columns,
      }
    );

    console.log(`Writing errors to ${errorFileData.filePath}`);

    FileReportingUtils.exportCsv(errorFileData, 3);
  }

  static prepErrorFileData(params: {
    fileName: string, 
    rows: ErrorLine[], 
    columns: string[]
  }): CsvOutputData {
    const {
      fileName,
      rows,
      columns,
    } = params;

    const datetime = new Date().toISOString().replace(/(?:\.\d{3}Z)|(?:[^\d])/g, '');

    const filePath = FileReportingUtils
      .getFilePath(fileName, rows.length)
      .replace('.csv', `${datetime}_error.csv`);
    
    const baseData = FileReportingUtils.prepFileData({
      data: rows.map((errorLine) => FileReportingUtils.aggregateErrorLine(errorLine)), 
      filePath,
      columns: columns,
    });

    return {
      ...baseData,
      options: {
        ...baseData.options,
        columns: [...baseData.options.columns, 'error', 'messages'],
      },
    }
  }

  static prepSuccessFileData(params: {
    fileName: string, 
    rows: SuccessLine[], 
    columns: string[]
  }): CsvOutputData {
    const {
      fileName,
      rows,
      columns,
    } = params;

    const datetime = new Date().toISOString().replace(/(?:\.\d{3}Z)|(?:[^\d])/g, '');

    const filePath = FileReportingUtils
      .getFilePath(fileName, rows.length)
      .replace('.csv', `${datetime}_success.csv`);
    
    const baseData = FileReportingUtils.prepFileData({
      data: rows.map((row) => FileReportingUtils.aggregateSuccessLine(row)), 
      filePath,
      columns: columns,
    });

    return {
      ...baseData,
      filePath,
      options: {
        header: true,
        columns: columns,
      },
    }
  }

  static prepFileData(params: {
    data: CsvData[], 
    filePath: string, 
    columns: string[]
  }): CsvOutputData {
    const { 
      data, 
      filePath, 
      columns 
    } = params;

    return {
      data,
      options: {
        columns: columns,
        header: true,
        fromLine: 4
      },
      filePath,
    }
  }

  static aggregateErrorLine(errorLine: ErrorLine) {
    let messages: string[] = [];

    try {
        messages = [errorLine.error.message];
    } catch (e) {
        console.log('unable to parse error message');
        messages = [errorLine.error.message]
    }

    return {
      ...errorLine.data,
      error: errorLine.error,
      messages: messages.join('\n'),
    }
  }

  static aggregateSuccessLine(successLine: SuccessLine) {
    return {
      ...successLine.data,
    }
  }
}