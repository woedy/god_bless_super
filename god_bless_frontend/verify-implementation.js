/**
 * Implementation Verification Script
 * Checks that all required changes for Task 7 are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];
let passed = 0;
let failed = 0;

function check(name, condition, details = '') {
  const result = condition ? '✅ PASS' : '❌ FAIL';
  const message = `${result} - ${name}`;
  console.log(message);
  if (details && !condition) {
    console.log(`   Details: ${details}`);
  }
  checks.push({ name, passed: condition, details });
  if (condition) passed++;
  else failed++;
}

function fileExists(filePath) {
  try {
    return fs.existsSync(path.join(__dirname, filePath));
  } catch (e) {
    return false;
  }
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    return content.includes(searchString);
  } catch (e) {
    return false;
  }
}

function fileDoesNotContain(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    return !content.includes(searchString);
  } catch (e) {
    return false;
  }
}

console.log('\n=== Implementation Verification for Task 7 ===\n');

// Task 7.1: GenerateNumbersPage
console.log('\n--- Task 7.1: GenerateNumbersPage ---');
check(
  'GenerateNumbersPage exists',
  fileExists('src/pages/PhoneManagement/GenerateNumbersPage.tsx')
);
check(
  'GenerateNumbersPage imports useTaskWebSocket',
  fileContains('src/pages/PhoneManagement/GenerateNumbersPage.tsx', 'useTaskWebSocket')
);
check(
  'GenerateNumbersPage imports TaskProgressCard',
  fileContains('src/pages/PhoneManagement/GenerateNumbersPage.tsx', 'TaskProgressCard')
);
check(
  'GenerateNumbersPage removed inline WebSocket code',
  fileDoesNotContain('src/pages/PhoneManagement/GenerateNumbersPage.tsx', 'new WebSocket(')
);
check(
  'GenerateNumbersPage removed polling fallback',
  fileDoesNotContain('src/pages/PhoneManagement/GenerateNumbersPage.tsx', 'setInterval')
);

// Task 7.2: ValidateNumbersPage
console.log('\n--- Task 7.2: ValidateNumbersPage ---');
check(
  'ValidateNumbersPage exists',
  fileExists('src/pages/PhoneManagement/ValidateNumbersPage.tsx')
);
check(
  'ValidateNumbersPage imports useTaskWebSocket',
  fileContains('src/pages/PhoneManagement/ValidateNumbersPage.tsx', 'useTaskWebSocket')
);
check(
  'ValidateNumbersPage imports TaskProgressCard',
  fileContains('src/pages/PhoneManagement/ValidateNumbersPage.tsx', 'TaskProgressCard')
);
check(
  'ValidateNumbersPage removed inline WebSocket code',
  fileDoesNotContain('src/pages/PhoneManagement/ValidateNumbersPage.tsx', 'new WebSocket(')
);

// Task 7.3: TaskProgressCard
console.log('\n--- Task 7.3: TaskProgressCard Integration ---');
check(
  'TaskProgressCard component exists',
  fileExists('src/components/TaskProgress/TaskProgressCard.tsx')
);
check(
  'useTaskWebSocket hook exists',
  fileExists('src/hooks/useTaskWebSocket.ts')
);

// Task 7.5: ValidateInfo Redirect
console.log('\n--- Task 7.5: ValidateInfo Redirect ---');
check(
  'ValidateInfo exists',
  fileExists('src/pages/AllNumbers/ValidateInfo.tsx')
);
check(
  'ValidateInfo redirects to /validate-number',
  fileContains('src/pages/AllNumbers/ValidateInfo.tsx', '/validate-number')
);
check(
  'ValidateInfo uses replace: true',
  fileContains('src/pages/AllNumbers/ValidateInfo.tsx', 'replace: true')
);

// Task 7.6: Export Functionality
console.log('\n--- Task 7.6: Export Functionality ---');
check(
  'exportUtils exists',
  fileExists('src/components/DataTable/exportUtils.ts')
);
check(
  'AllNumbersPage exists',
  fileExists('src/pages/PhoneManagement/AllNumbersPage.tsx')
);
check(
  'AllNumbersPage uses exportToCSV',
  fileContains('src/pages/PhoneManagement/AllNumbersPage.tsx', 'exportToCSV')
);
check(
  'AllNumbersPage uses exportToJSON',
  fileContains('src/pages/PhoneManagement/AllNumbersPage.tsx', 'exportToJSON')
);

// Testing Documentation
console.log('\n--- Testing Documentation ---');
check(
  'Test file exists',
  fileExists('src/tests/phone-generation-feedback.test.tsx')
);
check(
  'Testing checklist exists',
  fileExists('FINAL_TESTING_CHECKLIST.md')
);
check(
  'Test results document exists',
  fileExists('MANUAL_TEST_RESULTS.md')
);

// Summary
console.log('\n=== Summary ===');
console.log(`Total Checks: ${checks.length}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Success Rate: ${((passed / checks.length) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All implementation checks passed!');
  console.log('✅ Ready for manual testing');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the implementation.');
  process.exit(1);
}
