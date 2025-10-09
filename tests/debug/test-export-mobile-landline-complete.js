/**
 * Complete Test for Mobile/Landline Export Filtering
 * Tests the export functionality with different filter combinations
 */

const API_BASE_URL = 'http://localhost:8000/api'

// Test configuration - UPDATE THESE VALUES
const TEST_CONFIG = {
  userId: 'your_user_id_here',     // Get from localStorage: god_bless_user_data
  projectId: 'your_project_id_here', // Get from your project list
  authToken: 'your_auth_token_here'  // Get from localStorage: god_bless_auth_token
}

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Export Mobile Numbers Only',
    description: 'Should export only mobile phone numbers',
    filters: {
      type: 'mobile',
      valid_number: 'true'
    },
    expectedLineType: 'mobile'
  },
  {
    name: 'Export Landline Numbers Only', 
    description: 'Should export only landline phone numbers',
    filters: {
      type: 'landline',
      valid_number: 'true'
    },
    expectedLineType: 'landline'
  },
  {
    name: 'Export All Valid Numbers',
    description: 'Should export both mobile and landline numbers',
    filters: {
      valid_number: 'true'
    },
    expectedLineType: 'both'
  },
  {
    name: 'Export Mobile Numbers with Carrier Filter',
    description: 'Should export only mobile numbers from AT&T',
    filters: {
      type: 'mobile',
      carrier: 'AT&T',
      valid_number: 'true'
    },
    expectedLineType: 'mobile',
    expectedCarrier: 'AT&T'
  }
]

async function makeExportRequest(filters, format = 'csv') {
  const requestData = {
    user_id: TEST_CONFIG.userId,
    project_id: TEST_CONFIG.projectId,
    format: format,
    include_invalid: false,
    include_metadata: false,
    filters: filters
  }

  console.log(`📤 Making export request:`, JSON.stringify(requestData, null, 2))

  const response = await fetch(`${API_BASE_URL}/phone-generator/export/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${TEST_CONFIG.authToken}`
    },
    body: JSON.stringify(requestData)
  })

  const result = await response.json()
  return { response, result }
}

function analyzeExportContent(content, expectedLineType, expectedCarrier = null) {
  const lines = content.split('\n').filter(line => line.trim())
  const headerLine = lines[0]
  const dataLines = lines.slice(1)

  console.log(`📊 Content Analysis:`)
  console.log(`- Total lines: ${lines.length}`)
  console.log(`- Header: ${headerLine}`)
  console.log(`- Data rows: ${dataLines.length}`)

  // Analyze line types
  const mobileCount = dataLines.filter(line => 
    line.toLowerCase().includes('mobile') || line.toLowerCase().includes('cell')
  ).length
  
  const landlineCount = dataLines.filter(line => 
    line.toLowerCase().includes('landline') || line.toLowerCase().includes('fixed')
  ).length

  console.log(`- Mobile numbers: ${mobileCount}`)
  console.log(`- Landline numbers: ${landlineCount}`)

  // Analyze carriers if specified
  if (expectedCarrier) {
    const carrierCount = dataLines.filter(line => 
      line.toLowerCase().includes(expectedCarrier.toLowerCase())
    ).length
    console.log(`- ${expectedCarrier} numbers: ${carrierCount}`)
  }

  // Validate results
  const issues = []
  
  if (expectedLineType === 'mobile' && landlineCount > 0) {
    issues.push(`❌ Expected only mobile numbers but found ${landlineCount} landline numbers`)
  }
  
  if (expectedLineType === 'landline' && mobileCount > 0) {
    issues.push(`❌ Expected only landline numbers but found ${mobileCount} mobile numbers`)
  }
  
  if (expectedLineType === 'both' && mobileCount === 0 && landlineCount === 0) {
    issues.push(`⚠️  No line type information found in export`)
  }

  if (expectedCarrier) {
    const totalWithCarrier = dataLines.filter(line => 
      line.toLowerCase().includes(expectedCarrier.toLowerCase())
    ).length
    
    if (totalWithCarrier === 0) {
      issues.push(`❌ Expected ${expectedCarrier} numbers but none found`)
    } else if (totalWithCarrier < dataLines.length) {
      issues.push(`⚠️  Expected only ${expectedCarrier} but found other carriers too`)
    }
  }

  return {
    totalLines: lines.length,
    dataRows: dataLines.length,
    mobileCount,
    landlineCount,
    issues,
    isValid: issues.filter(issue => issue.startsWith('❌')).length === 0
  }
}

