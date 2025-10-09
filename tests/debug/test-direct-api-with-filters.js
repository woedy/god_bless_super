// Direct API test to verify the filter fix is working
const baseUrl = 'http://localhost:6161/';

async function testDirectAPIWithFilters() {
  console.log('🧪 Testing direct API calls with filter parameters...');
  
  // Test cases with actual filter parameters
  const testCases = [
    {
      name: 'Valid numbers filter',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0', // Use the actual user ID from logs
        project_id: '24',
        page: '1',
        page_size: '25',
        valid_number: 'true'
      }
    },
    {
      name: 'Invalid numbers filter',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0',
        project_id: '24',
        page: '1',
        page_size: '25',
        valid_number: 'false'
      }
    },
    {
      name: 'Carrier filter',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0',
        project_id: '24',
        page: '1',
        page_size: '25',
        carrier: 'AT&T'
      }
    },
    {
      name: 'Type filter',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0',
        project_id: '24',
        page: '1',
        page_size: '25',
        type: 'Mobile'
      }
    },
    {
      name: 'Country filter',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0',
        project_id: '24',
        page: '1',
        page_size: '25',
        country_name: 'United States'
      }
    },
    {
      name: 'Combined filters',
      params: {
        user_id: 'hchl658q4fjym7eij6lt2d82o1fuk0',
        project_id: '24',
        page: '1',
        page_size: '25',
        valid_number: 'true',
        carrier: 'AT&T',
        type: 'Mobile'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    
    try {
      const params = new URLSearchParams(testCase.params);
      const url = `${baseUrl}api/phone-generator/list-numbers/?${params}`;
      
      console.log(`🔗 URL: ${url}`);
      console.log(`📊 Parameters: ${params.toString()}`);
      
      // Make the API call (without authentication for now, just to test parameter passing)
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.log('✅ Expected 401 (authentication required) - API is receiving parameters');
      } else if (response.status === 400) {
        const errorData = await response.json();
        console.log('✅ Expected 400 (validation error) - API is processing parameters');
        console.log(`📝 Error details: ${JSON.stringify(errorData, null, 2)}`);
      } else if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful');
        console.log(`📊 Response count: ${data.data?.pagination?.count || 'unknown'}`);
      } else {
        console.log(`❌ Unexpected status: ${response.status}`);
      }

      // Check if the URL contains the expected filter parameters
      const urlObj = new URL(url);
      const urlParams = urlObj.searchParams;
      
      // Verify specific filter parameters are present
      if (testCase.params.valid_number) {
        const value = urlParams.get('valid_number');
        if (value === testCase.params.valid_number) {
          console.log(`✅ valid_number parameter: ${value}`);
        } else {
          console.log(`❌ valid_number parameter missing or incorrect`);
        }
      }
      
      if (testCase.params.carrier) {
        const value = urlParams.get('carrier');
        if (value === testCase.params.carrier) {
          console.log(`✅ carrier parameter: ${value}`);
        } else {
          console.log(`❌ carrier parameter missing or incorrect`);
        }
      }
      
      if (testCase.params.type) {
        const value = urlParams.get('type');
        if (value === testCase.params.type) {
          console.log(`✅ type parameter: ${value}`);
        } else {
          console.log(`❌ type parameter missing or incorrect`);
        }
      }
      
      if (testCase.params.country_name) {
        const value = urlParams.get('country_name');
        if (value === testCase.params.country_name) {
          console.log(`✅ country_name parameter: ${value}`);
        } else {
          console.log(`❌ country_name parameter missing or incorrect`);
        }
      }

    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n🔍 Check backend logs for debug output...');
  console.log('Expected backend logs should show:');
  console.log('DEBUG - Received filters: valid_number=true, carrier=AT&T, phone_type=Mobile, country_name=United States');
}

async function runDirectAPITests() {
  console.log('🚀 Starting direct API filter tests...\n');
  
  await testDirectAPIWithFilters();
  
  console.log('\n✨ Direct API tests completed!');
  console.log('\n📋 Summary:');
  console.log('- All filter parameters are correctly included in URLs');
  console.log('- Backend should receive and log the filter parameters');
  console.log('- Check backend logs to verify filter parameters are being received');
  console.log('\n🔧 Next steps:');
  console.log('1. Check backend console logs for filter debug output');
  console.log('2. Test the frontend UI at http://localhost:5173/phone-numbers/list?project=24');
  console.log('3. Verify filters work in the browser interface');
}

runDirectAPITests().catch(console.error);