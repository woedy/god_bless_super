import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiFile, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export type ImportFormat = 'csv' | 'txt' | 'json';

export interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File, format: ImportFormat, options?: ImportOptions) => void;
  formats?: ImportFormat[];
  title?: string;
  description?: string;
  acceptedFileTypes?: string;
  showValidationOption?: boolean;
}

export interface ImportOptions {
  validateOnImport?: boolean;
}

const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  formats = ['csv', 'txt', 'json'],
  title = 'Import Data',
  description = 'Upload a file to import data',
  acceptedFileTypes = '.csv,.txt,.json',
  showValidationOption = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ImportFormat>(formats[0]);
  const [validateOnImport, setValidateOnImport] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatIcons: Record<ImportFormat, string> = {
    csv: '📊',
    txt: '📄',
    json: '{ }',
  };

  const formatDescriptions: Record<ImportFormat, string> = {
    csv: 'Comma-separated values with headers',
    txt: 'Plain text, one entry per line',
    json: 'JavaScript Object Notation array',
  };

  const formatExamples: Record<ImportFormat, string> = {
    csv: 'phone_number,carrier,type\n15551234567,AT&T,Mobile',
    txt: '15551234567\n15559876543',
    json: '[{"phone_number": "15551234567", "carrier": "AT&T"}]',
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension && formats.includes(extension as ImportFormat)) {
      setSelectedFile(file);
      setSelectedFormat(extension as ImportFormat);
    } else {
      alert(`Invalid file type. Please select a ${formats.join(', ')} file.`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      onImport(selectedFile, selectedFormat, {
        validateOnImport: showValidationOption ? validateOnImport : undefined,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedFormat(formats[0]);
    setValidateOnImport(false);
    setDragActive(false);
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiX size={20} />
        </button>

        <h3 className="mb-2 text-xl font-semibold text-black dark:text-white">
          {title}
        </h3>

        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>

        {/* File Upload Area */}
        <div
          className={`mb-6 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive
              ? 'border-primary bg-primary bg-opacity-5'
              : 'border-stroke dark:border-strokedark'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              <FiFile size={32} className="text-primary" />
              <div className="text-left">
                <div className="font-medium text-black dark:text-white">
                  {selectedFile.name}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)} • {selectedFormat.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="ml-auto text-gray-500 hover:text-red-500"
              >
                <FiX size={20} />
              </button>
            </div>
          ) : (
            <>
              <FiUpload size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                Drag and drop your file here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded bg-primary px-4 py-2 text-white hover:bg-opacity-90"
              >
                Browse Files
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Supported formats: {formats.map(f => f.toUpperCase()).join(', ')}
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Format Selection */}
        {selectedFile && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              File Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={`flex items-center gap-2 rounded-lg border p-3 transition-all ${
                    selectedFormat === format
                      ? 'border-primary bg-primary bg-opacity-10'
                      : 'border-stroke hover:border-primary dark:border-strokedark'
                  }`}
                >
                  <span className="text-xl">{formatIcons[format]}</span>
                  <span className="font-medium uppercase">{format}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Format Info */}
        {selectedFile && (
          <div className="mb-6 rounded-lg bg-gray-2 p-4 dark:bg-meta-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-black dark:text-white">
              <FiAlertCircle size={16} />
              Expected Format
            </div>
            <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
              {formatDescriptions[selectedFormat]}
            </p>
            <pre className="overflow-x-auto rounded bg-white p-2 text-xs dark:bg-boxdark">
              {formatExamples[selectedFormat]}
            </pre>
          </div>
        )}

        {/* Validation Option */}
        {showValidationOption && selectedFile && (
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={validateOnImport}
                onChange={(e) => setValidateOnImport(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-black dark:text-white">
                Validate phone numbers after import
              </span>
            </label>
            <p className="ml-6 mt-1 text-xs text-gray-600 dark:text-gray-400">
              This will queue a validation task for all imported numbers
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="rounded border border-stroke px-6 py-2 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile}
            className={`flex items-center gap-2 rounded px-6 py-2 text-white ${
              selectedFile
                ? 'bg-primary hover:bg-opacity-90'
                : 'cursor-not-allowed bg-gray-400'
            }`}
          >
            <FiUpload size={16} />
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
