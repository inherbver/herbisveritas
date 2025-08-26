#!/usr/bin/env node

/**
 * Script pour corriger les imports manquants de setupServerActionMocks
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Check if setupServerActionMocks is used but not imported
    if (content.includes('setupServerActionMocks()') && 
        !content.includes("from '@/test-utils/server-action-mocks'")) {
      
      // Check if there's already an import from server-action-mocks
      if (content.includes('@/test-utils/server-action-mocks')) {
        // Add to existing import
        content = content.replace(
          /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/test-utils\/server-action-mocks['"]/,
          (match, imports) => {
            const importList = imports.split(',').map(s => s.trim());
            if (!importList.includes('setupServerActionMocks')) {
              importList.push('setupServerActionMocks');
            }
            return `import { \n  ${importList.join(', \n  ')} \n} from '@/test-utils/server-action-mocks'`;
          }
        );
      } else {
        // Add new import after other imports
        const lastImportMatch = content.match(/(import[^;]+from[^;]+;)\s*\n(?!import)/);
        if (lastImportMatch) {
          const insertPoint = lastImportMatch.index + lastImportMatch[0].length;
          content = content.slice(0, insertPoint) + 
            `\nimport { setupServerActionMocks } from '@/test-utils/server-action-mocks';` +
            content.slice(insertPoint);
        } else {
          // Add at the beginning if no imports found
          content = `import { setupServerActionMocks } from '@/test-utils/server-action-mocks';\n\n` + content;
        }
      }
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Main
console.log('🔧 Fixing missing setupServerActionMocks imports');
console.log('=============================================\n');

const testFiles = glob.sync('src/**/__tests__/**/*.test.{ts,tsx}', {
  ignore: ['**/node_modules/**']
});

let fixedCount = 0;

testFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log('\n📊 Summary');
console.log('==========');
console.log(`Files checked: ${testFiles.length}`);
console.log(`Files fixed: ${fixedCount}`);

if (fixedCount > 0) {
  console.log('\n✨ Imports fixed! Run npm test to verify.');
}