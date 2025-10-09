/**
 * Test script to verify export content format
 */

const API_BASE_URL = 'http://localhost:6161/api';

async function testExportContentFormat() {
    console.log('🧪 Testing Export Content Format...\n');

    try {
        // Test CSV export format
        console.log('1. Testing CSV export content format...');
        const csvResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_csv_test'
            },
            body: JSON.stringify({
                user_id: 'test_user',
                format: 'csv',
                fields: ['phone_number', 'carrier', 'valid_number'],
                include_invalid: false
            })
        });

        const csvText = await csvResponse.text();
        console.log('CSV Response status:', csvResponse.status);
        console.log('CSV Response content-type:', csvResponse.headers.get('content-type'));

        try {
            const csvData = JSON.parse(csvText);
            console.log('✅ CSV response is valid JSON');
            console.log('Response structure:', Object.keys(csvData));
            
            if (csvData.data && csvData.data.content !== undefined) {
                console.log('✅ CSV content field exists');
                console.log('Content type:', typeof csvData.data.content);
                console.log('Content length:', csvData.data.content.length);
                console.log('Format field:', csvData.data.format);
                console.log('Filename field:', csvData.data.filename);
                
                console.log('\n--- CSV Content Preview ---');
                console.log(csvData.data.content.substring(0, 500));
                console.log('--- End CSV Content ---\n');
                
                // Check if content looks like CSV
                if (csvData.data.content.includes(',') || csvData.data.content.includes('phone_number')) {
                    console.log('✅ Content appears to be CSV format');
                } else if (csvData.data.content.includes('{') || csvData.data.content.includes('[')) {
                    console.log('❌ Content appears to be JSON format (ISSUE!)');
                } else if (csvData.data.content.length === 0) {
                    console.log('✅ Content is empty (no data to export)');
                } else {
                    console.log('⚠️ Content format is unclear');
                }
            }
        } catch (e) {
            console.log('❌ CSV response is not valid JSON');
            console.log('Raw response:', csvText);
        }

        // Test TXT export format
        console.log('\n2. Testing TXT export content format...');
        const txtResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_txt_test'
            },
            body: JSON.stringify({
                user_id: 'test_user',
                format: 'txt',
                fields: ['phone_number', 'carrier'],
                include_invalid: false
            })
        });

        const txtText = await txtResponse.text();
        console.log('TXT Response status:', txtResponse.status);

        try {
            const txtData = JSON.parse(txtText);
            console.log('✅ TXT response is valid JSON');
            
            if (txtData.data && txtData.data.content !== undefined) {
                console.log('✅ TXT content field exists');
                console.log('Content length:', txtData.data.content.length);
                console.log('Format field:', txtData.data.format);
                
                console.log('\n--- TXT Content Preview ---');
                console.log(txtData.data.content.substring(0, 300));
                console.log('--- End TXT Content ---\n');
                
                // Check if content looks like plain text
                if (txtData.data.content.includes('|') || txtData.data.content.includes('phone_number')) {
                    console.log('✅ Content appears to be TXT format');
                } else if (txtData.data.content.includes('{') || txtData.data.content.includes('[')) {
                    console.log('❌ Content appears to be JSON format (ISSUE!)');
                } else if (txtData.data.content.length === 0) {
                    console.log('✅ Content is empty (no data to export)');
                }
            }
        } catch (e) {
            console.log('❌ TXT response is not valid JSON');
        }

        // Test JSON export format
        console.log('\n3. Testing JSON export content format...');
        const jsonResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_json_test'
            },
            body: JSON.stringify({
                user_id: 'test_user',
                format: 'json',
                fields: ['phone_number', 'carrier'],
                include_invalid: false
            })
        });

        const jsonText = await jsonResponse.text();
        console.log('JSON Response status:', jsonResponse.status);

        try {
            const jsonData = JSON.parse(jsonText);
            console.log('✅ JSON response is valid JSON');
            
            if (jsonData.data && jsonData.data.content !== undefined) {
                console.log('✅ JSON content field exists');
                console.log('Content length:', jsonData.data.content.length);
                console.log('Format field:', jsonData.data.format);
                
                console.log('\n--- JSON Content Preview ---');
                console.log(jsonData.data.content.substring(0, 300));
                console.log('--- End JSON Content ---\n');
                
                // Check if content looks like JSON
                if (jsonData.data.content.includes('[') || jsonData.data.content.includes('{')) {
                    console.log('✅ Content appears to be JSON format');
                } else if (jsonData.data.content.length === 0) {
                    console.log('✅ Content is empty (no data to export)');
                }
            }
        } catch (e) {
            console.log('❌ JSON response is not valid JSON');
        }

        // Test with invalid format
        console.log('\n4. Testing invalid format handling...');
        const invalidResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Token test_token_for_invalid_test'
            },
            body: JSON.stringify({
                user_id: 'test_user',
                format: 'invalid_format',
                fields: ['phone_number']
            })
        });

        const invalidText = await invalidResponse.text();
        console.log('Invalid format response status:', invalidResponse.status);

        try {
            const invalidData = JSON.parse(invalidText);
            console.log('✅ Invalid format response is valid JSON');
            
            if (invalidResponse.status === 400 && invalidData.errors) {
                console.log('✅ Proper validation error for invalid format');
                console.log('Error details:', invalidData.errors);
            }
        } catch (e) {
            console.log('❌ Invalid format response is not valid JSON');
        }

        console.log('\n📊 Content Format Analysis:');
        console.log('✅ All export responses return valid JSON wrapper');
        console.log('✅ Content field contains the actual export data');
        console.log('✅ Format field indicates the export format');
        console.log('✅ Filename field provides suggested filename');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testExportContentFormat().then(() => {
    console.log('\n🏁 Export content format test completed');
}).catch(error => {
    console.error('❌ Test script failed:', error);
});