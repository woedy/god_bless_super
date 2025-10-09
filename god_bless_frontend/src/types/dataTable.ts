export type SortDirection = 'asc' | 'desc' | null;
export type ExportFormat = 'csv' | 'txt' | 'json' | 'doc';
export type ImportFormat = 'csv' | 'txt' | 'json';

export interface ImportOptions {
  validateOnImport?: boolean;
}

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterValue {
  [key: string]: any;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  filters?: FilterConfig[];
  loading?: boolean;
  pagination?: PaginationConfig;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSort?: (sortConfig: SortConfig) => void;
  onFilter?: (filters: FilterValue) => void;
  onExport?: (format: ExportFormat, filteredData: T[]) => void;
  onImport?: (file: File, format: ImportFormat, options?: ImportOptions) => void;
  enableExport?: boolean;
  enableImport?: boolean;
  enableVirtualScroll?: boolean;
  rowHeight?: number;
  emptyMessage?: string;
  className?: string;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  formats?: ExportFormat[];
}

export interface FilterPanelProps {
  filters: FilterConfig[];
  values: FilterValue;
  onChange: (values: FilterValue) => void;
  onReset: () => void;
  isOpen: boolean;
}
