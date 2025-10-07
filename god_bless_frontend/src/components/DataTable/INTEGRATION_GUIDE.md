# DataTable Integration Guide

This guide shows how to integrate the DataTable component into existing pages in the God Bless platform.

## Quick Start

### 1. Import the Component

```typescript
import { DataTable } from '../../components/DataTable';
import { Column, FilterConfig, ExportFormat } from '../../types/dataTable';
import { useClientSideDataTable } from '../../hooks/useDataTable';
import { exportData } from '../../components/DataTable/exportUtils';
```

### 2. Define Your Data Type

```typescript
interface PhoneNumber {
  id: number;
  number: string;
  carrier: string;
  type: string;
  areaCode: string;
  isValid: boolean;
  createdAt: string;
}
```

### 3. Configure Columns

```typescript
const columns: Column<PhoneNumber>[] = [
  {
    key: 'number',
    label: 'Phone Number',
    sortable: true,
    width: '200px',
  },
  {
    key: 'carrier',
    label: 'Carrier',
    sortable: true,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
  },
  {
    key: 'isValid',
    label: 'Status',
    sortable: true,
    render: (value: boolean) => (
      <span className={`badge ${value ? 'badge-success' : 'badge-danger'}`}>
        {value ? 'Valid' : 'Invalid'}
      </span>
    ),
  },
];
```

### 4. Configure Filters

```typescript
const filters: FilterConfig[] = [
  {
    key: 'carrier',
    label: 'Carrier',
    type: 'select',
    options: [
      { value: 'Verizon', label: 'Verizon' },
      { value: 'AT&T', label: 'AT&T' },
      { value: 'T-Mobile', label: 'T-Mobile' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    type: 'multiselect',
    options: [
      { value: 'Mobile', label: 'Mobile' },
      { value: 'Landline', label: 'Landline' },
    ],
  },
  {
    key: 'areaCode',
    label: 'Area Code',
    type: 'text',
    placeholder: 'Enter area code...',
  },
];
```

### 5. Use the Hook (Client-side)

```typescript
const {
  pagination,
  handleSort,
  handleFilter,
  handlePageChange,
  handlePageSizeChange,
  paginatedData,
  filteredData,
} = useClientSideDataTable(data, {
  initialPageSize: 25,
});
```

### 6. Render the Component

```typescript
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
```

## Integration Examples

### Example 1: Phone Number Management Page

Replace the existing table in `god_bless_frontend/src/pages/PhoneNumbers/AllNumbers.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { Column, FilterConfig } from '../../types/dataTable';
import { useClientSideDataTable } from '../../hooks/useDataTable';
import { exportData } from '../../components/DataTable/exportUtils';

const AllNumbers = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/phone-numbers/');
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    } finally {
      setLoading(false);
    }
  };

  const {
    pagination,
    handleSort,
    handleFilter,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    filteredData,
  } = useClientSideDataTable(data, { initialPageSize: 50 });

  const columns: Column<any>[] = [
    { key: 'number', label: 'Phone Number', sortable: true },
    { key: 'carrier', label: 'Carrier', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'areaCode', label: 'Area Code', sortable: true },
    {
      key: 'isValid',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={value ? 'text-success' : 'text-danger'}>
          {value ? 'Valid' : 'Invalid'}
        </span>
      ),
    },
  ];

  const filters: FilterConfig[] = [
    {
      key: 'carrier',
      label: 'Carrier',
      type: 'select',
      options: [
        { value: 'Verizon', label: 'Verizon' },
        { value: 'AT&T', label: 'AT&T' },
        { value: 'T-Mobile', label: 'T-Mobile' },
      ],
    },
    {
      key: 'type',
      label: 'Type',
      type: 'multiselect',
      options: [
        { value: 'Mobile', label: 'Mobile' },
        { value: 'Landline', label: 'Landline' },
      ],
    },
  ];

  return (
    <div>
      <h1>All Phone Numbers</h1>
      <DataTable
        data={paginatedData}
        columns={columns}
        filters={filters}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSort={handleSort}
        onFilter={handleFilter}
        onExport={(format) => exportData(format, filteredData, columns, 'phone_numbers')}
        enableExport={true}
      />
    </div>
  );
};

export default AllNumbers;
```

### Example 2: Server-side Filtering and Sorting

For large datasets, use server-side operations:

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [pagination, setPagination] = useState({
  page: 1,
  pageSize: 25,
  total: 0,
});
const [sortConfig, setSortConfig] = useState({ key: '', direction: null });
const [filterValues, setFilterValues] = useState({});

const fetchData = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      page: String(pagination.page),
      page_size: String(pagination.pageSize),
      sort_by: sortConfig.key,
      sort_order: sortConfig.direction || '',
      ...filterValues,
    });

    const response = await fetch(`/api/phone-numbers/?${params}`);
    const result = await response.json();
    
    setData(result.data);
    setPagination((prev) => ({ ...prev, total: result.total }));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, [pagination.page, pagination.pageSize, sortConfig, filterValues]);

