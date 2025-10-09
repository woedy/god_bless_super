// Test script to verify the filter fix
const baseUrl = 'http://localhost:8000/';
const userToken = 'your-token-here'; // Replace with actual token
const userID = 'your-user-id'; // Replace with actual user ID
const projectID = 'your-project-id'; // Replace with actual project ID

async function testFilters() {
    console.log('Testing phone number filters...');
    
    // Test 1: Search filter
    console.log('\n1. Testing search filter...');
    const searchParams = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        search: '555',
        page: '1'
    });
    
    try {
        const searchResponse = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${searchParams}`, {
            headers: {
                'Authorization': `Token ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        const searchResult = await searchResponse.json();
        console.log('Search filter result:', searchResult.data?.numbers?.length || 0, 'numbers found');
    } catch (error) {
        console.error('Search filter error:', error.message);
    }
    
    // Test 2: Valid number filter
    console.log('\n2. Testing valid number filter...');
    const validParams = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        valid_number: 'true',
        page: '1'
    });
    
    try {
        const validResponse = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${validParams}`, {
            headers: {
                'Authorization': `Token ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        const validResult = await validResponse.json();
        console.log('Valid number filter result:', validResult.data?.numbers?.length || 0, 'valid numbers found');
    } catch (error) {
        console.error('Valid number filter error:', error.message);
    }
    
    // Test 3: Type filter
    console.log('\n3. Testing type filter...');
    const typeParams = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        type: 'Mobile',
        page: '1'
    });
    
    try {
        const typeResponse = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${typeParams}`, {
            headers: {
                'Authorization': `Token ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        const typeResult = await typeResponse.json();
        console.log('Type filter result:', typeResult.data?.numbers?.length || 0, 'mobile numbers found');
    } catch (error) {
        console.error('Type filter error:', error.message);
    }
    
    // Test 4: Carrier filter
    console.log('\n4. Testing carrier filter...');
    const carrierParams = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        carrier: 'AT&T',
        page: '1'
    });
    
    try {
        const carrierResponse = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${carrierParams}`, {
            headers: {
                'Authorization': `Token ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        const carrierResult = await carrierResponse.json();
        console.log('Carrier filter result:', carrierResult.data?.numbers?.length || 0, 'AT&T numbers found');
    } catch (error) {
        console.error('Carrier filter error:', error.message);
    }
    
    // Test 5: Combined filters
    console.log('\n5. Testing combined filters...');
    const combinedParams = new URLSearchParams({
        user_id: userID,
        project_id: projectID,
        valid_number: 'true',
        type: 'Mobile',
        page: '1'
    });
    
    try {
        const combinedResponse = await fetch(`${baseUrl}api/phone-generator/list-numbers/?${combinedParams}`, {
            headers: {
                'Authorization': `Token ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        const combinedResult = await combinedResponse.json();
        console.log('Combined filter result:', combinedResult.data?.numbers?.length || 0, 'valid mobile numbers found');
    } catch (error) {
        console.error('Combined filter error:', error.message);
    }
    
    console.log('\nFilter testing complete!');
}

// Uncomment and update credentials to run the test
// testFilters();

console.log('Filter fix test script created. Update the credentials and uncomment testFilters() to run.');