/**
 * API utilities for export and import functionality
 */
import { API_BASE_URL } from '../constants';

export interface ExportOptions {
  user_id: string;
  project_id?: string;
  format: 'csv' | 'txt' | 'json' | 'doc';
  filters?: Record<string, any>;
  fields?: string[];
  use_background?: boolean;
}

export interface ImportOptions {
  user_id: string;
  project_id: string;
  format: 'csv' | 'txt' | 'json';
  file: File;
  validate_on_import?: boolean;
}

export interface ImportSMSRecipientsOptions {
  user_id: string;
  campaign_id: string;
  format: 'csv' | 'txt' | 'json';
  file: File;
}

export interface ExportResponse {
  message: string;
  data?: {
    task_id?: string;
    total_records?: number;
    message?: string;
    file_url?: string;
    filename?: string;
  };
  errors?: Record<string, string[]>;
}

export interface ImportResponse {
  message: string;
  data?: {
    task_id: string;
    message: string;
  };
  errors?: Record<string, string[]>;
}

/**
 * Export phone numbers
 */
export const exportPhoneNumbers = async (
  options: ExportOptions,
  token: string
): Promise<ExportResponse | Blob> => {
  const formData = new FormData();
  formData.append('user_id', options.user_id);
  if (options.project_id) {
    formData.append('project_id', options.project_id);
  }
  formData.append('format', options.format);
  if (options.filters) {
    formData.append('filters', JSON.stringify(options.filters));
  }
  if (options.fields) {
    formData.append('fields', JSON.stringify(options.fields));
  }
  if (options.use_background !== undefined) {
    formData.append('use_background', String(options.use_background));
  }

  const response = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });

  // Check if response is JSON (background task) or file download
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else {
    // Direct file download
    return await response.blob();
  }
};

/**
 * Import phone numbers
 */
export const importPhoneNumbers = async (
  options: ImportOptions,
  token: string
): Promise<ImportResponse> => {
  const formData = new FormData();
  formData.append('user_id', options.user_id);
  formData.append('project_id', options.project_id);
  formData.append('format', options.format);
  formData.append('file', options.file);
  if (options.validate_on_import !== undefined) {
    formData.append('validate_on_import', String(options.validate_on_import));
  }

  const response = await fetch(`${API_BASE_URL}/phone-generator/import/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });

  return await response.json();
};

/**
 * Import SMS recipients for a campaign
 */
export const importSMSRecipients = async (
  options: ImportSMSRecipientsOptions,
  token: string
): Promise<ImportResponse> => {
  const formData = new FormData();
  formData.append('user_id', options.user_id);
  formData.append('campaign_id', options.campaign_id);
  formData.append('format', options.format);
  formData.append('file', options.file);

  const response = await fetch(
    `${API_BASE_URL}/phone-generator/import-sms-recipients/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
      },
      body: formData,
    }
  );

  return await response.json();
};

/**
 * Download exported file from task result
 */
export const downloadExportedFile = (fileUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Trigger direct file download from blob
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
