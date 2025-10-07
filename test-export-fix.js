/**
 * Test script to verify the export functionality fix
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testExportFix() {
    console.log('🧪 Testing Export Functionality Fix...\n');

    try {
        // Step 1: Test health check
        console.log('1. Testing backend health...');
        const healthResponse = await fetch(`${API_BASE_URL}/health/`);
        const healthData = await healthResponse.json();
        console.log('✅ Backend is healthy:', healthData.status);

        // Step 2: Test export endpoint without authentication (should fail with proper error)
        console.log('\n2. Testing export endpoint without authentication...');
        try {
            const exportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: 'test_user',
                    format: 'csv',
                    include_invalid: false,
                    include_metadata: false
                })
            });

            const responseText = await exportResponse.text();
            console.log('Response status:', exportResponse.status);
            console.log('Response headers:', Object.fromEntries(exportResponse.headers.entries()));
            console.log('Response body:', responseText);

            if (exportResponse.status === 401) {
                console.log('✅ Export endpoint properly requires authentication');
            } else if (exportResponse.status === 500) {
                console.log('❌ Export endpoint still returns 500 error');
                console.log('Response body:', responseText);
                
                // Check if it's a JSON parsing issue
                try {
                    const jsonData = JSON.parse(responseText);
                    console.log('✅ Response is valid JSON:', jsonData);
                } catch (parseError) {
                    console.log('❌ Response is not valid JSON - this was the original issue!');
                    console.log('Parse error:', parseError.message);
                }
            } else {
                console.log('Response status:', exportResponse.status);
                console.log('Response body:', responseText);
            }
        } catch (error) {
            console.log('❌ Network error:', error.message);
        }

        // Step 3: Test with mock authentication (if we can create a test user)
        console.log('\n3. Testing export endpoint structure...');
        
        // Test if the endpoint exists and returns proper error format
        const testResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token invalid_token_for_testing'
            },
            body: JSON.stringify({
                user_id: 'test_user',
                format: 'csv'
            })
        });

        const testResponseText = await testResponse.text();
        console.log('Test response status:', testResponse.status);
        console.log('Test response body:', testResponseText);

        // Check if response is valid JSON
        try {
            const jsonData = JSON.parse(testResponseText);
            console.log('✅ Export endpoint returns valid JSON response');
            console.log('Response structure:', jsonData);
        } catch (parseError) {
            console.log('❌ Export endpoint still returns invalid JSON');
            console.log('Parse error:', parseError.message);
            console.log('Raw response:', testResponseText);
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testExportFix().then(() => {
    console.log('\n🏁 Export fix test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});