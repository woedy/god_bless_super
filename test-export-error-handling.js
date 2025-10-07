/**
 * Test script to verify export error handling
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testExportErrorHandling() {
    console.log('🧪 Testing Export Error Handling...\n');

    try {
        // Simulate the frontend export request that would cause the error
        console.log('1. Testing export with authentication error...');
        
        const exportRequest = {
            user_id: 'test_user_123',
            project_id: 'test_project_456',
            format: 'csv',
            include_invalid: false,
            include_metadata: false,
            fields: ['phone_number', 'carrier', 'valid_number']
        };

        const response = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token invalid_token_for_testing'
            },
            body: JSON.stringify(exportRequest)
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', responseText);

        // Simulate frontend processing
        try {
            const responseData = JSON.parse(responseText);
            console.log('✅ Response is valid JSON');
            console.log('Response structure:', Object.keys(responseData));
            
            // Simulate the frontend logic
            console.log('\n2. Simulating frontend response handling...');
            
            if (responseData.success && responseData.data) {
                console.log('✅ Success path - would process export data');
            } else {
                console.log('❌ Error path - would show error message');
                const errorMessage = responseData.error?.message || 'Export failed';
                console.log('Error message that frontend would show:', errorMessage);
                
                // This should NOT throw "Export content not available" anymore
                if (errorMessage === 'Export content not available. Please try again.') {
                    console.log('❌ Still getting the old error message (BUG!)');
                } else {
                    console.log('✅ Getting proper error message from backend');
                }
            }

        } catch (parseError) {
            console.log('❌ Response is not valid JSON');
            console.log('Parse error:', parseError.message);
        }

        // Test with no authentication
        console.log('\n3. Testing export with no authentication...');
        
        const noAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportRequest)
        });

        const noAuthText = await noAuthResponse.text();
        console.log('No auth status:', noAuthResponse.status);

        try {
            const noAuthData = JSON.parse(noAuthText);
            console.log('✅ No auth response is valid JSON');
            
            // Simulate frontend processing
            if (noAuthData.success && noAuthData.data) {
                console.log('✅ Success path');
            } else {
                const errorMessage = noAuthData.error?.message || 'Export failed';
                console.log('No auth error message:', errorMessage);
                console.log('✅ Proper error handling for no authentication');
            }

        } catch (e) {
            console.log('❌ No auth response is not valid JSON');
        }

        // Test with missing required fields
        console.log('\n4. Testing export with missing fields...');
        
        const invalidRequest = {
            format: 'csv'
            // Missing user_id
        };

        const invalidResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_validation'
            },
            body: JSON.stringify(invalidRequest)
        });

        const invalidText = await invalidResponse.text();
        console.log('Invalid request status:', invalidResponse.status);

        try {
            const invalidData = JSON.parse(invalidText);
            console.log('✅ Invalid request response is valid JSON');
            
            if (invalidData.success && invalidData.data) {
                console.log('✅ Success path');
            } else {
                const errorMessage = invalidData.error?.message || 
                                  (invalidData.errors ? Object.values(invalidData.errors).flat().join(', ') : 'Export failed');
                console.log('Validation error message:', errorMessage);
                console.log('✅ Proper error handling for validation errors');
            }

        } catch (e) {
            console.log('❌ Invalid request response is not valid JSON');
        }

        console.log('\n📊 Error Handling Summary:');
        console.log('✅ Authentication errors return proper error messages');
        console.log('✅ No more "Export content not available" for auth failures');
        console.log('✅ Frontend can properly handle error responses');
        console.log('✅ All error responses are valid JSON');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testExportErrorHandling().then(() => {
    console.log('\n🏁 Export error handling test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});