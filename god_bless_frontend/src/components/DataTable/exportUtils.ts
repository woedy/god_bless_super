import { ExportFormat, Column } from '../../types/dataTable';

/**
 * Export data to CSV format - Overload for plain objects
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename?: string
): void;

/**
 * Export data to CSV format - Overload for typed data with columns
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: Column<T>[],
  filename?: string
): void;

/**
 * Export data to CSV format - Implementation
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[] | Record<string, any>[],
  columnsOrFilename?: Column<T>[] | string,
  filenameParam?: string
): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Detect which signature was used
  if (typeof columnsOrFilename === 'string' || columnsOrFilename === undefined) {
    // Plain object signature: exportToCSV(data, filename?)
    const filename = columnsOrFilename || 'export.csv';
    const keys = Object.keys(data[0] || {});
    const headers = keys.join(',');
    
    const rows = data.map((row) => {
      return keys
        .map((key) => {
          const value = String(row[key] ?? '');
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');
    downloadFile(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
  } else {
    // Column-based signature: exportToCSV(data, columns, filename?)
    const columns = columnsOrFilename as Column<T>[];
    const filename = filenameParam || 'export.csv';
    
    // Create CSV header
    const headers = columns.map((col) => col.label).join(',');
    
    // Create CSV rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          const value = row[col.key];
          // Escape quotes and wrap in quotes if contains comma or quote
          const stringValue = String(value ?? '');
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    const csv = [headers, ...rows].join('\n');
    downloadFile(csv, filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
  }
}

/**
 * Export data to TXT format - Overload for plain objects
 */
export function exportToTXT(
  data: Record<string, any>[],
  filename?: string
): void;

/**
 * Export data to TXT format - Overload for typed data with columns
 */
export function exportToTXT<T extends Record<string, any>>(
  data: T[],
  columns: Column<T>[],
  filename?: string
): void;

/**
 * Export data to TXT format - Implementation
 */
export function exportToTXT<T extends Record<string, any>>(
  data: T[] | Record<string, any>[],
  columnsOrFilename?: Column<T>[] | string,
  filenameParam?: string
): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Detect which signature was used
  if (typeof columnsOrFilename === 'string' || columnsOrFilename === undefined) {
    // Plain object signature: exportToTXT(data, filename?)
    const filename = columnsOrFilename || 'export.txt';
    const keys = Object.keys(data[0] || {});
    
    // Calculate column widths
    const widths = keys.map((key) => {
      const headerLength = key.length;
      const maxDataLength = Math.max(
        ...data.map((row) => String(row[key] ?? '').length)
      );
      return Math.max(headerLength, maxDataLength) + 2;
    });

    // Create header
    const header = keys
      .map((key, i) => key.padEnd(widths[i]))
      .join(' | ');
    
    const separator = widths.map((w) => '-'.repeat(w)).join('-+-');

    // Create rows
    const rows = data.map((row) => {
      return keys
        .map((key, i) => String(row[key] ?? '').padEnd(widths[i]))
        .join(' | ');
    });

    const txt = [header, separator, ...rows].join('\n');
    downloadFile(txt, filename.endsWith('.txt') ? filename : `${filename}.txt`, 'text/plain');
  } else {
    // Column-based signature: exportToTXT(data, columns, filename?)
    const columns = columnsOrFilename as Column<T>[];
    const filename = filenameParam || 'export.txt';
    
    // Calculate column widths
    const widths = columns.map((col) => {
      const headerLength = col.label.length;
      const maxDataLength = Math.max(
        ...data.map((row) => String(row[col.key] ?? '').length)
      );
      return Math.max(headerLength, maxDataLength) + 2;
    });

    // Create header
    const header = columns
      .map((col, i) => col.label.padEnd(widths[i]))
      .join(' | ');
    
    const separator = widths.map((w) => '-'.repeat(w)).join('-+-');

    // Create rows
    const rows = data.map((row) => {
      return columns
        .map((col, i) => String(row[col.key] ?? '').padEnd(widths[i]))
        .join(' | ');
    });

    const txt = [header, separator, ...rows].join('\n');
    downloadFile(txt, filename.endsWith('.txt') ? filename : `${filename}.txt`, 'text/plain');
  }
}

/**
 * Export data to JSON format - Overload for plain objects
 */
