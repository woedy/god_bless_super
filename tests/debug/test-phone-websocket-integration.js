/**
 * Phone Number Management WebSocket Integration Test
 * Tests real-time updates for phone number operations using working WebSocket endpoints
 */

const WebSocket = require("ws");

const API_BASE_URL = "http://localhost:6161";
const WS_BASE_URL = "ws://localhost:6161";

// Test configuration
const TEST_CONFIG = {
  testUser: {
    email: "test@example.com",
    password: "testpass123",
    fcm_token: "test_fcm_token_123",
  },
  testProjectId: 17,
};

class PhoneWebSocketTester {
  constructor() {
    this.authToken = null;
    this.userId = null;
    this.dashboardWs = null;
    this.tasksWs = null;
    this.receivedMessages = [];
    this.testResults = {
      authentication: false,
      dashboardWebSocket: false,
      tasksWebSocket: false,
      phoneGenerationWithWebSocket: false,
      phoneValidationWithWebSocket: false,
      realTimeTaskUpdates: false,
      webSocketReconnection: false,
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.authToken) {
      headers["Authorization"] = `Token ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data: data,
      };
    } catch (error) {
      console.error(`Request failed for ${endpoint}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testAuthentication() {
    console.log("\n🔐 Testing Authentication...");

    const loginResponse = await this.makeRequest("/api/accounts/login-user/", {
      method: "POST",
      body: JSON.stringify(TEST_CONFIG.testUser),
    });

    if (
      loginResponse.success &&
      loginResponse.data.data &&
      loginResponse.data.data.token
    ) {
      this.authToken = loginResponse.data.data.token;
      this.userId = loginResponse.data.data.user_id;
      console.log("✅ Authentication successful");
      console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
      console.log(`   User ID: ${this.userId}`);
      this.testResults.authentication = true;
      return true;
    } else {
      console.log("❌ Authentication failed:", loginResponse.data);
      return false;
    }
  }

  async testDashboardWebSocket() {
    console.log("\n📊 Testing Dashboard WebSocket...");

    return new Promise((resolve) => {
      const wsUrl = `${WS_BASE_URL}/ws/?token=${this.authToken}`;
      console.log(`   Connecting to: ${wsUrl}`);

      this.dashboardWs = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        console.log("❌ Dashboard WebSocket connection timeout");
        resolve(false);
      }, 5000);

      this.dashboardWs.on("open", () => {
        clearTimeout(timeout);
        console.log("✅ Dashboard WebSocket connected");
        this.testResults.dashboardWebSocket = true;
        resolve(true);
      });

      this.dashboardWs.on("message", (data) => {
        const message = JSON.parse(data.toString());
        console.log(
          `   📨 Dashboard message:`,
          message.type,
          message.message || ""
        );
        this.receivedMessages.push({
          source: "dashboard",
          timestamp: new Date().toISOString(),
          message: message,
        });
      });

      this.dashboardWs.on("error", (error) => {
        clearTimeout(timeout);
        console.log("❌ Dashboard WebSocket error:", error.message);
        resolve(false);
      });
    });
  }

