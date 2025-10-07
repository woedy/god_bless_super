/**
 * Test script to verify phone number generation fixes
 * 
 * Tests:
 * 1. Area code is properly included in generated numbers
 * 2. Auto-validate only happens when checkbox is selected
 */

const baseUrl = 'http://localhost:8000/';
const userToken = 'your-token-here'; // Replace with actual token
const userId = 'your-user-id'; // Replace with actual user ID
const projectId = 'your-project-id'; // Replace with actual project ID

async function testPhoneGeneration() {
    console.log('🧪 Testing Phone Number Generation Fixes...\n');
    
    // Test 1: Generate numbers with specific area code (no auto-validate)
    console.log('📞 Test 1: Generate numbers with area code 555 (no auto-validate)');
    
    const testData1 = {
        user_id: userId,
        project_id: projectId,
        area_code: '555',
        quantity: 5,
        batch_size: 1000,
        auto_validate: false
    };
    
    try {
        const response1 = await fetch(`${baseUrl}api/phone-generator/generate-numbers-config/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${userToken}`
            },
            body: JSON.stringify(testData1)
        });
        
        const result1 = await response1.json();
        
        if (response1.ok) {
            console.log('✅ Generation started successfully');
            console.log(`   Task ID: ${result1.data.generation_task_id}`);
            console.log(`   Area Code: ${result1.data.area_code}`);
            console.log(`   Quantity: ${result1.data.quantity}`);
            console.log(`   Auto-validate: ${result1.data.config.auto_validate}`);
            
            if (result1.data.area_code === '555') {
                console.log('✅ Area code correctly preserved in response');
            } else {
                console.log('❌ Area code not preserved correctly');
            }
            
            if (result1.data.config.auto_validate === false) {
                console.log('✅ Auto-validate correctly set to false');
            } else {
                console.log('❌ Auto-validate should be false but is true');
            }
        } else {
            console.log('❌ Generation failed:', result1);
        }
    } catch (error) {
        console.log('❌ Request failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Generate numbers with different area code and auto-validate enabled
    console.log('📞 Test 2: Generate numbers with area code 777 (with auto-validate)');
    
    const testData2 = {
        user_id: userId,
        project_id: projectId,
        area_code: '777',
        quantity: 3,
        batch_size: 1000,
        auto_validate: true
    };
    
    try {
        const response2 = await fetch(`${baseUrl}api/phone-generator/generate-numbers-config/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${userToken}`
            },
            body: JSON.stringify(testData2)
        });
        
        const result2 = await response2.json();
        
        if (response2.ok) {
            console.log('✅ Generation started successfully');
            console.log(`   Task ID: ${result2.data.generation_task_id}`);
            console.log(`   Area Code: ${result2.data.area_code}`);
            console.log(`   Quantity: ${result2.data.quantity}`);
            console.log(`   Auto-validate: ${result2.data.config.auto_validate}`);
            
            if (result2.data.area_code === '777') {
                console.log('✅ Area code correctly preserved in response');
            } else {
                console.log('❌ Area code not preserved correctly');
            }
            
            if (result2.data.config.auto_validate === true) {
                console.log('✅ Auto-validate correctly set to true');
            } else {
                console.log('❌ Auto-validate should be true but is false');
            }
        } else {
            console.log('❌ Generation failed:', result2);
        }
    } catch (error) {
        console.log('❌ Request failed:', error.message);
    }
    
    console.log('\n🎯 Test Summary:');
    console.log('1. Area code input should be preserved and used in generation');
    console.log('2. Auto-validate should only trigger when checkbox is selected');
    console.log('3. Generated numbers should start with 1 + area_code (e.g., 1555...)');
    console.log('\n💡 To verify the actual generated numbers, check the database or API after task completion');
}

// Run the test
testPhoneGeneration().catch(console.error);