export function exportToJSON(
  data: Record<string, any>[],
  filename?: string
): void;

/**
 * Export data to JSON format - Overload for typed data with columns
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  columns: Column<T>[],
  filename?: string
): void;

/**
 * Export data to JSON format - Implementation
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[] | Record<string, any>[],
  columnsOrFilename?: Column<T>[] | string,
  filenameParam?: string
): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Detect which signature was used
  if (typeof columnsOrFilename === 'string' || columnsOrFilename === undefined) {
    // Plain object signature: exportToJSON(data, filename?)
    const filename = columnsOrFilename || 'export.json';
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
  } else {
    // Column-based signature: exportToJSON(data, columns, filename?)
    const columns = columnsOrFilename as Column<T>[];
    const filename = filenameParam || 'export.json';
    
    // Extract only the columns we want
    const exportData = data.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col) => {
        obj[col.key] = row[col.key];
      });
      return obj;
    });

    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, filename.endsWith('.json') ? filename : `${filename}.json`, 'application/json');
  }
}

/**
 * Export data to DOC format (HTML-based Word document) - Overload for plain objects
 */
export function exportToDOC(
  data: Record<string, any>[],
  filename?: string
): void;

/**
 * Export data to DOC format (HTML-based Word document) - Overload for typed data with columns
 */
export function exportToDOC<T extends Record<string, any>>(
  data: T[],
  columns: Column<T>[],
  filename?: string
): void;

/**
 * Export data to DOC format (HTML-based Word document) - Implementation
 */
export function exportToDOC<T extends Record<string, any>>(
  data: T[] | Record<string, any>[],
  columnsOrFilename?: Column<T>[] | string,
  filenameParam?: string
): void {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Detect which signature was used
  if (typeof columnsOrFilename === 'string' || columnsOrFilename === undefined) {
    // Plain object signature: exportToDOC(data, filename?)
    const filename = columnsOrFilename || 'export.doc';
    const keys = Object.keys(data[0] || {});
    
    // Create HTML table
    const header = `
      <tr>
        ${keys.map((key) => `<th style="border: 1px solid black; padding: 8px; background-color: #f0f0f0;">${key}</th>`).join('')}
      </tr>
    `;

    const rows = data
      .map(
        (row) => `
      <tr>
        ${keys.map((key) => `<td style="border: 1px solid black; padding: 8px;">${row[key] ?? ''}</td>`).join('')}
      </tr>
    `
      )
      .join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Export</title>
        </head>
        <body>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>${header}</thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadFile(html, filename.endsWith('.doc') ? filename : `${filename}.doc`, 'application/msword');
  } else {
    // Column-based signature: exportToDOC(data, columns, filename?)
    const columns = columnsOrFilename as Column<T>[];
    const filename = filenameParam || 'export.doc';
    
    // Create HTML table
    const header = `
      <tr>
        ${columns.map((col) => `<th style="border: 1px solid black; padding: 8px; background-color: #f0f0f0;">${col.label}</th>`).join('')}
      </tr>
    `;

    const rows = data
      .map(
        (row) => `
      <tr>
        ${columns.map((col) => `<td style="border: 1px solid black; padding: 8px;">${row[col.key] ?? ''}</td>`).join('')}
      </tr>
    `
      )
      .join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Export</title>
        </head>
        <body>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>${header}</thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    downloadFile(html, filename.endsWith('.doc') ? filename : `${filename}.doc`, 'application/msword');
  }
}

/**
 * Generic export function that routes to specific format handlers
 */
export const exportData = <T extends Record<string, any>>(
  format: ExportFormat,
  data: T[],
  columns: Column<T>[],
  filename?: string
): void => {
  const timestamp = new Date().toISOString().split('T')[0];
  const baseFilename = filename || `export_${timestamp}`;

  switch (format) {
    case 'csv':
      exportToCSV(data, columns, `${baseFilename}.csv`);
      break;
    case 'txt':
      exportToTXT(data, columns, `${baseFilename}.txt`);
      break;
    case 'json':
      exportToJSON(data, columns, `${baseFilename}.json`);
      break;
    case 'doc':
      exportToDOC(data, columns, `${baseFilename}.doc`);
      break;
    default:
      console.error(`Unsupported export format: ${format}`);
  }
};

/**
 * Helper function to trigger file download
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
