import React from 'react';
import { ExportModalProps, ExportFormat } from '../../types/dataTable';
import { FiDownload, FiX } from 'react-icons/fi';

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  formats = ['csv', 'txt', 'json', 'doc'],
}) => {
  if (!isOpen) return null;

  const formatIcons: Record<ExportFormat, string> = {
    csv: '📊',
    txt: '📄',
    json: '{ }',
    doc: '📝',
  };

  const formatDescriptions: Record<ExportFormat, string> = {
    csv: 'Comma-separated values for spreadsheets',
    txt: 'Plain text format',
    json: 'JavaScript Object Notation',
    doc: 'Microsoft Word document',
  };

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-boxdark">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiX size={20} />
        </button>

        <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
          Export Data
        </h3>

        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Choose a format to export your filtered data
        </p>

        <div className="space-y-3">
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="flex w-full items-center gap-4 rounded-lg border border-stroke p-4 transition-all hover:border-primary hover:bg-gray-2 dark:border-strokedark dark:hover:border-primary dark:hover:bg-meta-4"
            >
              <span className="text-2xl">{formatIcons[format]}</span>
              <div className="flex-1 text-left">
                <div className="font-medium uppercase text-black dark:text-white">
                  {format}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {formatDescriptions[format]}
                </div>
              </div>
              <FiDownload className="text-primary" size={20} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
