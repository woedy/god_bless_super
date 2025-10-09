/**
 * Complete test for export functionality with proper authentication
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testCompleteExport() {
    console.log('🧪 Testing Complete Export Functionality...\n');

    try {
        // Step 1: Try to create a test user with strong password
        console.log('1. Creating test user with strong password...');
        const registerResponse = await fetch(`${API_BASE_URL}/accounts/register-user/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'exporttest2024',
                email: 'exporttest2024@example.com',
                password: 'ExportTest123!@#',
                first_name: 'Export',
                last_name: 'Test',
                fcm_token: 'test_fcm_token_for_export'
            })
        });

        const registerText = await registerResponse.text();
        console.log('Register response status:', registerResponse.status);
        
        let authToken = null;
        let userId = null;

        if (registerResponse.status === 201 || registerResponse.status === 200) {
            try {
                const registerData = JSON.parse(registerText);
                authToken = registerData.data?.token;
                userId = registerData.data?.user?.user_id || registerData.data?.user?.id;
                console.log('✅ User created successfully');
            } catch (e) {
                console.log('Could not parse register response:', registerText);
            }
        } else {
            console.log('Registration failed:', registerText);
            
            // Try to login with existing user
            console.log('\n2. Trying to login with existing test user...');
            const loginResponse = await fetch(`${API_BASE_URL}/accounts/login-user/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'exporttest2024@example.com',
                    password: 'ExportTest123!@#',
                    fcm_token: 'test_fcm_token_for_export'
                })
            });

            const loginText = await loginResponse.text();
            console.log('Login response status:', loginResponse.status);

            if (loginResponse.status === 200) {
                try {
                    const loginData = JSON.parse(loginText);
                    authToken = loginData.data?.token;
                    userId = loginData.data?.user?.user_id || loginData.data?.user?.id;
                    console.log('✅ Login successful');
                } catch (e) {
                    console.log('Could not parse login response:', loginText);
                }
            } else {
                console.log('Login failed:', loginText);
            }
        }

        if (!authToken || !userId) {
            console.log('❌ Could not authenticate. Testing without authentication...');
            
            // Test the export endpoint structure without auth
            console.log('\n3. Testing export endpoint structure (no auth)...');
            const noAuthResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: 'test_user',
                    format: 'csv',
                    fields: ['phone_number', 'carrier', 'valid_number']
                })
            });

            const noAuthText = await noAuthResponse.text();
            console.log('No auth response status:', noAuthResponse.status);
            
            try {
                const noAuthData = JSON.parse(noAuthText);
                console.log('✅ Export endpoint returns valid JSON without auth');
                console.log('Response:', noAuthData);
                
                if (noAuthResponse.status === 401) {
                    console.log('✅ Proper authentication required');
                }
            } catch (e) {
                console.log('❌ Export endpoint returns invalid JSON');
                console.log('Raw response:', noAuthText);
            }
            
            return;
        }

        console.log('✅ Authentication successful');
        console.log('User ID:', userId);
        console.log('Token:', authToken.substring(0, 10) + '...');

        // Step 3: Create a test project
        console.log('\n3. Creating test project...');
        const projectResponse = await fetch(`${API_BASE_URL}/projects/add-new-project/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                name: 'Export Test Project',
                description: 'Project for testing export functionality'
            })
        });

        const projectText = await projectResponse.text();
        console.log('Project response status:', projectResponse.status);

        let projectId = null;
        if (projectResponse.status === 201 || projectResponse.status === 200) {
            try {
                const projectData = JSON.parse(projectText);
                projectId = projectData.data?.project?.id;
                console.log('✅ Project created successfully');
                console.log('Project ID:', projectId);
            } catch (e) {
                console.log('Could not parse project response:', projectText);
            }
        } else {
            console.log('Project creation failed:', projectText);
        }

        // Step 4: Test export with proper authentication and correct field names
        console.log('\n4. Testing export with authentication and correct field names...');
        const exportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`
            },
            body: JSON.stringify({
                user_id: userId,
                project_id: projectId,
                format: 'csv',
                include_invalid: false,
                include_metadata: false,
                fields: ['phone_number', 'carrier', 'type', 'valid_number', 'created_at'] // Correct field names
            })
        });

        const exportText = await exportResponse.text();
        console.log('Export response status:', exportResponse.status);
        console.log('Export response headers:', Object.fromEntries(exportResponse.headers.entries()));

        try {
            const exportData = JSON.parse(exportText);
            console.log('✅ Export with authentication returns valid JSON');
            console.log('Response structure:', Object.keys(exportData));
            
            if (exportResponse.status === 200) {
                console.log('✅ Export completed successfully');
                
                if (exportData.data && exportData.data.content !== undefined) {
                    console.log('✅ Export content field is present');
                    console.log('Content length:', exportData.data.content.length);
                    console.log('Total records:', exportData.data.total_records || 0);
                    console.log('Format:', exportData.data.format);
                    
                    if (exportData.data.content.length > 0) {
                        console.log('Content preview (first 200 chars):');
                        console.log(exportData.data.content.substring(0, 200) + '...');
                    } else {
                        console.log('✅ Empty export (no phone numbers in database)');
                    }
                } else if (exportData.data && exportData.data.task_id) {
                    console.log('✅ Background task started for export');
                    console.log('Task ID:', exportData.data.task_id);
                }
            } else if (exportResponse.status === 400) {
                console.log('❌ Export failed with validation errors');
                console.log('Error details:', exportData);
                
                if (exportData.errors && exportData.errors.export) {
                    console.log('Export errors:', exportData.errors.export);
                    
                    // Check if it's still a field mapping issue
                    const errorMessage = exportData.errors.export[0] || '';
                    if (errorMessage.includes('Cannot resolve keyword')) {
                        console.log('❌ Still have field mapping issues');
                    } else {
                        console.log('✅ No field mapping issues - other validation error');
                    }
                }
            } else {
                console.log('Export response details:', exportData);
            }
        } catch (parseError) {
            console.log('❌ Export response is not valid JSON');
            console.log('Parse error:', parseError.message);
            console.log('Raw response:', exportText);
        }

        // Step 5: Test different formats
        console.log('\n5. Testing different export formats...');
        const formats = ['csv', 'txt', 'json'];
        
        for (const format of formats) {
            console.log(`\nTesting ${format.toUpperCase()} format...`);
            const formatResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${authToken}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    project_id: projectId,
                    format: format,
                    include_invalid: false,
                    include_metadata: false,
                    fields: ['phone_number', 'carrier', 'valid_number']
                })
            });

            const formatText = await formatResponse.text();
            console.log(`${format.toUpperCase()} response status:`, formatResponse.status);
            
            try {
                const formatData = JSON.parse(formatText);
                console.log(`✅ ${format.toUpperCase()} format returns valid JSON`);
                
                if (formatResponse.status === 200 && formatData.data && formatData.data.content !== undefined) {
                    console.log(`Content type: ${format}, Length: ${formatData.data.content.length}`);
                }
            } catch (e) {
                console.log(`❌ ${format.toUpperCase()} format returns invalid JSON`);
                console.log('Response:', formatText.substring(0, 200) + '...');
            }
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Stack trace:', error.stack);
    }
}

// Run the test
testCompleteExport().then(() => {
    console.log('\n🏁 Complete export test finished');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});