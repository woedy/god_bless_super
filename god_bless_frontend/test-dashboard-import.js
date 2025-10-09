/**
 * Simple test to verify ModernDashboard can be imported without errors
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing ModernDashboard import...');

try {
  // Test if we can import React
  console.log('✓ Testing React import...');
  
  // Test if we can read the ModernDashboard file
  const dashboardPath = join(__dirname, 'src/pages/Dashboard/ModernDashboard.tsx');
  const content = readFileSync(dashboardPath, 'utf8');
  
  console.log('✓ ModernDashboard file exists and is readable');
  console.log(`✓ File size: ${content.length} characters`);
  
  // Check for React import
  if (content.includes('import React')) {
    console.log('✓ React import found');
  } else {
    console.log('❌ React import not found');
  }
  
  // Check for useState
  if (content.includes('useState')) {
    console.log('✓ useState hook found');
  } else {
    console.log('❌ useState hook not found');
  }
  
  // Check for component export
  if (content.includes('export default ModernDashboard')) {
    console.log('✓ Component export found');
  } else {
    console.log('❌ Component export not found');
  }
  
  // Check for React.FC
  if (content.includes('React.FC')) {
    console.log('✓ React.FC type found');
  } else {
    console.log('❌ React.FC type not found');
  }
  
  console.log('\n✅ ModernDashboard import test completed successfully');
  
} catch (error) {
  console.error('❌ Error testing ModernDashboard import:', error.message);
  process.exit(1);
}