/**
 * Test Export with Filters
 * Tests the export functionality with mobile/landline filtering
 */

const API_BASE_URL = 'http://localhost:8000/api'

// Test configuration
const TEST_CONFIG = {
  // You'll need to update these with actual values from your system
  userId: 'test_user_id', // Replace with actual user ID
  projectId: 'test_project_id', // Replace with actual project ID
  authToken: 'your_auth_token' // Replace with actual auth token
}

async function testExportWithFilters() {
  console.log('🧪 Testing Export with Mobile/Landline Filters')
  console.log('=' * 50)

  // Test 1: Export only mobile numbers
  console.log('\n📱 Test 1: Export Mobile Numbers Only')
  try {
    const mobileExportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${TEST_CONFIG.authToken}`
      },
      body: JSON.stringify({
        user_id: TEST_CONFIG.userId,
        project_id: TEST_CONFIG.projectId,
        format: 'csv',
        filters: {
          type: 'mobile', // Filter for mobile numbers only
          valid_number: 'true' // Only valid numbers
        },
        include_invalid: false,
        include_metadata: false
      })
    })

    const mobileResult = await mobileExportResponse.json()
    console.log('Mobile Export Response:', mobileResult)
    
    if (mobileResult.success && mobileResult.data.content) {
      console.log('✅ Mobile export successful')
      console.log('📊 Content preview:', mobileResult.data.content.substring(0, 200) + '...')
      console.log('📈 Total records:', mobileResult.data.total_records)
    } else {
      console.log('❌ Mobile export failed:', mobileResult.message || mobileResult.errors)
    }
  } catch (error) {
    console.error('❌ Mobile export error:', error.message)
  }

  // Test 2: Export only landline numbers
  console.log('\n🏠 Test 2: Export Landline Numbers Only')
  try {
    const landlineExportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${TEST_CONFIG.authToken}`
      },
      body: JSON.stringify({
        user_id: TEST_CONFIG.userId,
        project_id: TEST_CONFIG.projectId,
        format: 'csv',
        filters: {
          type: 'landline', // Filter for landline numbers only
          valid_number: 'true' // Only valid numbers
        },
        include_invalid: false,
        include_metadata: false
      })
    })

    const landlineResult = await landlineExportResponse.json()
    console.log('Landline Export Response:', landlineResult)
    
    if (landlineResult.success && landlineResult.data.content) {
      console.log('✅ Landline export successful')
      console.log('📊 Content preview:', landlineResult.data.content.substring(0, 200) + '...')
      console.log('📈 Total records:', landlineResult.data.total_records)
    } else {
      console.log('❌ Landline export failed:', landlineResult.message || landlineResult.errors)
    }
  } catch (error) {
    console.error('❌ Landline export error:', error.message)
  }

  // Test 3: Export both mobile and landline (no type filter)
  console.log('\n📞 Test 3: Export All Numbers (Mobile + Landline)')
  try {
    const allExportResponse = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${TEST_CONFIG.authToken}`
      },
      body: JSON.stringify({
        user_id: TEST_CONFIG.userId,
        project_id: TEST_CONFIG.projectId,
        format: 'csv',
        filters: {
          valid_number: 'true' // Only valid numbers, no type filter
        },
        include_invalid: false,
        include_metadata: false
      })
    })

    const allResult = await allExportResponse.json()
    console.log('All Numbers Export Response:', allResult)
    
    if (allResult.success && allResult.data.content) {
      console.log('✅ All numbers export successful')
      console.log('📊 Content preview:', allResult.data.content.substring(0, 200) + '...')
      console.log('📈 Total records:', allResult.data.total_records)
    } else {
      console.log('❌ All numbers export failed:', allResult.message || allResult.errors)
    }
  } catch (error) {
    console.error('❌ All numbers export error:', error.message)
  }

  console.log('\n🎯 Test Summary:')
  console.log('- Mobile-only export: Check if only mobile numbers are included')
  console.log('- Landline-only export: Check if only landline numbers are included')
  console.log('- All numbers export: Check if both mobile and landline are included')
  console.log('\n💡 Next steps:')
  console.log('1. Update TEST_CONFIG with your actual user ID, project ID, and auth token')
  console.log('2. Run this script: node test-export-with-filters.js')
  console.log('3. Verify the exported content contains the correct line types')
}

// Instructions for running the test
console.log('📋 Setup Instructions:')
console.log('1. Update TEST_CONFIG with your actual values:')
console.log('   - userId: Get from localStorage god_bless_user_data')
console.log('   - projectId: Get from a project in your system')
console.log('   - authToken: Get from localStorage god_bless_auth_token')
console.log('2. Make sure your backend is running on localhost:8000')
console.log('3. Run: node test-export-with-filters.js')
console.log('')

// Run the test if this script is executed directly
if (require.main === module) {
  testExportWithFilters().catch(console.error)
}

module.exports = { testExportWithFilters }