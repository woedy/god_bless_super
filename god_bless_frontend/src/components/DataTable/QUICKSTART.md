# DataTable Quick Start Guide

Get started with the DataTable component in 5 minutes!

## Step 1: Import

```typescript
import { DataTable } from '../../components/DataTable';
import { Column, FilterConfig } from '../../types/dataTable';
import { useClientSideDataTable } from '../../hooks/useDataTable';
import { exportData } from '../../components/DataTable/exportUtils';
```

## Step 2: Define Your Data

```typescript
interface MyData {
  id: number;
  name: string;
  status: string;
  date: string;
}

const myData: MyData[] = [
  { id: 1, name: 'Item 1', status: 'active', date: '2024-01-15' },
  { id: 2, name: 'Item 2', status: 'inactive', date: '2024-01-16' },
];
```

## Step 3: Configure Columns

```typescript
const columns: Column<MyData>[] = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'date', label: 'Date', sortable: true },
];
```

## Step 4: Add Filters (Optional)

```typescript
const filters: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
];
```

## Step 5: Use the Hook

```typescript
const {
  pagination,
  handleSort,
  handleFilter,
  handlePageChange,
  handlePageSizeChange,
  paginatedData,
  filteredData,
} = useClientSideDataTable(myData, { initialPageSize: 25 });
```

## Step 6: Render

```typescript
return (
  <DataTable
    data={paginatedData}
    columns={columns}
    filters={filters}
    pagination={pagination}
    onPageChange={handlePageChange}
    onPageSizeChange={handlePageSizeChange}
    onSort={handleSort}
    onFilter={handleFilter}
    onExport={(format) => exportData(format, filteredData, columns, 'my_export')}
    enableExport={true}
  />
);
```

## Complete Example

```typescript
import React from 'react';
import { DataTable } from '../../components/DataTable';
import { Column, FilterConfig } from '../../types/dataTable';
import { useClientSideDataTable } from '../../hooks/useDataTable';
import { exportData } from '../../components/DataTable/exportUtils';

interface MyData {
  id: number;
  name: string;
  status: string;
}

const MyPage: React.FC = () => {
  const data: MyData[] = [
    { id: 1, name: 'Item 1', status: 'active' },
    { id: 2, name: 'Item 2', status: 'inactive' },
  ];

  const columns: Column<MyData>[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
  ];

  const filters: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  const {
    pagination,
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    filteredData,
  } = useClientSideDataTable(data, { initialPageSize: 25 });

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">My Data</h1>
      <DataTable
        data={paginatedData}
        columns={columns}
        filters={filters}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onFilter={handleFilter}
        onExport={(format) => exportData(format, filteredData, columns, 'export')}
        enableExport={true}
      />
    </div>
  );
};

export default MyPage;
```

## That's It!

You now have a fully functional data table with:
- ✅ Sorting
- ✅ Filtering
- ✅ Pagination
- ✅ Export (CSV, TXT, JSON, DOC)
- ✅ Dark mode support
- ✅ Responsive design

## Next Steps

- Check `README.md` for advanced features
- See `INTEGRATION_GUIDE.md` for migration instructions
- Review `DataTableExample.tsx` for more examples
- Customize columns with custom render functions
- Add more filter types as needed

## Need Help?

- Review the examples in the DataTable folder
- Check the type definitions in `types/dataTable.ts`
- See the integration guide for common patterns
