// Test script for god_bless_platform filtering functionality
const baseUrl = 'http://localhost:6161/';

// Test configuration - you'll need to update these with real values
const testConfig = {
  userToken: 'your-token-here', // Get from browser localStorage: god_bless_auth_token
  userID: 'your-user-id', // Get from browser localStorage: god_bless_user_data
  projectID: '24', // From your URL: project=24
};

async function testPlatformFiltering() {
  console.log('🚀 Testing god_bless_platform filtering functionality...');
  console.log('📍 Frontend URL: http://localhost:5173/phone-numbers/list?project=24');
  console.log('📍 Backend URL: http://localhost:6161/');
  
  // Test cases that match the frontend filtering
  const testCases = [
    {
      name: 'Basic request (no filters)',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25'
      }
    },
    {
      name: 'Valid numbers filter',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        valid_number: 'true'
      }
    },
    {
      name: 'Invalid numbers filter',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        valid_number: 'false'
      }
    },
    {
      name: 'Carrier filter (AT&T)',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        carrier: 'AT&T'
      }
    },
    {
      name: 'Type filter (Mobile)',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        type: 'Mobile'
      }
    },
    {
      name: 'Country filter',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        country_name: 'United States'
      }
    },
    {
      name: 'Combined filters (Valid + Mobile + AT&T)',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        valid_number: 'true',
        type: 'Mobile',
        carrier: 'AT&T'
      }
    },
    {
      name: 'Search filter',
      params: {
        user_id: testConfig.userID,
        project_id: testConfig.projectID,
        page: '1',
        page_size: '25',
        search: '555'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    
    try {
      const params = new URLSearchParams(testCase.params);
      const url = `${baseUrl}api/phone-generator/list-numbers/?${params}`;
      
      console.log(`🔗 URL: ${url}`);
      
      // Check URL parameters
      const urlObj = new URL(url);
      const actualParams = Array.from(urlObj.searchParams.keys());
      console.log(`📊 Parameters: ${actualParams.join(', ')}`);
      
      // Make API call if credentials are provided
      if (testConfig.userToken !== 'your-token-here') {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Token ${testConfig.userToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const result = await response.json();
          const count = result.data?.numbers?.length || 0;
          const total = result.data?.pagination?.count || 0;
          console.log(`📈 Results: ${count} numbers returned (${total} total)`);
          console.log('✅ API call: SUCCESS');
          
          // Log first few numbers for verification
          if (result.data?.numbers?.length > 0) {
            const firstNumber = result.data.numbers[0];
            console.log(`📱 Sample number: ${firstNumber.phone_number} - Valid: ${firstNumber.valid_number} - Carrier: ${firstNumber.carrier || 'N/A'}`);
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log(`❌ API call: FAILED`);
          console.log(`📝 Error: ${JSON.stringify(errorData, null, 2)}`);
        }
      } else {
        console.log('⚠️  API call: SKIPPED (no credentials provided)');
      }

    } catch (error) {
      console.log(`❌ Test failed: ${error.message}`);
    }
  }

  console.log('\n🏁 Platform filter tests completed!');
  console.log('\n📝 To test with real data:');
  console.log('1. Open http://localhost:5173/phone-numbers/list?project=24 in your browser');
  console.log('2. Open browser developer console (F12)');
  console.log('3. Get your auth token: localStorage.getItem("god_bless_auth_token")');
  console.log('4. Get your user data: localStorage.getItem("god_bless_user_data")');
  console.log('5. Update testConfig in this script with real values');
  console.log('6. Run this script again');
}

// Frontend integration test instructions
function printFrontendTestInstructions() {
  console.log('\n🖥️  Frontend Integration Test Instructions:');
  console.log('1. Open http://localhost:5173/phone-numbers/list?project=24');
  console.log('2. Open browser developer console (F12)');
  console.log('3. Click "Show Filters" button');
  console.log('4. Try changing filters:');
  console.log('   - Validation Status: Select "Valid Only" or "Invalid Only"');
  console.log('   - Carrier: Type "AT&T" or select from dropdown');
  console.log('   - Search: Type "555" or any phone number');
  console.log('5. Look for console logs with "🔍" prefix');
  console.log('6. Click "Test Filters" button for automated testing');
  console.log('\nExpected console output:');
  console.log('- 🔍 NumberList - Loading with filters: {...}');
  console.log('- 🔍 PhoneNumberService - Getting numbers with filters: {...}');
  console.log('- 🔍 PhoneNumberService - Final API parameters: {...}');
  console.log('- 🔍 PhoneNumberService - Full API URL: http://localhost:6161/api/phone-generator/list-numbers/?...');
}

// Backend verification
async function verifyBackendFiltering() {
  console.log('\n🔧 Backend Filter Verification:');
  console.log('The backend should now support these filter parameters:');
  console.log('- valid_number: "true" | "false" | "null"');
  console.log('- carrier: string (partial match)');
  console.log('- type: "Mobile" | "Landline" (exact match)');
  console.log('- country_name: string (partial match)');
  console.log('- search: string (phone number search)');
  
  console.log('\nBackend debug logs should show:');
  console.log('DEBUG - Received filters: valid_number=true, carrier=AT&T, phone_type=Mobile, country_name=United States');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive god_bless_platform filter verification...\n');
  
  await testPlatformFiltering();
  printFrontendTestInstructions();
  await verifyBackendFiltering();
  
  console.log('\n✨ All tests completed!');
  console.log('\n🔧 Next steps:');
  console.log('1. Test the frontend interface at http://localhost:5173/phone-numbers/list?project=24');
  console.log('2. Check browser console for debug logs');
  console.log('3. Verify filters work as expected');
  console.log('4. Check backend logs for filter parameters');
}

// Run the tests
runAllTests().catch(console.error);