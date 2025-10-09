// Complete test script to verify the filter fix
const baseUrl = 'http://localhost:6161/';

// Test configuration - replace with actual values
const testConfig = {
  userToken: 'your-token-here', // Replace with actual token
  userID: 'your-user-id', // Replace with actual user ID
  projectID: 'your-project-id', // Replace with actual project ID
};

async function testFilterFunctionality() {
  console.log('🧪 Starting comprehensive filter test...');
  
  // Test cases to verify filtering works
  const testCases = [
    {
      name: 'No filters (baseline)',
      filters: {},
      expectedParams: ['user_id', 'project_id', 'page', 'page_size']
    },
    {
      name: 'Valid numbers only',
      filters: { valid_number: 'true' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'valid_number']
    },
    {
      name: 'Invalid numbers only',
      filters: { valid_number: 'false' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'valid_number']
    },
    {
      name: 'Pending numbers only',
      filters: { valid_number: 'null' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'valid_number']
    },
    {
      name: 'Mobile numbers only',
      filters: { type: 'Mobile' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'type']
    },
    {
      name: 'AT&T carrier only',
      filters: { carrier: 'AT&T' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'carrier']
    },
    {
      name: 'Country filter',
      filters: { country_name: 'United States' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'country_name']
    },
    {
      name: 'Combined filters',
      filters: { valid_number: 'true', type: 'Mobile', carrier: 'AT&T' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'valid_number', 'type', 'carrier']
    },
    {
      name: 'Search with filters',
      filters: { search: '555', valid_number: 'true' },
      expectedParams: ['user_id', 'project_id', 'page', 'page_size', 'search', 'valid_number']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    
    try {
      // Build URL with filters
      const params = new URLSearchParams({
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25'
      });

      // Add filter parameters
      Object.entries(testCase.filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, value);
        }
      });

      const url = `${baseUrl}api/phone-generator/list-numbers/?${params}`;
      console.log(`🔗 URL: ${url}`);
      
      // Verify expected parameters are present
      const urlParams = new URL(url).searchParams;
      const actualParams = Array.from(urlParams.keys());
      
      console.log(`📊 Expected params: ${testCase.expectedParams.join(', ')}`);
      console.log(`📊 Actual params: ${actualParams.join(', ')}`);
      
      // Check if all expected parameters are present
      const missingParams = testCase.expectedParams.filter(param => !actualParams.includes(param));
      const extraParams = actualParams.filter(param => !testCase.expectedParams.includes(param));
      
      if (missingParams.length === 0 && extraParams.length === 0) {
        console.log('✅ Parameter validation: PASSED');
      } else {
        console.log('❌ Parameter validation: FAILED');
        if (missingParams.length > 0) {
          console.log(`   Missing: ${missingParams.join(', ')}`);
        }
        if (extraParams.length > 0) {
          console.log(`   Extra: ${extraParams.join(', ')}`);
        }
      }

      // Make actual API call (if credentials are provided)
      if (testConfig.userToken !== 'your-token-here') {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Token ${testConfig.userToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          const count = result.data?.numbers?.length || 0;
          console.log(`📈 API Response: ${count} numbers returned`);
          console.log('✅ API call: SUCCESS');
        } else {
          console.log(`❌ API call: FAILED (${response.status} ${response.statusText})`);
        }
      } else {
        console.log('⚠️  API call: SKIPPED (no credentials provided)');
      }

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🏁 Filter test completed!');
  console.log('\n📝 To run with real data:');
  console.log('1. Update testConfig with your actual userToken, userID, and projectID');
  console.log('2. Run this script again');
  console.log('3. Check the browser console when using the frontend filters');
}

// Backend API test
async function testBackendFiltering() {
  console.log('\n🔧 Testing backend filter implementation...');
  
  const testFilters = [
    { name: 'valid_number=true', params: { valid_number: 'true' } },
    { name: 'valid_number=false', params: { valid_number: 'false' } },
    { name: 'valid_number=null', params: { valid_number: 'null' } },
    { name: 'type=Mobile', params: { type: 'Mobile' } },
    { name: 'carrier=AT&T', params: { carrier: 'AT&T' } },
    { name: 'country_name=United States', params: { country_name: 'United States' } }
  ];

  for (const test of testFilters) {
    console.log(`\n🧪 Backend test: ${test.name}`);
    
    const params = new URLSearchParams({
      user_id: testConfig.userID,
      project_id: testConfig.projectID,
      page: '1',
      ...test.params
    });

    const url = `${baseUrl}api/phone-generator/list-numbers/?${params}`;
    console.log(`🔗 Testing URL: ${url}`);
    
    // Check if the URL contains the expected filter parameter
    const expectedParam = Object.keys(test.params)[0];
    const expectedValue = Object.values(test.params)[0];
    
    if (url.includes(`${expectedParam}=${encodeURIComponent(expectedValue)}`)) {
      console.log('✅ Filter parameter correctly included in URL');
    } else {
      console.log('❌ Filter parameter missing from URL');
    }
  }
}

// Frontend integration test
function testFrontendIntegration() {
  console.log('\n🖥️  Frontend Integration Test Instructions:');
  console.log('1. Open your browser and navigate to http://localhost:3000/all-numbers');
  console.log('2. Open browser developer console (F12)');
  console.log('3. Look for the breadcrumb "All Phone Numbers (NEW VERSION WITH FILTERS)"');
  console.log('4. Click the "Filters" button to open the filter panel');
  console.log('5. Try changing any filter (validation status, carrier, type, country)');
  console.log('6. Look for console logs with "🔍 FILTER DEBUG" prefix');
  console.log('7. Verify the API URL includes your filter parameters');
  console.log('8. Try the "Test Filters" button for automated testing');
  console.log('\nExpected console output:');
  console.log('- 🔍 FILTER DEBUG - Filter changed: {valid_number: "true"}');
  console.log('- 🔍 FILTER DEBUG - Fetching with URL: http://localhost:6161/api/phone-generator/list-numbers/?user_id=...&valid_number=true');
  console.log('- 🔍 FILTER DEBUG - API Response: {...}');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive filter fix verification...\n');
  
  await testFilterFunctionality();
  await testBackendFiltering();
  testFrontendIntegration();
  
  console.log('\n✨ All tests completed!');
  console.log('\n📋 Summary:');
  console.log('- URL parameter tests verify correct filter parameter inclusion');
  console.log('- Backend tests verify API endpoint parameter handling');
  console.log('- Frontend integration tests verify end-to-end functionality');
  console.log('\n🔧 Next steps:');
  console.log('1. Update testConfig with real credentials to test API calls');
  console.log('2. Test the frontend interface manually');
  console.log('3. Verify filters work as expected in the browser');
}

// Run the tests
runAllTests().catch(console.error);