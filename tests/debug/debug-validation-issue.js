/**
 * Debug Phone Number Validation Issue
 * Investigates why validation is failing with "No phone numbers found"
 */

const API_BASE_URL = 'http://localhost:6161'

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123',
  fcm_token: 'test_fcm_token_123'
}

class ValidationDebugger {
  constructor() {
    this.authToken = null
    this.userId = null
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
      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()
      
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

  async authenticate() {
    console.log('🔐 Authenticating...')
    
    const loginResponse = await this.makeRequest('/api/accounts/login-user/', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    })

    if (loginResponse.success && loginResponse.data.data && loginResponse.data.data.token) {
      this.authToken = loginResponse.data.data.token
      this.userId = loginResponse.data.data.user_id
      console.log('✅ Authentication successful')
      console.log(`   User ID: ${this.userId}`)
      return true
    } else {
      console.log('❌ Authentication failed:', loginResponse.data)
      return false
    }
  }

  async debugValidationIssue() {
    console.log('\n🔍 Debugging Validation Issue...')
    
    // Step 1: Get all user projects
    console.log('\n1. Checking user projects...')
    const projectsParams = new URLSearchParams({
      user_id: this.userId,
      page: '1',
      page_size: '20'
    })

    const projectsResponse = await this.makeRequest(`/api/projects/get-all-projects/?${projectsParams}`)
    
    if (!projectsResponse.success) {
      console.log('❌ Failed to get projects:', projectsResponse.data)
      return
    }

    const projects = projectsResponse.data.data.projects
    console.log(`✅ Found ${projects.length} projects`)
    
    // Step 2: Check phone numbers in each project
    for (const project of projects) {
      console.log(`\n2. Checking phone numbers in project "${project.project_name}" (ID: ${project.id})...`)
      
      const numbersParams = new URLSearchParams({
        user_id: this.userId,
        project_id: project.id,
        page: '1',
        page_size: '10'
      })

      const numbersResponse = await this.makeRequest(`/api/phone-generator/list-numbers/?${numbersParams}`)
      
      if (numbersResponse.success && numbersResponse.data.data) {
        const count = numbersResponse.data.data.pagination.count
        const numbers = numbersResponse.data.data.numbers
        
        console.log(`   📱 Project "${project.project_name}": ${count} phone numbers`)
        
        if (numbers.length > 0) {
          console.log(`   Sample numbers:`)
          numbers.slice(0, 3).forEach((num, index) => {
            console.log(`     ${index + 1}. ${num.phone_number} (Valid: ${num.valid_number}, ID: ${num.id})`)
          })
          
          // Step 3: Try validation on this project
          console.log(`\n3. Testing validation on project "${project.project_name}"...`)
          await this.testValidationOnProject(project.id, project.project_name)
        } else {
          console.log(`   ⚠️ No phone numbers in project "${project.project_name}"`)
        }
      } else {
        console.log(`   ❌ Failed to get numbers for project "${project.project_name}":`, numbersResponse.data)
      }
    }
  }

  async testValidationOnProject(projectId, projectName) {
    const validationData = {
      user_id: this.userId,
      project_id: projectId
    }

    console.log(`   Validation request data:`, validationData)

    const response = await this.makeRequest('/api/phone-validator/start-validation-free/', {
      method: 'POST',
      body: JSON.stringify(validationData)
    })

    if (response.success) {
      console.log(`   ✅ Validation successful for project "${projectName}"`)
      console.log(`   Response:`, response.data)
    } else {
      console.log(`   ❌ Validation failed for project "${projectName}"`)
      console.log(`   Error:`, response.data)
      
      // Check if it's the specific error we're debugging
      if (response.data.errors && response.data.errors.phone_id) {
        console.log(`   🔍 This is the "No phone numbers found" error`)
        
        // Let's check what the backend validation endpoint expects
        await this.investigateValidationEndpoint(projectId)
      }
    }
  }

