# Advanced DataTable Component

A comprehensive, reusable data table component with advanced filtering, sorting, pagination, and export capabilities.

## Features

- ✅ **Sorting**: Click column headers to sort data (ascending, descending, or no sort)
- ✅ **Advanced Filtering**: Multiple filter types (text, select, multiselect, date, number)
- ✅ **Pagination**: Built-in pagination with customizable page sizes
- ✅ **Export**: Multi-format export (CSV, TXT, JSON, DOC)
- ✅ **URL State Management**: Filter values persist in URL for sharing and bookmarking
- ✅ **Virtual Scrolling**: Efficient rendering for large datasets
- ✅ **Responsive Design**: Mobile-friendly with dark mode support
- ✅ **Custom Rendering**: Custom cell renderers for complex data
- ✅ **Server-side & Client-side**: Supports both server-side and client-side operations

## Installation

The component is already integrated into the project. Import it like this:

```typescript
import { DataTable } from '../components/DataTable';
import { Column, FilterConfig } from '../types/dataTable';
```

## Basic Usage

```typescript
import React from 'react';
import { DataTable } from '../components/DataTable';
import { Column } from '../types/dataTable';

interface MyData {
  id: number;
  name: string;
  email: string;
}

const MyComponent = () => {
  const data: MyData[] = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  const columns: Column<MyData>[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
  ];

  return <DataTable data={data} columns={columns} />;
};
```

## Advanced Usage with Filters

```typescript
const filters: FilterConfig[] = [
  {
    key: 'carrier',
    label: 'Carrier',
    type: 'select',
    options: [
      { value: 'verizon', label: 'Verizon' },
      { value: 'att', label: 'AT&T' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'multiselect',
    options: [
      { value: 'mobile', label: 'Mobile' },
      { value: 'landline', label: 'Landline' },
    ],
  },
  {
    key: 'areaCode',
    label: 'Area Code',
    type: 'text',
    placeholder: 'Enter area code...',
  },
];

<DataTable
  data={data}
  columns={columns}
  filters={filters}
  onFilter={(filters) => console.log('Filters changed:', filters)}
/>
```

## Custom Cell Rendering

```typescript
const columns: Column<PhoneData>[] = [
  {
    key: 'status',
    label: 'Status',
    render: (value: boolean) => (
      <span className={value ? 'text-success' : 'text-danger'}>
        {value ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];
```

## Pagination

```typescript
const [pagination, setPagination] = useState({
  page: 1,
  pageSize: 25,
  total: 1000,
});

<DataTable
  data={data}
  columns={columns}
  pagination={pagination}
  onPageChange={(page) => setPagination({ ...pagination, page })}
  onPageSizeChange={(pageSize) => setPagination({ ...pagination, pageSize })}
/>
```

## Export Functionality

```typescript
import { exportData } from '../components/DataTable/exportUtils';

const handleExport = (format: ExportFormat, filteredData: MyData[]) => {
  exportData(format, filteredData, columns, 'my_export');
};

<DataTable
  data={data}
  columns={columns}
  enableExport={true}
  onExport={handleExport}
/>
```

## Virtual Scrolling for Large Datasets

```typescript
<DataTable
  data={largeDataset}
  columns={columns}
  enableVirtualScroll={true}
  rowHeight={50}
/>
```

## Server-side Operations

For server-side sorting, filtering, and pagination:

```typescript
const handleSort = async (sortConfig: SortConfig) => {
  const response = await fetch(`/api/data?sort=${sortConfig.key}&order=${sortConfig.direction}`);
  const newData = await response.json();
  setData(newData);
};

const handleFilter = async (filters: FilterValue) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/data?${params}`);
  const newData = await response.json();
  setData(newData);
};

<DataTable
  data={data}
  columns={columns}
  onSort={handleSort}
  onFilter={handleFilter}
/>
```

## Props Reference

### DataTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | Required | Array of data objects to display |
| `columns` | `Column<T>[]` | Required | Column definitions |
| `filters` | `FilterConfig[]` | `[]` | Filter configurations |
| `loading` | `boolean` | `false` | Show loading state |
| `pagination` | `PaginationConfig` | `undefined` | Pagination configuration |
| `onPageChange` | `(page: number) => void` | `undefined` | Page change handler |
| `onPageSizeChange` | `(size: number) => void` | `undefined` | Page size change handler |
| `onSort` | `(config: SortConfig) => void` | `undefined` | Sort handler (server-side) |
| `onFilter` | `(filters: FilterValue) => void` | `undefined` | Filter handler (server-side) |
| `onExport` | `(format: ExportFormat, data: T[]) => void` | `undefined` | Export handler |
| `enableExport` | `boolean` | `true` | Enable export functionality |
| `enableVirtualScroll` | `boolean` | `false` | Enable virtual scrolling |
| `rowHeight` | `number` | `50` | Row height for virtual scrolling |
| `emptyMessage` | `string` | `'No data available'` | Message when no data |
| `className` | `string` | `''` | Additional CSS classes |

### Column Definition

```typescript
interface Column<T> {
  key: string;                    // Data key
  label: string;                  // Column header label
  sortable?: boolean;             // Enable sorting
  filterable?: boolean;           // Enable filtering
  render?: (value: any, row: T) => React.ReactNode;  // Custom renderer
  width?: string;                 // Column width
}
```

### Filter Configuration

```typescript
interface FilterConfig {
  key: string;                    // Data key to filter
  label: string;                  // Filter label
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  options?: Array<{ value: string; label: string }>;  // For select types
  placeholder?: string;           // Input placeholder
}
```

## Filter Types

- **text**: Text input for string matching
- **number**: Number input for numeric filtering
- **select**: Single-select dropdown
- **multiselect**: Multiple checkbox selection
- **date**: Date picker

## Export Formats

- **CSV**: Comma-separated values (Excel compatible)
- **TXT**: Plain text with aligned columns
- **JSON**: JavaScript Object Notation
- **DOC**: Microsoft Word document (HTML-based)

## URL State Management

Filters are automatically synced with the URL query parameters:
- Enables sharing filtered views via URL
- Preserves filter state on page refresh
- Supports browser back/forward navigation

Example URL: `/phones?carrier=verizon&type=mobile,landline&areaCode=555`

## Styling

The component uses Tailwind CSS and supports dark mode out of the box. It follows the existing design system with:
- `bg-white dark:bg-boxdark` for backgrounds
- `border-stroke dark:border-strokedark` for borders
- `text-black dark:text-white` for text

## Performance Tips

1. **Virtual Scrolling**: Enable for datasets > 1000 rows
2. **Server-side Operations**: Use for large datasets to reduce client-side processing
3. **Memoization**: Wrap handlers in `useCallback` to prevent unnecessary re-renders
4. **Pagination**: Use reasonable page sizes (25-100 items)

## Examples

See `DataTableExample.tsx` for a complete working example with phone number data.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
