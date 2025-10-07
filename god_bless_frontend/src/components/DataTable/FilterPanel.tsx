import React from 'react';
import { FilterPanelProps } from '../../types/dataTable';
import { FiX, FiRotateCcw } from 'react-icons/fi';

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  values,
  onChange,
  onReset,
  isOpen,
}) => {
  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    onChange({ ...values, [key]: value });
  };

  const handleMultiSelectChange = (key: string, option: string) => {
    const currentValues = values[key] || [];
    const newValues = currentValues.includes(option)
      ? currentValues.filter((v: string) => v !== option)
      : [...currentValues, option];
    onChange({ ...values, [key]: newValues });
  };

  return (
    <div className="mb-4 rounded-lg border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-lg font-semibold text-black dark:text-white">
          Filters
        </h4>
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <FiRotateCcw size={16} />
          Reset All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filters.map((filter) => (
          <div key={filter.key}>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              {filter.label}
            </label>

            {filter.type === 'text' && (
              <input
                type="text"
                value={values[filter.key] || ''}
                onChange={(e) => handleChange(filter.key, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              />
            )}

            {filter.type === 'number' && (
              <input
                type="number"
                value={values[filter.key] || ''}
                onChange={(e) => handleChange(filter.key, e.target.value)}
                placeholder={filter.placeholder}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              />
            )}

            {filter.type === 'select' && (
              <select
                value={values[filter.key] || ''}
                onChange={(e) => handleChange(filter.key, e.target.value)}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              >
                <option value="">All</option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}

            {filter.type === 'multiselect' && (
              <div className="space-y-2">
                {filter.options?.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={(values[filter.key] || []).includes(
                        option.value,
                      )}
                      onChange={() =>
                        handleMultiSelectChange(filter.key, option.value)
                      }
                      className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-strokedark"
                    />
                    <span className="text-black dark:text-white">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {filter.type === 'date' && (
              <input
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => handleChange(filter.key, e.target.value)}
                className="w-full rounded border border-stroke bg-transparent px-3 py-2 text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterPanel;