const handleSort = (config) => {
  setSortConfig(config);
  setPagination((prev) => ({ ...prev, page: 1 }));
};

const handleFilter = (filters) => {
  setFilterValues(filters);
  setPagination((prev) => ({ ...prev, page: 1 }));
};

<DataTable
  data={data}
  columns={columns}
  filters={filters}
  loading={loading}
  pagination={pagination}
  onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
  onPageSizeChange={(pageSize) => setPagination((prev) => ({ ...prev, pageSize, page: 1 }))}
  onSort={handleSort}
  onFilter={handleFilter}
  onExport={(format, filteredData) => exportData(format, filteredData, columns, 'export')}
/>
```

### Example 3: Virtual Scrolling for Large Datasets

For datasets with thousands of rows:

```typescript
<DataTable
  data={largeDataset}
  columns={columns}
  enableVirtualScroll={true}
  rowHeight={50}
  // No pagination needed with virtual scrolling
/>
```

## Backend API Requirements

For server-side operations, your API should support:

### Query Parameters

- `page`: Current page number
- `page_size`: Items per page
- `sort_by`: Column key to sort by
- `sort_order`: 'asc' or 'desc'
- Filter parameters (e.g., `carrier=Verizon`, `type=Mobile`)

### Response Format

```json
{
  "data": [...],
  "total": 1000,
  "page": 1,
  "page_size": 25
}
```

## Styling Customization

The DataTable uses Tailwind CSS classes. To customize:

```typescript
<DataTable
  className="custom-table-class"
  // ... other props
/>
```

Or override in your CSS:

```css
.custom-table-class {
  /* Your custom styles */
}
```

## Common Patterns

### Pattern 1: Action Buttons in Rows

```typescript
{
  key: 'actions',
  label: 'Actions',
  render: (_, row) => (
    <div className="flex gap-2">
      <button onClick={() => handleEdit(row)}>Edit</button>
      <button onClick={() => handleDelete(row)}>Delete</button>
    </div>
  ),
}
```

### Pattern 2: Conditional Styling

```typescript
{
  key: 'status',
  label: 'Status',
  render: (value) => (
    <span className={`badge ${
      value === 'active' ? 'badge-success' :
      value === 'pending' ? 'badge-warning' :
      'badge-danger'
    }`}>
      {value}
    </span>
  ),
}
```

### Pattern 3: Date Formatting

```typescript
{
  key: 'createdAt',
  label: 'Created',
  sortable: true,
  render: (value) => new Date(value).toLocaleDateString(),
}
```

### Pattern 4: Links

```typescript
{
  key: 'name',
  label: 'Name',
  render: (value, row) => (
    <Link to={`/details/${row.id}`}>{value}</Link>
  ),
}
```

## Troubleshooting

### Issue: Filters not working
- Ensure filter keys match your data keys exactly
- Check that onFilter handler is properly updating data

### Issue: Sorting not working
- Verify sortable: true is set on columns
- Check that onSort handler is implemented

### Issue: Export not working
- Ensure exportData utility is imported
- Check browser console for errors
- Verify data is not empty

### Issue: Performance issues
- Enable virtual scrolling for large datasets
- Use server-side operations for very large datasets
- Reduce page size

## Best Practices

1. **Use TypeScript**: Define proper types for your data
2. **Memoize handlers**: Use useCallback for event handlers
3. **Server-side for scale**: Use server-side operations for > 10,000 rows
4. **Reasonable page sizes**: 25-100 items per page
5. **Loading states**: Always show loading indicators
6. **Error handling**: Handle API errors gracefully
7. **Empty states**: Provide helpful empty state messages
8. **Accessibility**: Ensure keyboard navigation works

## Migration Checklist

- [ ] Identify pages with tables to migrate
- [ ] Define data types and interfaces
- [ ] Configure columns with proper keys and labels
- [ ] Set up filters based on requirements
- [ ] Implement data fetching (client or server-side)
- [ ] Add export functionality
- [ ] Test sorting and filtering
- [ ] Test pagination
- [ ] Test export in all formats
- [ ] Verify mobile responsiveness
- [ ] Test dark mode
- [ ] Add loading and error states
- [ ] Update documentation

## Support

For issues or questions:
1. Check the README.md for detailed API documentation
2. Review the example files (DataTableExample.tsx, DataTableHookExample.tsx)
3. Check the test file for usage patterns
4. Review this integration guide

## Next Steps

After integrating the DataTable:
1. Migrate existing table pages one by one
2. Gather user feedback
3. Optimize performance based on usage
4. Add custom features as needed
