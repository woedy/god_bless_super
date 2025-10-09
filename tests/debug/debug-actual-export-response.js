/**
 * Debug script to check the actual export response structure you're getting
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function debugActualExportResponse() {
    console.log('🔍 Debugging Actual Export Response Structure...\n');

    try {
        // Test the exact request that's failing
        console.log('1. Testing export request that matches frontend...');
        
        const exportRequest = {
            user_id: 'your_actual_user_id', // You'll need to replace this
            project_id: 'your_actual_project_id', // You'll need to replace this
            format: 'csv',
            include_invalid: false,
            include_metadata: false,
            fields: ['phone_number', 'carrier', 'type', 'valid_number', 'created_at']
        };

        console.log('Request payload:', JSON.stringify(exportRequest, null, 2));

        // Test without auth first to see the structure
        console.log('\n2. Testing without authentication (to see error structure)...');
        const noAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportRequest)
        });

        const noAuthText = await noAuthResponse.text();
        console.log('No auth status:', noAuthResponse.status);
        console.log('No auth response:', noAuthText);

        // Test with invalid auth to see the structure
        console.log('\n3. Testing with invalid authentication...');
        const invalidAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token invalid_token_12345'
            },
            body: JSON.stringify(exportRequest)
        });

        const invalidAuthText = await invalidAuthResponse.text();
        console.log('Invalid auth status:', invalidAuthResponse.status);
        console.log('Invalid auth response:', invalidAuthText);

        // Test with minimal request
        console.log('\n4. Testing minimal request structure...');
        const minimalRequest = {
            user_id: 'test_user',
            format: 'csv'
        };

        const minimalResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token'
            },
            body: JSON.stringify(minimalRequest)
        });

        const minimalText = await minimalResponse.text();
        console.log('Minimal request status:', minimalResponse.status);
        console.log('Minimal request response:', minimalText);

        try {
            const minimalData = JSON.parse(minimalText);
            console.log('\n--- Minimal Response Analysis ---');
            console.log('Success:', minimalData.success);
            console.log('Message:', minimalData.message);
            console.log('Has data:', !!minimalData.data);
            
            if (minimalData.data) {
                console.log('Data keys:', Object.keys(minimalData.data));
                console.log('Has content:', 'content' in minimalData.data);
                console.log('Has task_id:', 'task_id' in minimalData.data);
                console.log('Has taskId:', 'taskId' in minimalData.data);
                console.log('Data structure:', JSON.stringify(minimalData.data, null, 2));
            }
            
            if (minimalData.error) {
                console.log('Error:', minimalData.error);
            }
            
            if (minimalData.errors) {
                console.log('Errors:', minimalData.errors);
            }
        } catch (e) {
            console.log('Could not parse minimal response as JSON');
        }

        // Test different scenarios that might trigger background vs immediate
        console.log('\n5. Testing scenarios that might affect response type...');
        
        const scenarios = [
            {
                name: 'Small dataset request',
                request: {
                    user_id: 'test_user',
                    format: 'csv',
                    fields: ['phone_number'],
                    use_background: false
                }
            },
            {
                name: 'Large dataset request',
                request: {
                    user_id: 'test_user', 
                    format: 'csv',
                    fields: ['phone_number'],
                    use_background: true
                }
            },
            {
                name: 'JSON format request',
                request: {
                    user_id: 'test_user',
                    format: 'json',
                    fields: ['phone_number', 'carrier']
                }
            }
        ];

        for (const scenario of scenarios) {
            console.log(`\n--- ${scenario.name} ---`);
            
            const scenarioResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token test_scenario'
                },
                body: JSON.stringify(scenario.request)
            });

            const scenarioText = await scenarioResponse.text();
            console.log('Status:', scenarioResponse.status);
            
            try {
                const scenarioData = JSON.parse(scenarioText);
                console.log('Success:', scenarioData.success);
                console.log('Message:', scenarioData.message);
                
                if (scenarioData.data) {
                    console.log('Data keys:', Object.keys(scenarioData.data));
                    if ('content' in scenarioData.data) {
                        console.log('✅ Has content field');
                    } else if ('task_id' in scenarioData.data) {
                        console.log('✅ Has task_id field (background task)');
                    } else {
                        console.log('❌ Missing both content and task_id');
                        console.log('Data:', scenarioData.data);
                    }
                }
            } catch (e) {
                console.log('Response not JSON:', scenarioText);
            }
        }

        console.log('\n📊 DEBUGGING SUMMARY:');
        console.log('The response you\'re getting has:');
        console.log('- success: true');
        console.log('- message: "Export completed"');
        console.log('- data: {...} (but missing content field)');
        console.log('');
        console.log('This suggests either:');
        console.log('1. Backend is returning background task response (should have task_id)');
        console.log('2. Backend export_utils is not generating content properly');
        console.log('3. There\'s an exception in the backend that\'s not being caught');
        console.log('');
        console.log('Check the backend logs for any errors during export processing.');

    } catch (error) {
        console.log('❌ Debug failed:', error.message);
    }
}

// Run the debug
debugActualExportResponse().then(() => {
    console.log('\n🏁 Actual export response debug completed');
}).catch(error => {
    console.error('❌ Debug script failed:', error);
});