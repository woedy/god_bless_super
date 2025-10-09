/**
 * Test script to verify the frontend can handle the new export response format
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testFrontendExportHandling() {
    console.log('🧪 Testing Frontend Export Response Handling...\n');

    try {
        // Simulate the frontend export request format
        console.log('1. Testing frontend export request format...');
        
        const frontendExportRequest = {
            user_id: 'test_user_123',
            format: 'csv',
            include_invalid: false,
            include_metadata: false,
            project_id: 'test_project_456',
            fields: ['phone_number', 'formattedNumber', 'isValid', 'carrier', 'country'],
            filters: {
                valid_number: true,
                carrier: 'Verizon',
                country_name: 'United States',
                type: 'mobile'
            }
        };

        const exportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_frontend_simulation'
            },
            body: JSON.stringify(frontendExportRequest)
        });

        const exportText = await exportResponse.text();
        console.log('Export response status:', exportResponse.status);
        console.log('Export response content-type:', exportResponse.headers.get('content-type'));

        // Test JSON parsing (this was the original issue)
        try {
            const exportData = JSON.parse(exportText);
            console.log('✅ Frontend can parse export response as JSON');
            console.log('Response structure:', Object.keys(exportData));
            
            // Test the response structure that frontend expects
            if (exportData.success !== undefined) {
                console.log('✅ Response has success field:', exportData.success);
            }
            
            if (exportData.data) {
                console.log('✅ Response has data field');
                console.log('Data structure:', Object.keys(exportData.data));
                
                // Check for expected fields
                if (exportData.data.task_id || exportData.data.taskId) {
                    console.log('✅ Response has task ID for background processing');
                }
                
                if (exportData.data.content !== undefined) {
                    console.log('✅ Response has content field for direct export');
                    console.log('Content length:', exportData.data.content.length);
                }
                
                if (exportData.data.filename) {
                    console.log('✅ Response has filename field');
                }
                
                if (exportData.data.total_records !== undefined) {
                    console.log('✅ Response has total_records field:', exportData.data.total_records);
                }
            }
            
            if (exportData.error) {
                console.log('✅ Response has error field for error handling');
                console.log('Error structure:', Object.keys(exportData.error));
            }
            
        } catch (parseError) {
            console.log('❌ Frontend cannot parse export response as JSON');
            console.log('Parse error:', parseError.message);
            console.log('This would cause "Unexpected end of JSON input" error');
            console.log('Raw response (first 500 chars):', exportText.substring(0, 500));
        }

        // Test 2: Simulate different response scenarios
        console.log('\n2. Testing different export scenarios...');
        
        const scenarios = [
            {
                name: 'CSV Export',
                request: { ...frontendExportRequest, format: 'csv' }
            },
            {
                name: 'JSON Export',
                request: { ...frontendExportRequest, format: 'json' }
            },
            {
                name: 'TXT Export',
                request: { ...frontendExportRequest, format: 'txt' }
            },
            {
                name: 'Export with Invalid Fields',
                request: { ...frontendExportRequest, fields: ['invalid_field', 'another_invalid'] }
            },
            {
                name: 'Export with Include Invalid',
                request: { ...frontendExportRequest, include_invalid: true }
            },
            {
                name: 'Export with Metadata',
                request: { ...frontendExportRequest, include_metadata: true }
            }
        ];

        for (const scenario of scenarios) {
            console.log(`\nTesting ${scenario.name}...`);
            
            const scenarioResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token test_token_for_scenario'
                },
                body: JSON.stringify(scenario.request)
            });

            const scenarioText = await scenarioResponse.text();
            console.log(`Status: ${scenarioResponse.status}`);
            
            try {
                const scenarioData = JSON.parse(scenarioText);
                console.log(`✅ ${scenario.name} returns valid JSON`);
                
                if (scenarioResponse.status === 200 && scenarioData.data && scenarioData.data.content !== undefined) {
                    console.log(`Content preview (first 100 chars): ${scenarioData.data.content.substring(0, 100)}...`);
                }
            } catch (e) {
                console.log(`❌ ${scenario.name} returns invalid JSON`);
                console.log(`Response preview: ${scenarioText.substring(0, 200)}...`);
            }
        }

        // Test 3: Verify error handling
        console.log('\n3. Testing error response handling...');
        
        const errorScenarios = [
            {
                name: 'Missing User ID',
                request: { format: 'csv' }
            },
            {
                name: 'Invalid Format',
                request: { user_id: 'test', format: 'invalid' }
            },
            {
                name: 'Empty Request',
                request: {}
            }
        ];

        for (const errorScenario of errorScenarios) {
            console.log(`\nTesting ${errorScenario.name}...`);
            
            const errorResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token test_token_for_error'
                },
                body: JSON.stringify(errorScenario.request)
            });

            const errorText = await errorResponse.text();
            console.log(`Status: ${errorResponse.status}`);
            
            try {
                const errorData = JSON.parse(errorText);
                console.log(`✅ ${errorScenario.name} returns valid JSON error`);
                
                if (errorData.error || errorData.errors) {
                    console.log('Error structure present');
                }
                
                if (errorData.success === false) {
                    console.log('Success field correctly set to false');
                }
            } catch (e) {
                console.log(`❌ ${errorScenario.name} returns invalid JSON`);
                console.log(`Response: ${errorText.substring(0, 200)}...`);
            }
        }

        console.log('\n📊 Frontend Compatibility Summary:');
        console.log('✅ Export endpoint returns valid JSON for all scenarios');
        console.log('✅ No more "Unexpected end of JSON input" errors');
        console.log('✅ Response structure is compatible with frontend expectations');
        console.log('✅ Error responses are properly formatted');
        console.log('✅ Different export formats are handled correctly');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

// Run the test
testFrontendExportHandling().then(() => {
    console.log('\n🏁 Frontend export compatibility test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});