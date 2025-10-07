// Test script to verify export functionality with filters
const baseUrl = 'http://localhost:6161/';

// Test configuration - replace with actual values
const testConfig = {
  userToken: 'your-token-here', // Get from browser localStorage: god_bless_auth_token
  userID: 'your-user-id', // Get from browser localStorage: god_bless_user_data
  projectID: '24', // From your URL: project=24
};

async function testExportWithFilters() {
  console.log('🚀 Testing export functionality with filters...');
  console.log('📍 Frontend URL: http://localhost:5173/phone-numbers/list?project=24');
  
  // Test cases for export with different filters
  const exportTests = [
    {
      name: 'Export all numbers (no filters)',
      requestData: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        format: 'csv',
        include_invalid: true,
        filters: {}
      }
    },
    {
      name: 'Export only valid numbers',
      requestData: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        format: 'csv',
        include_invalid: false,
        filters: {
          valid_number: 'true'
        }
      }
    },
    {
      name: 'Export T-Mobile numbers only',
      requestData: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        format: 'csv',
        include_invalid: true,
        filters: {
          carrier: 'T-Mobile'
        }
      }
    },
    {
      name: 'Export valid mobile numbers',
      requestData: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        format: 'csv',
        include_invalid: false,
        filters: {
          valid_number: 'true',
          type: 'Mobile'
        }
      }
    },
    {
      name: 'Export numbers with search filter',
      requestData: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        format: 'csv',
        include_invalid: true,
        filters: {
          search: '555'
        }
      }
    }
  ];

  for (const test of exportTests) {
    console.log(`\n📋 Testing: ${test.name}`);
    
    try {
      const url = `${baseUrl}api/phone-generator/export/`;
      console.log(`🔗 POST URL: ${url}`);
      console.log(`📊 Request data:`, JSON.stringify(test.requestData, null, 2));
      
      if (testConfig.userToken !== 'your-token-here') {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${testConfig.userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(test.requestData)
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Export request: SUCCESS');
          
          if (result.data?.task_id) {
            console.log(`📋 Background task started: ${result.data.task_id}`);
            console.log(`📊 Total records: ${result.data.total_records || 'Unknown'}`);
          } else if (result.data?.content) {
            console.log(`📄 Direct export completed`);
            console.log(`📊 Total records: ${result.data.total_records || 'Unknown'}`);
            console.log(`📁 Filename: ${result.data.filename || 'Unknown'}`);
            console.log(`📝 Content preview: ${result.data.content.substring(0, 100)}...`);
          } else {
            console.log(`⚠️ Unexpected response format:`, result);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`❌ Export request: FAILED`);
          console.log(`📝 Error: ${JSON.stringify(errorData, null, 2)}`);
        }
      } else {
        console.log('⚠️  Export test: SKIPPED (no credentials provided)');
      }

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🏁 Export filter tests completed!');
}

// Frontend integration test instructions
function printExportTestInstructions() {
  console.log('\n🖥️  Frontend Export Test Instructions:');
  console.log('1. Open http://localhost:5173/phone-numbers/list?project=24');
  console.log('2. Open browser developer console (F12)');
  console.log('3. Apply some filters:');
  console.log('   - Click "Show Filters"');
  console.log('   - Set "Validation Status" to "Valid Only"');
  console.log('   - Or set "Carrier" to "T-Mobile"');
  console.log('   - Or set "Line Type" to "Mobile"');
  console.log('4. Click "Export Numbers" button (should show "Filtered" badge)');
  console.log('5. Select export format and click "Start Export"');
  console.log('6. Look for console logs with "🔍" prefix');
  console.log('7. Verify the exported file contains only filtered results');
  console.log('\nExpected console output:');
  console.log('- 🔍 Export button clicked - Current filters: {...}');
  console.log('- 🔍 PhoneNumberService - Exporting numbers with params: {...}');
  console.log('- 🔍 PhoneNumberService - Export filters received: {...}');
  console.log('- 🔍 PhoneNumberService - Final export request data: {...}');
  console.log('- Backend: DEBUG - Export filters applied: {...}');
  console.log('- Backend: DEBUG - Export queryset count: X');
}

// Backend verification
function printBackendVerification() {
  console.log('\n🔧 Backend Export Filter Verification:');
  console.log('The backend export endpoint now supports these filters:');
  console.log('- search: string (phone number search)');
  console.log('- valid_number: "true" | "false" | "null"');
  console.log('- carrier: string (partial match)');
  console.log('- type: "Mobile" | "Landline" (exact match)');
  console.log('- country_name: string (partial match)');
  console.log('- area_code: string');
  
  console.log('\nBackend debug logs should show:');
  console.log('DEBUG - Export filters applied: {carrier: "T-Mobile", valid_number: "true"}');
  console.log('DEBUG - Export queryset count: X (filtered count)');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting export with filters verification...\n');
  
  await testExportWithFilters();
  printExportTestInstructions();
  printBackendVerification();
  
  console.log('\n✨ All export tests completed!');
  console.log('\n🔧 Next steps:');
  console.log('1. Test the export functionality in the browser');
  console.log('2. Apply filters and verify export respects them');
  console.log('3. Check that exported files contain only filtered results');
  console.log('4. Verify backend logs show correct filter counts');
}

// Run the tests
runAllTests().catch(console.error);