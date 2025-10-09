/**
 * Debug script to check actual export response structure
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function debugExportResponse() {
    console.log('🔍 Debugging Export Response Structure...\n');

    try {
        // Test with different scenarios to see response structure
        console.log('1. Testing export response structure...');
        
        const testRequest = {
            user_id: 'test_user_123',
            project_id: 'test_project_456',
            format: 'csv',
            include_invalid: false,
            include_metadata: false,
            fields: ['phone_number', 'carrier', 'valid_number']
        };

        console.log('Request:', JSON.stringify(testRequest, null, 2));

        const response = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_debug'
            },
            body: JSON.stringify(testRequest)
        });

        const responseText = await response.text();
        console.log('\n--- Raw Response ---');
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        console.log('Body length:', responseText.length);
        console.log('Body preview:', responseText.substring(0, 500));

        try {
            const responseData = JSON.parse(responseText);
            console.log('\n--- Parsed Response ---');
            console.log('Success field:', responseData.success);
            console.log('Message field:', responseData.message);
            console.log('Error field:', responseData.error);
            console.log('Errors field:', responseData.errors);
            
            if (responseData.data) {
                console.log('\n--- Data Object ---');
                console.log('Data keys:', Object.keys(responseData.data));
                console.log('Data structure:', JSON.stringify(responseData.data, null, 2));
                
                // Check specific fields
                console.log('\nField Analysis:');
                console.log('- content field exists:', 'content' in responseData.data);
                console.log('- content type:', typeof responseData.data.content);
                console.log('- content value:', responseData.data.content);
                console.log('- task_id field exists:', 'task_id' in responseData.data);
                console.log('- taskId field exists:', 'taskId' in responseData.data);
                console.log('- downloadUrl field exists:', 'downloadUrl' in responseData.data);
                console.log('- filename field exists:', 'filename' in responseData.data);
                console.log('- format field exists:', 'format' in responseData.data);
                console.log('- total_records field exists:', 'total_records' in responseData.data);
            } else {
                console.log('No data object in response');
            }

        } catch (parseError) {
            console.log('\n❌ Response is not valid JSON');
            console.log('Parse error:', parseError.message);
        }

        // Test with minimal request
        console.log('\n\n2. Testing minimal request...');
        const minimalRequest = {
            user_id: 'test',
            format: 'csv'
        };

        const minimalResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_minimal'
            },
            body: JSON.stringify(minimalRequest)
        });

        const minimalText = await minimalResponse.text();
        console.log('Minimal request status:', minimalResponse.status);
        console.log('Minimal request response:', minimalText);

        // Test with no auth
        console.log('\n\n3. Testing without authentication...');
        const noAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testRequest)
        });

        const noAuthText = await noAuthResponse.text();
        console.log('No auth status:', noAuthResponse.status);
        
        try {
            const noAuthData = JSON.parse(noAuthText);
            console.log('No auth response structure:', Object.keys(noAuthData));
            console.log('No auth response:', JSON.stringify(noAuthData, null, 2));
        } catch (e) {
            console.log('No auth response (raw):', noAuthText);
        }

        // Test backend health
        console.log('\n\n4. Testing backend health...');
        const healthResponse = await fetch(`${API_BASE_URL}/health/`);
        const healthText = await healthResponse.text();
        console.log('Health status:', healthResponse.status);
        console.log('Health response:', healthText);

    } catch (error) {
        console.log('❌ Debug failed:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

// Run the debug
debugExportResponse().then(() => {
    console.log('\n🏁 Export response debug completed');
}).catch(error => {
    console.error('❌ Debug script failed:', error);
});