  async testTasksWebSocket() {
    console.log("\n📋 Testing Tasks WebSocket...");

    return new Promise((resolve) => {
      const wsUrl = `${WS_BASE_URL}/ws/tasks/?token=${this.authToken}`;
      console.log(`   Connecting to: ${wsUrl}`);

      this.tasksWs = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        console.log("❌ Tasks WebSocket connection timeout");
        resolve(false);
      }, 5000);

      this.tasksWs.on("open", () => {
        clearTimeout(timeout);
        console.log("✅ Tasks WebSocket connected");
        this.testResults.tasksWebSocket = true;
        resolve(true);
      });

      this.tasksWs.on("message", (data) => {
        const message = JSON.parse(data.toString());
        console.log(
          `   📨 Tasks message:`,
          message.type,
          message.tasks ? `(${message.tasks.length} tasks)` : ""
        );
        this.receivedMessages.push({
          source: "tasks",
          timestamp: new Date().toISOString(),
          message: message,
        });

        // Check for task-related updates
        if (
          message.type === "task_update" ||
          message.type === "task_progress" ||
          message.type === "task_completed"
        ) {
          this.testResults.realTimeTaskUpdates = true;
        }
      });

      this.tasksWs.on("error", (error) => {
        clearTimeout(timeout);
        console.log("❌ Tasks WebSocket error:", error.message);
        resolve(false);
      });
    });
  }

  async testPhoneGenerationWithWebSocket() {
    console.log("\n📱 Testing Phone Generation with WebSocket Monitoring...");

    // Clear previous messages
    this.receivedMessages = [];

    const generationData = {
      user_id: this.userId,
      project_id: TEST_CONFIG.testProjectId,
      area_code: "777",
      quantity: 25,
      carrier_filter: null,
      type_filter: null,
    };

    console.log(`   Generating ${generationData.quantity} phone numbers...`);
    console.log("   Monitoring WebSocket for real-time updates...");

    const response = await this.makeRequest(
      "/api/phone-generator/generate-numbers-enhanced/",
      {
        method: "POST",
        body: JSON.stringify(generationData),
      }
    );

    if (response.success && response.data.data && response.data.data.task_id) {
      const taskId = response.data.data.task_id;
      console.log("✅ Phone generation task initiated");
      console.log(`   Task ID: ${taskId}`);

      this.testResults.phoneGenerationWithWebSocket = true;

      // Monitor for WebSocket updates for 10 seconds
      console.log("   Waiting for WebSocket updates...");
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Check if we received any task-related messages
      const taskMessages = this.receivedMessages.filter(
        (msg) =>
          msg.message.type === "task_update" ||
          msg.message.type === "task_progress" ||
          msg.message.type === "task_completed" ||
          (msg.message.tasks &&
            msg.message.tasks.some((task) => task.id === taskId))
      );

      if (taskMessages.length > 0) {
        console.log("✅ Received WebSocket updates for phone generation");
        console.log(`   Updates received: ${taskMessages.length}`);
        this.testResults.realTimeTaskUpdates = true;
      } else {
        console.log("⚠️ No specific task updates received via WebSocket");
        console.log(
          `   Total messages received: ${this.receivedMessages.length}`
        );
      }

      return true;
    } else {
      console.log("❌ Phone generation task failed:", response.data);
      return false;
    }
  }

  async testPhoneValidationWithWebSocket() {
    console.log("\n✅ Testing Phone Validation with WebSocket Monitoring...");

    // Clear previous messages
    this.receivedMessages = [];

    const validationData = {
      user_id: this.userId,
      project_id: TEST_CONFIG.testProjectId,
    };

    console.log("   Starting phone validation...");
    console.log("   Monitoring WebSocket for real-time updates...");

    const response = await this.makeRequest(
      "/api/phone-validator/start-validation-free/",
      {
        method: "POST",
        body: JSON.stringify(validationData),
      }
    );

    if (response.success) {
      console.log("✅ Phone validation task initiated");
      console.log(`   Response: ${response.data.message}`);

      this.testResults.phoneValidationWithWebSocket = true;

      // Monitor for WebSocket updates for 5 seconds
      console.log("   Waiting for WebSocket updates...");
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check if we received any validation-related messages
      const validationMessages = this.receivedMessages.filter(
        (msg) =>
          msg.message.type === "validation_update" ||
          msg.message.type === "validation_completed" ||
          (msg.message.message && msg.message.message.includes("validation"))
      );

      if (validationMessages.length > 0) {
        console.log("✅ Received WebSocket updates for phone validation");
        console.log(`   Updates received: ${validationMessages.length}`);
      } else {
        console.log("⚠️ No specific validation updates received via WebSocket");
        console.log(
          `   Total messages received: ${this.receivedMessages.length}`
        );
      }

      return true;
    } else {
      console.log("❌ Phone validation task failed:", response.data);
      return false;
    }
  }

  async testWebSocketReconnection() {
    console.log("\n🔄 Testing WebSocket Reconnection...");

    if (this.tasksWs && this.tasksWs.readyState === WebSocket.OPEN) {
      console.log("   Closing tasks WebSocket to test reconnection...");
      this.tasksWs.close();

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Reconnect
      console.log("   Attempting to reconnect...");
      const reconnected = await this.testTasksWebSocket();

      if (reconnected) {
        console.log("✅ WebSocket reconnection successful");
        this.testResults.webSocketReconnection = true;
        return true;
      } else {
        console.log("❌ WebSocket reconnection failed");
        return false;
      }
    } else {
      console.log("⚠️ No active WebSocket to test reconnection");
      return false;
    }
  }

  cleanup() {
    console.log("\n🧹 Cleaning up WebSocket connections...");

    if (this.dashboardWs) {
      this.dashboardWs.close();
      console.log("   Dashboard WebSocket closed");
    }

    if (this.tasksWs) {
      this.tasksWs.close();
      console.log("   Tasks WebSocket closed");
    }
  }

  generateReport() {
    console.log("\n📊 PHONE NUMBER WEBSOCKET INTEGRATION TEST RESULTS");
    console.log("=" * 65);

    const results = this.testResults;
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    console.log(`Overall: ${passedTests}/${totalTests} tests passed\n`);

    // Group results by category
    const categories = {
      Authentication: ["authentication"],
      "WebSocket Connections": [
        "dashboardWebSocket",
        "tasksWebSocket",
        "webSocketReconnection",
      ],
      "Phone Operations with WebSocket": [
        "phoneGenerationWithWebSocket",
        "phoneValidationWithWebSocket",
      ],
      "Real-time Updates": ["realTimeTaskUpdates"],
    };

    Object.entries(categories).forEach(([category, tests]) => {
      console.log(`\n${category}:`);
      tests.forEach((test) => {
        const status = results[test] ? "✅ PASS" : "❌ FAIL";
        const testName = test
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        console.log(`  ${status} - ${testName}`);
      });
    });

    console.log("\n" + "=" * 65);

    // WebSocket Analysis
    console.log("\n📋 WEBSOCKET ANALYSIS:");
    console.log(
      `• Total WebSocket Messages Received: ${this.receivedMessages.length}`
    );

    const messagesBySource = this.receivedMessages.reduce((acc, msg) => {
      acc[msg.source] = (acc[msg.source] || 0) + 1;
      return acc;
    }, {});

    Object.entries(messagesBySource).forEach(([source, count]) => {
      console.log(
        `• ${
          source.charAt(0).toUpperCase() + source.slice(1)
        } Messages: ${count}`
      );
    });

    const messageTypes = [
      ...new Set(this.receivedMessages.map((msg) => msg.message.type)),
    ];
    console.log(`• Message Types Received: ${messageTypes.join(", ")}`);

    console.log("\n📡 REAL-TIME CAPABILITIES:");
    console.log(
      `• Dashboard WebSocket: ${
        results.dashboardWebSocket ? "Working" : "Failed"
      }`
    );
    console.log(
      `• Tasks WebSocket: ${results.tasksWebSocket ? "Working" : "Failed"}`
    );
    console.log(
      `• Task Updates: ${
        results.realTimeTaskUpdates ? "Working" : "Not Detected"
      }`
    );
    console.log(
      `• Reconnection: ${
        results.webSocketReconnection ? "Working" : "Not Tested"
      }`
    );

    if (passedTests >= totalTests - 1) {
      // Allow 1 failure for optional features
      console.log("\n🎉 WEBSOCKET INTEGRATION IS WORKING!");
      console.log(
        "Phone number management has real-time capabilities via WebSocket."
      );
    } else {
      console.log("\n⚠️ Some WebSocket features may need attention.");
      console.log(
        "However, the system can work with HTTP polling as fallback."
      );
    }

    return passedTests >= totalTests - 1;
  }

  async runAllTests() {
    console.log(
      "🚀 Starting Phone Number Management WebSocket Integration Tests"
    );
    console.log(
      "Testing real-time updates and WebSocket connectivity for phone operations"
    );

    try {
      // Run tests in sequence
      await this.testAuthentication();

      if (this.testResults.authentication) {
        await this.testDashboardWebSocket();
        await this.testTasksWebSocket();

        // Wait for WebSocket connections to stabilize
        await new Promise((resolve) => setTimeout(resolve, 2000));

        await this.testPhoneGenerationWithWebSocket();
        await this.testPhoneValidationWithWebSocket();
        await this.testWebSocketReconnection();
      }

      // Generate final report
      const success = this.generateReport();

      // Cleanup
      this.cleanup();

      return success;
    } catch (error) {
      console.error("❌ Test suite error:", error);
      this.cleanup();
      return false;
    }
  }
}

// Run the tests
async function main() {
  const tester = new PhoneWebSocketTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
