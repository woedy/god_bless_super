/**
 * Test script for Filter and Export functionality
 * 
 * This script tests:
 * 1. Filter functionality on List & Manage page
 * 2. Export functionality (both quick export and full export)
 * 3. Backend integration
 */

const baseUrl = 'http://localhost:8000/';
const userToken = 'your-token-here'; // Replace with actual token
const userId = 'your-user-id'; // Replace with actual user ID
const projectId = 'your-project-id'; // Replace with actual project ID

console.log('🧪 Testing Filter and Export Functionality...\n');

// Test 1: Filter functionality
async function testFilters() {
  console.log('📋 Test 1: Filter Functionality');
  
  const filterTests = [
    {
      name: 'Search Filter',
      filters: { search: '555', projectId, page: 1, pageSize: 10 }
    },
    {
      name: 'Validation Status Filter',
      filters: { isValid: true, projectId, page: 1, pageSize: 10 }
    },
    {
      name: 'Carrier Filter',
      filters: { carrier: 'Verizon', projectId, page: 1, pageSize: 10 }
    },
    {
      name: 'Area Code Filter',
      filters: { areaCode: '555', projectId, page: 1, pageSize: 10 }
    },
    {
      name: 'Combined Filters',
      filters: { 
        search: '555', 
        isValid: true, 
        carrier: 'Verizon',
        projectId, 
        page: 1, 
        pageSize: 10 
      }
    }
  ];

  for (const test of filterTests) {
    try {
      console.log(`\n  Testing: ${test.name}`);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('user_id', userId);
      params.append('project_id', test.filters.projectId);
      params.append('page', test.filters.page.toString());
      params.append('page_size', test.filters.pageSize.toString());
      
      if (test.filters.search) params.append('search', test.filters.search);
      if (test.filters.isValid !== undefined) params.append('valid_number', test.filters.isValid.toString());
      if (test.filters.carrier) params.append('carrier', test.filters.carrier);
      if (test.filters.areaCode) params.append('area_code', test.filters.areaCode);

      const response = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${params}`, {
        headers: {
          'Authorization': `Token ${userToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.message === 'Successful') {
        console.log(`    ✅ ${test.name}: ${data.data.numbers.length} results`);
        console.log(`       Total count: ${data.data.pagination.count}`);
      } else {
        console.log(`    ❌ ${test.name}: Failed - ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`    ❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

// Test 2: Export functionality
async function testExport() {
  console.log('\n📤 Test 2: Export Functionality');
  
  const exportTests = [
    {
      name: 'CSV Export (Small)',
      data: {
        user_id: userId,
        project_id: projectId,
        format: 'csv',
        use_background: false,
        fields: ['phone_number', 'carrier', 'type', 'area_code', 'valid_number'],
        filters: { valid_number: true }
      }
    },
    {
      name: 'JSON Export',
      data: {
        user_id: userId,
        project_id: projectId,
        format: 'json',
        use_background: false,
        fields: ['phone_number', 'carrier', 'type', 'country_name', 'valid_number', 'created_at']
      }
    },
    {
      name: 'TXT Export',
      data: {
        user_id: userId,
        project_id: projectId,
        format: 'txt',
        use_background: false,
        fields: ['phone_number']
      }
    }
  ];

  for (const test of exportTests) {
    try {
      console.log(`\n  Testing: ${test.name}`);
      
      const response = await fetch(`${baseUrl}api/phone-generator/export/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${userToken}`
        },
        body: JSON.stringify(test.data)
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.task_id) {
          console.log(`    ✅ ${test.name}: Background task started`);
          console.log(`       Task ID: ${data.data.task_id}`);
          console.log(`       Total records: ${data.data.total_records}`);
        } else {
          console.log(`    ✅ ${test.name}: Direct export completed`);
          console.log(`       Response type: ${typeof data}`);
        }
      } else {
        console.log(`    ❌ ${test.name}: Failed - ${data.message || 'Unknown error'}`);
        if (data.errors) {
          console.log(`       Errors:`, data.errors);
        }
      }
    } catch (error) {
      console.log(`    ❌ ${test.name}: Error - ${error.message}`);
    }
  }
}

// Test 3: Quick CSV export (frontend functionality)
async function testQuickExport() {
  console.log('\n⚡ Test 3: Quick Export (Frontend)');
  
  try {
    // Simulate selected numbers data
    const selectedNumbers = [
      {
        id: '1',
        number: '15551234567',
        formattedNumber: '+1 (555) 123-4567',
        carrier: 'Verizon',
        lineType: 'mobile',
        country: 'United States',
        isValid: true,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        number: '15559876543',
        formattedNumber: '+1 (555) 987-6543',
        carrier: 'AT&T',
        lineType: 'mobile',
        country: 'United States',
        isValid: true,
        createdAt: new Date().toISOString()
      }
    ];

    // Create CSV content (same logic as in NumberList component)
    const headers = ['Phone Number', 'Carrier', 'Line Type', 'Country', 'Status', 'Created'];
    const csvContent = [
      headers.join(','),
      ...selectedNumbers.map(number => [
        `"${number.formattedNumber || number.number}"`,
        `"${number.carrier || ''}"`,
        `"${number.lineType || ''}"`,
        `"${number.country || ''}"`,
        `"${number.isValid ? 'Valid' : 'Invalid'}"`,
        `"${number.createdAt ? new Date(number.createdAt).toLocaleDateString() : ''}"`
      ].join(','))
    ].join('\n');

    console.log('  ✅ Quick Export CSV Content Generated:');
    console.log('     Headers:', headers.join(', '));
    console.log(`     Rows: ${selectedNumbers.length}`);
    console.log(`     Content length: ${csvContent.length} characters`);
    console.log('     Sample row:', csvContent.split('\n')[1]);

  } catch (error) {
    console.log(`  ❌ Quick Export: Error - ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testFilters();
    await testExport();
    await testQuickExport();
    
    console.log('\n🎯 Test Summary:');
    console.log('1. Filter functionality should work with real-time updates');
    console.log('2. Export should support multiple formats (CSV, JSON, TXT)');
    console.log('3. Quick export should generate proper CSV content');
    console.log('4. All features should be properly wired to backend APIs');
    
    console.log('\n💡 To verify:');
    console.log('- Check browser console for detailed logs');
    console.log('- Test filter combinations on List & Manage page');
    console.log('- Try exporting numbers in different formats');
    console.log('- Test quick export with selected numbers');
    
  } catch (error) {
    console.error('Test execution failed:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testFilterAndExport = runAllTests;
  console.log('💡 Run window.testFilterAndExport() in browser console to test');
} else {
  runAllTests();
}