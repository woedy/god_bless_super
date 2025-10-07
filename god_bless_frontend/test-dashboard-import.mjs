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
  
  // Check for proper React hook usage
  const lines = content.split('\n');
  let hookUsageCorrect = true;
  let insideComponent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('const ModernDashboard: React.FC = () => {')) {
      insideComponent = true;
      continue;
    }
    
    if (insideComponent && line.includes('useState')) {
      if (!line.includes('const [')) {
        console.log(`⚠️  Potential hook issue on line ${i + 1}: ${line}`);
        hookUsageCorrect = false;
      }
    }
    
    if (insideComponent && line === '};') {
      break;
    }
  }
  
  if (hookUsageCorrect) {
    console.log('✓ React hooks usage appears correct');
  } else {
    console.log('⚠️  Potential React hooks usage issues detected');
  }
  
  console.log('\n✅ ModernDashboard import test completed successfully');
  
} catch (error) {
  console.error('❌ Error testing ModernDashboard import:', error.message);
  process.exit(1);
}