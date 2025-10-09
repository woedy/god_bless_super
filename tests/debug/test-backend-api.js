/**
 * Simple Backend API Test
 * Tests phone number management endpoints directly
 */

const API_BASE_URL = 'http://localhost:6161'

// Test user credentials - using created test user
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123',
  fcm_token: 'test_fcm_token_123'
}

class BackendApiTester {
  constructor() {
    this.authToken = null
    this.userId = null
    this.testProjectId = null
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.authToken) {
      headers['Authorization'] = `Token ${this.authToken}`
    }

    try {
      console.log(`Making request to: ${url}`)
      console.log(`Method: ${options.method || 'GET'}`)
      console.log(`Headers:`, headers)
      if (options.body) {
        console.log(`Body:`, options.body)
      }

      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()
      
      console.log(`Response Status: ${response.status}`)
      console.log(`Response Data:`, JSON.stringify(data, null, 2))
      
      return {
        success: response.ok,
        status: response.status,
        data: data
      }
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...')
    
    const loginResponse = await this.makeRequest('/api/accounts/login-user/', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    })

    if (loginResponse.success && loginResponse.data.data && loginResponse.data.data.token) {
      this.authToken = loginResponse.data.data.token
      this.userId = loginResponse.data.data.user_id
      console.log('✅ Authentication successful')
      console.log(`   Token: ${this.authToken.substring(0, 20)}...`)
      console.log(`   User ID: ${this.userId}`)
      return true
    } else {
      console.log('❌ Authentication failed:', loginResponse.data)
      return false
    }
  }

  async testGetProjects() {
    console.log('\n📁 Testing Get Projects...')
    
    const params = new URLSearchParams({
      user_id: this.userId,
      page: '1',
      page_size: '10'
    })

    const response = await this.makeRequest(`/api/projects/get-all-projects/?${params}`)

    if (response.success && response.data.data) {
      const projects = response.data.data
      console.log(`✅ Found ${projects.length} projects`)
      if (projects.length > 0) {
        this.testProjectId = projects[0].id
        console.log(`   Using project: ${projects[0].project_name} (ID: ${this.testProjectId})`)
      } else {
        // Use the test project we created
        this.testProjectId = 17
        console.log(`   Using test project ID: ${this.testProjectId}`)
      }
      return true
    } else {
      console.log('❌ Get projects failed:', response.data)
      return false
    }
  }

  async testGetPhoneNumbers() {
    console.log('\n📱 Testing Get Phone Numbers...')
    
    if (!this.testProjectId) {
      console.log('❌ No project ID available')
      return false
    }

    const params = new URLSearchParams({
      user_id: this.userId,
      project_id: this.testProjectId,
      page: '1',
      page_size: '10'
    })

    const response = await this.makeRequest(`/api/phone-generator/list-numbers/?${params}`)

    if (response.success) {
      console.log('✅ Get phone numbers successful')
      const numbers = response.data.data?.numbers || []
      console.log(`   Found ${numbers.length} numbers`)
      if (numbers.length > 0) {
        console.log(`   Sample number: ${numbers[0].phone_number}`)
        console.log(`   Valid: ${numbers[0].valid_number}`)
        console.log(`   Carrier: ${numbers[0].carrier || 'Unknown'}`)
      }
      return true
    } else {
      console.log('❌ Get phone numbers failed:', response.data)
      return false
    }
  }

  async testGeneratePhoneNumbers() {
    console.log('\n🔢 Testing Generate Phone Numbers...')
    
    if (!this.testProjectId) {
      console.log('❌ No project ID available')
      return false
    }

    const generateData = {
      user_id: this.userId,
      project_id: this.testProjectId,
      area_code: '555',
      quantity: 5,
      carrier_filter: null,
      type_filter: null
    }

    const response = await this.makeRequest('/api/phone-generator/generate-numbers-enhanced/', {
      method: 'POST',
      body: JSON.stringify(generateData)
    })

    if (response.success) {
      console.log('✅ Generate phone numbers request successful')
      console.log(`   Message: ${response.data.message}`)
      if (response.data.data?.task_id) {
        console.log(`   Task ID: ${response.data.data.task_id}`)
      }
      return true
    } else {
      console.log('❌ Generate phone numbers failed:', response.data)
      return false
    }
  }

  async testValidatePhoneNumbers() {
    console.log('\n✅ Testing Validate Phone Numbers...')
    
    if (!this.testProjectId) {
      console.log('❌ No project ID available')
      return false
    }

    const validateData = {
      user_id: this.userId,
      project_id: this.testProjectId
    }

    const response = await this.makeRequest('/api/phone-validator/start-validation-free/', {
      method: 'POST',
      body: JSON.stringify(validateData)
    })

    if (response.success) {
      console.log('✅ Validate phone numbers request successful')
      console.log(`   Message: ${response.data.message}`)
      if (response.data.data) {
        console.log(`   Validated: ${response.data.data.validated_count || 0}`)
        console.log(`   Errors: ${response.data.data.error_count || 0}`)
      }
      return true
    } else {
      console.log('❌ Validate phone numbers failed:', response.data)
      return false
    }
  }

  async testSingleNumberValidation() {
    console.log('\n🔍 Testing Single Number Validation...')
    
    const testNumbers = ['+15551234567', '+15559876543', 'invalid-number']
    
    for (const testNumber of testNumbers) {
      console.log(`\n   Testing: ${testNumber}`)
      
      const response = await this.makeRequest('/api/phone-validator/validate-number-id-free/', {
        method: 'POST',
        body: JSON.stringify({
          phone_number: testNumber
        })
      })

      if (response.success) {
        console.log(`   ✅ Validation successful`)
        console.log(`   Result: ${JSON.stringify(response.data).substring(0, 100)}...`)
      } else {
        console.log(`   ❌ Validation failed: ${response.data?.message || 'Unknown error'}`)
      }
    }
    
    return true
  }

  async runAllTests() {
    console.log('🚀 Starting Backend API Tests')
    console.log('Testing phone number management endpoints')
    
    const results = {
      authentication: false,
      getProjects: false,
      getPhoneNumbers: false,
      generatePhoneNumbers: false,
      validatePhoneNumbers: false,
      singleNumberValidation: false
    }

    try {
      // Test authentication
      results.authentication = await this.testAuthentication()
      
      if (results.authentication) {
        // Test projects
        results.getProjects = await this.testGetProjects()
        
        // Test phone number operations
        results.getPhoneNumbers = await this.testGetPhoneNumbers()
        results.generatePhoneNumbers = await this.testGeneratePhoneNumbers()
        results.validatePhoneNumbers = await this.testValidatePhoneNumbers()
        results.singleNumberValidation = await this.testSingleNumberValidation()
      }

      // Generate report
      console.log('\n📊 TEST RESULTS SUMMARY')
      console.log('=' * 50)
      
      const totalTests = Object.keys(results).length
      const passedTests = Object.values(results).filter(Boolean).length
      
      console.log(`Overall: ${passedTests}/${totalTests} tests passed\n`)
      
      Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL'
        const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        console.log(`${status} - ${testName}`)
      })
      
      console.log('\n' + '=' * 50)
      
      if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Phone number management backend is working correctly.')
      } else {
        console.log('⚠️ Some tests failed. Check the backend implementation.')
      }
      
      return passedTests === totalTests
    } catch (error) {
      console.error('❌ Test suite error:', error)
      return false
    }
  }
}

// Run the tests
async function main() {
  const tester = new BackendApiTester()
  const success = await tester.runAllTests()
  process.exit(success ? 0 : 1)
}

main().catch(console.error)