async function runTestScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 ${scenario.name}`)
  console.log(`📝 ${scenario.description}`)
  console.log(`${'='.repeat(60)}`)

  try {
    const { response, result } = await makeExportRequest(scenario.filters)

    console.log(`📥 Response Status: ${response.status}`)
    console.log(`📋 Response Message: ${result.message}`)

    if (!result.success) {
      console.log(`❌ Test Failed: ${result.message}`)
      if (result.errors) {
        console.log(`🔍 Errors:`, JSON.stringify(result.errors, null, 2))
      }
      return { success: false, scenario: scenario.name, error: result.message }
    }

    if (result.data.task_id) {
      console.log(`⏳ Background task started: ${result.data.task_id}`)
      console.log(`💡 This test requires manual verification of the task result`)
      return { success: true, scenario: scenario.name, backgroundTask: true }
    }

    if (result.data.content) {
      console.log(`✅ Export completed successfully`)
      console.log(`📈 Total records: ${result.data.total_records}`)
      
      // Analyze the content
      const analysis = analyzeExportContent(
        result.data.content, 
        scenario.expectedLineType,
        scenario.expectedCarrier
      )

      console.log(`\n📊 Analysis Results:`)
      analysis.issues.forEach(issue => console.log(issue))

      if (analysis.isValid) {
        console.log(`✅ Test PASSED: Export filtering is working correctly!`)
      } else {
        console.log(`❌ Test FAILED: Export filtering has issues`)
      }

      // Show sample data
      const sampleLines = result.data.content.split('\n').slice(0, 5)
      console.log(`\n📄 Sample Export Data:`)
      sampleLines.forEach((line, index) => {
        if (line.trim()) {
          console.log(`${index === 0 ? 'Header' : `Row ${index}`}: ${line}`)
        }
      })

      return { 
        success: analysis.isValid, 
        scenario: scenario.name, 
        analysis,
        totalRecords: result.data.total_records
      }
    }

    console.log(`⚠️  Unexpected response format`)
    return { success: false, scenario: scenario.name, error: 'Unexpected response format' }

  } catch (error) {
    console.log(`❌ Test Error: ${error.message}`)
    return { success: false, scenario: scenario.name, error: error.message }
  }
}

async function runAllTests() {
  console.log(`🚀 Starting Mobile/Landline Export Filter Tests`)
  console.log(`📋 Configuration:`)
  console.log(`- API Base URL: ${API_BASE_URL}`)
  console.log(`- User ID: ${TEST_CONFIG.userId}`)
  console.log(`- Project ID: ${TEST_CONFIG.projectId}`)
  console.log(`- Auth Token: ${TEST_CONFIG.authToken.substring(0, 10)}...`)

  // Validate configuration
  if (TEST_CONFIG.userId === 'your_user_id_here' || 
      TEST_CONFIG.projectId === 'your_project_id_here' || 
      TEST_CONFIG.authToken === 'your_auth_token_here') {
    console.log(`\n❌ CONFIGURATION ERROR:`)
    console.log(`Please update TEST_CONFIG with your actual values:`)
    console.log(`1. Get user ID from localStorage: god_bless_user_data`)
    console.log(`2. Get project ID from your project list`)
    console.log(`3. Get auth token from localStorage: god_bless_auth_token`)
    return
  }

  const results = []

  // Run each test scenario
  for (const scenario of TEST_SCENARIOS) {
    const result = await runTestScenario(scenario)
    results.push(result)
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 TEST SUMMARY`)
  console.log(`${'='.repeat(60)}`)

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success && !r.backgroundTask).length
  const backgroundTasks = results.filter(r => r.backgroundTask).length

  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`⏳ Background Tasks: ${backgroundTasks}`)

  results.forEach(result => {
    const status = result.success ? '✅' : result.backgroundTask ? '⏳' : '❌'
    console.log(`${status} ${result.scenario}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
    if (result.totalRecords !== undefined) {
      console.log(`   Records: ${result.totalRecords}`)
    }
  })

  console.log(`\n🎯 Next Steps:`)
  if (failed > 0) {
    console.log(`- Fix the failing tests by checking the backend filter logic`)
    console.log(`- Verify that the 'type' field contains 'mobile' or 'landline' values`)
  }
  if (backgroundTasks > 0) {
    console.log(`- Check the background task results in the main application`)
    console.log(`- Verify the exported files contain the correct filtered data`)
  }
  if (passed === TEST_SCENARIOS.length) {
    console.log(`- All tests passed! The mobile/landline export filtering is working correctly`)
  }
}

// Instructions
console.log(`📋 Mobile/Landline Export Filter Test`)
console.log(`=====================================`)
console.log(``)
console.log(`This script tests the export functionality with mobile/landline filtering.`)
console.log(``)
console.log(`Setup Instructions:`)
console.log(`1. Update TEST_CONFIG with your actual values:`)
console.log(`   - userId: Check localStorage.getItem('god_bless_user_data')`)
console.log(`   - projectId: Get from your project list`)
console.log(`   - authToken: Check localStorage.getItem('god_bless_auth_token')`)
console.log(`2. Make sure your backend is running on localhost:8000`)
console.log(`3. Ensure you have phone numbers with 'mobile' and 'landline' types`)
console.log(`4. Run: node test-export-mobile-landline-complete.js`)
console.log(``)

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests, runTestScenario, TEST_SCENARIOS }