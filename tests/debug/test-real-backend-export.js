/**
 * Test actual backend export responses to debug the real issue
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testRealBackendExport() {
    console.log('🧪 Testing Real Backend Export Responses...\n');

    try {
        // First, let's try to create a user and get a real token
        console.log('1. Attempting to create test user...');
        
        const registerResponse = await fetch(`${API_BASE_URL}/accounts/register-user/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'exporttest2024real',
                email: 'exporttest2024real@example.com',
                password: 'ExportTest123!@#',
                first_name: 'Export',
                last_name: 'Test',
                fcm_token: 'test_fcm_token_real'
            })
        });

        const registerText = await registerResponse.text();
        console.log('Register status:', registerResponse.status);
        console.log('Register response:', registerText);

        let authToken = null;
        let userId = null;

        if (registerResponse.status === 201 || registerResponse.status === 200) {
            try {
                const registerData = JSON.parse(registerText);
                authToken = registerData.data?.token;
                userId = registerData.data?.user?.user_id || registerData.data?.user?.id;
                console.log('✅ User created successfully');
            } catch (e) {
                console.log('Could not parse register response');
            }
        }

        // If registration failed, try login
        if (!authToken) {
            console.log('\n2. Attempting to login...');
            const loginResponse = await fetch(`${API_BASE_URL}/accounts/login-user/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'exporttest2024real@example.com',
                    password: 'ExportTest123!@#',
                    fcm_token: 'test_fcm_token_real'
                })
            });

            const loginText = await loginResponse.text();
            console.log('Login status:', loginResponse.status);
            console.log('Login response:', loginText);

            if (loginResponse.status === 200) {
                try {
                    const loginData = JSON.parse(loginText);
                    authToken = loginData.data?.token;
                    userId = loginData.data?.user?.user_id || loginData.data?.user?.id;
                    console.log('✅ Login successful');
                } catch (e) {
                    console.log('Could not parse login response');
                }
            }
        }

        if (authToken && userId) {
            console.log('✅ Authentication successful');
            console.log('User ID:', userId);
            console.log('Token:', authToken.substring(0, 20) + '...');

            // Test export with real authentication
            console.log('\n3. Testing real export with authentication...');
            
            const exportFormats = ['csv', 'txt', 'json'];
            
            for (const format of exportFormats) {
                console.log(`\n--- Testing ${format.toUpperCase()} Export ---`);
                
                const exportRequest = {
                    user_id: userId,
                    format: format,
                    include_invalid: false,
                    include_metadata: false,
                    fields: ['phone_number', 'carrier', 'type', 'valid_number', 'created_at']
                };

                console.log('Export request:', JSON.stringify(exportRequest, null, 2));

                const exportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Token ${authToken}`
                    },
                    body: JSON.stringify(exportRequest)
                });

                const exportText = await exportResponse.text();
                console.log('Export status:', exportResponse.status);
                console.log('Export headers:', Object.fromEntries(exportResponse.headers.entries()));
                console.log('Export response length:', exportText.length);

                try {
                    const exportData = JSON.parse(exportText);
                    console.log('✅ Export response is valid JSON');
                    console.log('Response keys:', Object.keys(exportData));
                    console.log('Success:', exportData.success);
                    console.log('Message:', exportData.message);
                    
                    if (exportData.data) {
                        console.log('Data keys:', Object.keys(exportData.data));
                        console.log('Has content field:', 'content' in exportData.data);
                        console.log('Content type:', typeof exportData.data.content);
                        
                        if (exportData.data.content !== undefined) {
                            console.log('Content length:', exportData.data.content.length);
                            console.log('Format field:', exportData.data.format);
                            console.log('Filename field:', exportData.data.filename);
                            console.log('Total records:', exportData.data.total_records);
                            
                            if (exportData.data.content.length > 0) {
                                console.log('Content preview (first 200 chars):');
                                console.log(exportData.data.content.substring(0, 200));
                                
                                // Verify format
                                if (format === 'csv' && exportData.data.content.includes(',')) {
                                    console.log('✅ CSV format verified');
                                } else if (format === 'txt' && exportData.data.content.includes('|')) {
                                    console.log('✅ TXT format verified');
                                } else if (format === 'json') {
                                    try {
                                        JSON.parse(exportData.data.content);
                                        console.log('✅ JSON format verified');
                                    } catch (e) {
                                        console.log('❌ JSON format invalid');
                                    }
                                } else {
                                    console.log('⚠️ Format verification unclear');
                                }
                            } else {
                                console.log('✅ Empty content (no phone numbers in database)');
                            }
                        } else {
                            console.log('❌ No content field in response');
                        }
                    } else {
                        console.log('❌ No data object in response');
                    }
                    
                    if (exportData.errors) {
                        console.log('Errors:', exportData.errors);
                    }
                    
                } catch (parseError) {
                    console.log('❌ Export response is not valid JSON');
                    console.log('Parse error:', parseError.message);
                    console.log('Raw response (first 500 chars):', exportText.substring(0, 500));
                }
            }

        } else {
            console.log('❌ Could not authenticate - testing without auth');
            
            // Test without authentication to see error structure
            console.log('\n3. Testing export without authentication...');
            
            const noAuthRequest = {
                user_id: 'test_user',
                format: 'csv',
                fields: ['phone_number', 'carrier']
            };

            const noAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noAuthRequest)
            });

            const noAuthText = await noAuthResponse.text();
            console.log('No auth status:', noAuthResponse.status);
            console.log('No auth response:', noAuthText);
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

// Run the test
testRealBackendExport().then(() => {
    console.log('\n🏁 Real backend export test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});