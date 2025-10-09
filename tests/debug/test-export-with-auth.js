/**
 * Test script to verify the export functionality with authentication
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testExportWithAuth() {
    console.log('🧪 Testing Export Functionality with Authentication...\n');

    try {
        // Step 1: Try to register a test user
        console.log('1. Creating test user...');
        const registerResponse = await fetch(`${API_BASE_URL}/accounts/register-user/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'testuser_export',
                email: 'testuser_export@example.com',
                password: 'testpassword123',
                first_name: 'Test',
                last_name: 'User'
            })
        });

        const registerText = await registerResponse.text();
        console.log('Register response status:', registerResponse.status);
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

        // Step 2: If registration failed, try to login with existing user
        if (!authToken) {
            console.log('\n2. Trying to login with test user...');
            const loginResponse = await fetch(`${API_BASE_URL}/accounts/login-user/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'testuser_export',
                    password: 'testpassword123'
                })
            });

            const loginText = await loginResponse.text();
            console.log('Login response status:', loginResponse.status);
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

        if (!authToken || !userId) {
            console.log('❌ Could not authenticate user. Skipping authenticated tests.');
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
                name: 'Test Export Project',
                description: 'Project for testing export functionality'
            })
        });

        const projectText = await projectResponse.text();
        console.log('Project response status:', projectResponse.status);
        console.log('Project response:', projectText);

        let projectId = null;
        if (projectResponse.status === 201 || projectResponse.status === 200) {
            try {
                const projectData = JSON.parse(projectText);
                projectId = projectData.data?.project?.id;
                console.log('✅ Project created successfully');
                console.log('Project ID:', projectId);
            } catch (e) {
                console.log('Could not parse project response');
            }
        }

        // Step 4: Test export with valid authentication but no data
        console.log('\n4. Testing export with valid authentication...');
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
                fields: ['phone_number', 'carrier', 'type', 'valid_number', 'created_at']
            })
        });

        const exportText = await exportResponse.text();
        console.log('Export response status:', exportResponse.status);
        console.log('Export response headers:', Object.fromEntries(exportResponse.headers.entries()));
        console.log('Export response body:', exportText);

        // Check if response is valid JSON
        try {
            const exportData = JSON.parse(exportText);
            console.log('✅ Export endpoint returns valid JSON response');
            console.log('Export response structure:', exportData);

            if (exportResponse.status === 200) {
                console.log('✅ Export completed successfully (no data to export)');
                
                if (exportData.data && exportData.data.content !== undefined) {
                    console.log('✅ Export content field is present');
                    console.log('Content length:', exportData.data.content.length);
                    console.log('Total records:', exportData.data.total_records || 0);
                } else if (exportData.data && exportData.data.task_id) {
                    console.log('✅ Background task started for export');
                    console.log('Task ID:', exportData.data.task_id);
                }
            } else {
                console.log('❌ Export failed with status:', exportResponse.status);
                console.log('Error details:', exportData);
            }
        } catch (parseError) {
            console.log('❌ Export endpoint returns invalid JSON');
            console.log('Parse error:', parseError.message);
            console.log('Raw response:', exportText);
        }

        // Step 5: Test different export formats
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
                    include_metadata: false
                })
            });

            const formatText = await formatResponse.text();
            console.log(`${format.toUpperCase()} response status:`, formatResponse.status);
            
            try {
                const formatData = JSON.parse(formatText);
                console.log(`✅ ${format.toUpperCase()} format returns valid JSON`);
                if (formatData.data && formatData.data.content !== undefined) {
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
testExportWithAuth().then(() => {
    console.log('\n🏁 Export authentication test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});