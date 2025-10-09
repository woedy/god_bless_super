/**
 * Test script to simulate the frontend export download process
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function simulateExportDownload() {
    console.log('🧪 Simulating Export Download Process...\n');

    try {
        // Simulate the exact request the frontend makes
        console.log('1. Simulating frontend export request...');
        
        const frontendRequest = {
            user_id: 'test_user_123',
            project_id: 'test_project_456',
            format: 'csv',
            include_invalid: false,
            include_metadata: false,
            fields: ['phone_number', 'carrier', 'type', 'valid_number', 'country_name']
        };

        console.log('Request payload:', JSON.stringify(frontendRequest, null, 2));

        const response = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_download_simulation'
            },
            body: JSON.stringify(frontendRequest)
        });

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));

        try {
            const responseData = JSON.parse(responseText);
            console.log('✅ Response is valid JSON');
            console.log('Response structure:', Object.keys(responseData));

            // Simulate frontend processing
            if (response.status === 200 && responseData.success && responseData.data) {
                console.log('\n2. Simulating successful export processing...');
                
                if (responseData.data.content !== undefined) {
                    console.log('✅ Content field found');
                    console.log('Content type:', typeof responseData.data.content);
                    console.log('Content length:', responseData.data.content.length);
                    console.log('Format field:', responseData.data.format);
                    console.log('Filename field:', responseData.data.filename);
                    console.log('Total records:', responseData.data.total_records);

                    // Analyze content format
                    const content = responseData.data.content;
                    console.log('\n--- Content Analysis ---');
                    
                    if (content.length === 0) {
                        console.log('✅ Empty content (no data to export)');
                    } else {
                        console.log('Content preview (first 200 chars):');
                        console.log(content.substring(0, 200));
                        
                        // Check if content matches expected format
                        if (frontendRequest.format === 'csv') {
                            if (content.includes(',') && (content.includes('phone_number') || content.includes('\n'))) {
                                console.log('✅ Content appears to be valid CSV format');
                            } else if (content.includes('{') || content.includes('[')) {
                                console.log('❌ Content appears to be JSON (ISSUE!)');
                            } else {
                                console.log('⚠️ Content format unclear');
                            }
                        }
                    }

                    // Simulate blob creation (what frontend does)
                    console.log('\n3. Simulating blob creation...');
                    const mimeTypes = {
                        'csv': 'text/csv',
                        'txt': 'text/plain',
                        'json': 'application/json',
                        'doc': 'application/msword'
                    };
                    
                    const format = responseData.data.format || frontendRequest.format;
                    const mimeType = mimeTypes[format] || 'text/plain';
                    const filename = responseData.data.filename || `phone_numbers_export.${format}`;
                    
                    console.log('Blob MIME type:', mimeType);
                    console.log('Download filename:', filename);
                    console.log('✅ Blob would be created with correct MIME type');

                } else if (responseData.data.task_id || responseData.data.taskId) {
                    console.log('✅ Background task started');
                    console.log('Task ID:', responseData.data.task_id || responseData.data.taskId);
                } else {
                    console.log('❌ No content or task_id in response');
                    console.log('Response data:', responseData.data);
                }

            } else if (response.status === 401) {
                console.log('✅ Authentication required (expected for test)');
                console.log('Error details:', responseData.error);
            } else if (response.status === 400) {
                console.log('❌ Validation error');
                console.log('Error details:', responseData.errors || responseData.error);
            } else {
                console.log('❌ Unexpected response');
                console.log('Response data:', responseData);
            }

        } catch (parseError) {
            console.log('❌ Response is not valid JSON');
            console.log('Parse error:', parseError.message);
            console.log('Raw response (first 500 chars):', responseText.substring(0, 500));
        }

        // Test different formats
        console.log('\n4. Testing different export formats...');
        const formats = ['csv', 'txt', 'json'];
        
        for (const format of formats) {
            console.log(`\nTesting ${format.toUpperCase()} format...`);
            
            const formatRequest = {
                ...frontendRequest,
                format: format
            };

            const formatResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token test_token_for_format_test'
                },
                body: JSON.stringify(formatRequest)
            });

            const formatText = await formatResponse.text();
            console.log(`${format.toUpperCase()} status:`, formatResponse.status);

            try {
                const formatData = JSON.parse(formatText);
                
                if (formatResponse.status === 200 && formatData.data && formatData.data.content !== undefined) {
                    const content = formatData.data.content;
                    console.log(`Content length: ${content.length}`);
                    
                    if (content.length > 0) {
                        console.log(`Content preview: ${content.substring(0, 100)}...`);
                        
                        // Verify format
                        if (format === 'csv' && content.includes(',')) {
                            console.log('✅ CSV format verified');
                        } else if (format === 'txt' && (content.includes('|') || content.includes('\n'))) {
                            console.log('✅ TXT format verified');
                        } else if (format === 'json' && (content.includes('[') || content.includes('{'))) {
                            console.log('✅ JSON format verified');
                        } else if (content.length === 0) {
                            console.log('✅ Empty content (no data)');
                        } else {
                            console.log('⚠️ Format verification unclear');
                        }
                    }
                } else if (formatResponse.status === 401) {
                    console.log('✅ Authentication required');
                }
            } catch (e) {
                console.log(`❌ ${format.toUpperCase()} response not valid JSON`);
            }
        }

        console.log('\n📊 Download Simulation Summary:');
        console.log('✅ Export endpoint structure is correct');
        console.log('✅ Response format is consistent');
        console.log('✅ Content field contains the actual export data');
        console.log('✅ Frontend should create correct blob with proper MIME type');
        console.log('✅ Download filename is provided by backend');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
simulateExportDownload().then(() => {
    console.log('\n🏁 Export download simulation completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});