  async investigateValidationEndpoint(projectId) {
    console.log(`\n4. Investigating validation endpoint requirements...`)
    
    // Try different validation request formats
    const variations = [
      // Variation 1: Just project_id
      { project_id: projectId },
      
      // Variation 2: user_id and project_id (current format)
      { user_id: this.userId, project_id: projectId },
      
      // Variation 3: Add phone_id field (maybe it expects specific phone IDs)
      { user_id: this.userId, project_id: projectId, phone_id: 'all' },
      
      // Variation 4: Try with string project_id
      { user_id: this.userId, project_id: projectId.toString() }
    ]

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i]
      console.log(`\n   Testing variation ${i + 1}:`, variation)
      
      const response = await this.makeRequest('/api/phone-validator/start-validation-free/', {
        method: 'POST',
        body: JSON.stringify(variation)
      })

      if (response.success) {
        console.log(`   ✅ Variation ${i + 1} worked!`)
        console.log(`   Response:`, response.data)
        return variation
      } else {
        console.log(`   ❌ Variation ${i + 1} failed:`, response.data.message || response.data)
      }
    }

    console.log(`\n   🔍 All variations failed. Let's check the backend validation logic...`)
    return null
  }

  async checkBackendValidationLogic() {
    console.log(`\n5. Checking backend validation requirements...`)
    
    // Let's see what the validation endpoint documentation says
    console.log(`   The error "No phone numbers found for validation" suggests:`)
    console.log(`   1. The project might not have any phone numbers`)
    console.log(`   2. The phone numbers might not be in a validatable state`)
    console.log(`   3. There might be a filter preventing numbers from being found`)
    console.log(`   4. The user might not have access to the phone numbers`)
    
    // Let's check if there are any phone numbers that need validation
    console.log(`\n   Checking phone number validation status...`)
    
    const params = new URLSearchParams({
      user_id: this.userId,
      page: '1',
      page_size: '50'
    })

    const response = await this.makeRequest(`/api/phone-generator/list-numbers/?${params}`)
    
    if (response.success && response.data.data) {
      const numbers = response.data.data.numbers
      console.log(`   Total numbers found: ${numbers.length}`)
      
      const validationStats = numbers.reduce((stats, num) => {
        if (num.valid_number === null) stats.unvalidated++
        else if (num.valid_number === true) stats.valid++
        else if (num.valid_number === false) stats.invalid++
        
        if (num.validation_attempted) stats.attempted++
        
        return stats
      }, { unvalidated: 0, valid: 0, invalid: 0, attempted: 0 })
      
      console.log(`   Validation stats:`)
      console.log(`     - Unvalidated: ${validationStats.unvalidated}`)
      console.log(`     - Valid: ${validationStats.valid}`)
      console.log(`     - Invalid: ${validationStats.invalid}`)
      console.log(`     - Validation attempted: ${validationStats.attempted}`)
      
      if (validationStats.unvalidated === 0) {
        console.log(`   ⚠️ All numbers are already validated - this might be why validation fails`)
      }
    }
  }

  async runDebug() {
    console.log('🚀 Starting Phone Number Validation Debug')
    console.log('Investigating "No phone numbers found for validation" error')
    
    try {
      const authenticated = await this.authenticate()
      if (!authenticated) return false

      await this.debugValidationIssue()
      await this.checkBackendValidationLogic()
      
      console.log('\n📊 DEBUG SUMMARY:')
      console.log('• Checked all user projects and their phone numbers')
      console.log('• Tested different validation request formats')
      console.log('• Analyzed phone number validation status')
      console.log('• The issue is likely one of the following:')
      console.log('  1. All numbers are already validated')
      console.log('  2. Backend expects different request format')
      console.log('  3. Project/user access issue')
      console.log('  4. Backend validation logic has specific requirements')
      
      return true
    } catch (error) {
      console.error('❌ Debug error:', error)
      return false
    }
  }
}

// Run the debug
async function main() {
  const validator = new ValidationDebugger()
  await validator.runDebug()
}

main().catch(console.error)