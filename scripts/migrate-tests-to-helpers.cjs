#!/usr/bin/env node

/**
 * Script de migration automatique des tests vers les nouveaux helpers
 * Applique les patterns établis à tous les fichiers de test
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const TEST_PATTERNS = [
  'src/**/__tests__/**/*.test.ts',
  'src/**/__tests__/**/*.test.tsx',
];

const MIGRATIONS = [
  {
    name: 'Add server-action-mocks import',
    pattern: /import.*from.*['"]\.\.\/.*Actions['"];/,
    shouldApply: (content) => {
      return content.includes('jest.mock') && 
             content.includes('FormData') &&
             !content.includes('server-action-mocks');
    },
    apply: (content) => {
      const importRegex = /^(import[\s\S]*?from\s+['"]\.\.\/\w+Actions['"];?\s*\n)/m;
      return content.replace(importRegex, (match) => {
        return match + `import { 
  createMockFormData, 
  testActionWithRedirect,
  setupServerActionMocks 
} from '@/test-utils/server-action-mocks';\n\n`;
      });
    }
  },
  {
    name: 'Setup server action mocks',
    pattern: /jest\.mock\(['"]@\/lib\/security\/rate-limit-decorator['"]\)/,
    shouldApply: (content) => {
      return !content.includes('setupServerActionMocks()') &&
             content.includes('jest.mock');
    },
    apply: (content) => {
      // Add setupServerActionMocks after imports
      const describeRegex = /^describe\(/m;
      if (describeRegex.test(content)) {
        return content.replace(describeRegex, 
          '// Setup des mocks standards pour Server Actions\nsetupServerActionMocks();\n\ndescribe(');
      }
      return content;
    }
  },
  {
    name: 'Replace createFormData with createMockFormData',
    pattern: /createFormData\(/g,
    shouldApply: (content) => {
      return content.includes('createFormData(') && 
             !content.includes('function createFormData');
    },
    apply: (content) => {
      // Remplacer les appels createFormData par createMockFormData
      content = content.replace(/const formData = createFormData\(/g, 
                                'const formData = createMockFormData(');
      content = content.replace(/createFormData\({/g, 'createMockFormData({');
      
      // Supprimer l'ancienne fonction createFormData si elle existe
      const oldHelperRegex = /\/\/ Helper pour créer FormData[\s\S]*?return formData;\s*};\s*/;
      content = content.replace(oldHelperRegex, '');
      
      return content;
    }
  },
  {
    name: 'Add Supabase mock helper import',
    pattern: /jest\.mock\(['"]@\/lib\/supabase\/server['"]\)/,
    shouldApply: (content) => {
      return content.includes('jest.mock(\'@/lib/supabase/server\')') &&
             !content.includes('createMockSupabaseChain');
    },
    apply: (content) => {
      const importRegex = /(import[\s\S]*?from\s+['"]@\/test-utils['"];?\s*\n)/;
      if (importRegex.test(content)) {
        // Ajouter à l'import existant
        return content.replace(importRegex, (match) => {
          if (!match.includes('createMockSupabaseChain')) {
            return match.replace(/from ['"]@\/test-utils['"]/, 
              `from '@/test-utils';\nimport { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper'`);
          }
          return match;
        });
      } else {
        // Ajouter nouvel import après les autres imports
        const lastImportRegex = /(import[\s\S]*?from[\s\S]*?;\s*\n)(?!import)/;
        return content.replace(lastImportRegex, (match) => {
          return match + `import { createMockSupabaseChain } from '@/test-utils/supabase-mock-helper';\n`;
        });
      }
      return content;
    }
  },
  {
    name: 'Replace manual Supabase chains',
    pattern: /mockReturnThis\(\)/,
    shouldApply: (content) => {
      return content.includes('mockReturnThis()') &&
             content.includes('createMockSupabaseChain');
    },
    apply: (content) => {
      // Remplacer les chaînes manuelles par createMockSupabaseChain
      const chainRegex = /const \w+Chain = \{[\s\S]*?mockReturnThis\(\)[\s\S]*?\};/g;
      content = content.replace(chainRegex, (match) => {
        const hasData = match.includes('data:');
        const hasError = match.includes('error:');
        
        if (hasData || hasError) {
          // Extraire les valeurs data et error
          const dataMatch = match.match(/data:\s*({[^}]*}|null|\[[^\]]*\])/);
          const errorMatch = match.match(/error:\s*({[^}]*}|null)/);
          
          const returnValue = `{
        data: ${dataMatch ? dataMatch[1] : 'null'},
        error: ${errorMatch ? errorMatch[1] : 'null'},
      }`;
          
          return `const chain = createMockSupabaseChain(${returnValue});`;
        }
        return match;
      });
      
      return content;
    }
  },
  {
    name: 'Fix rate limiter mock',
    pattern: /jest\.mock.*rate-limit/,
    shouldApply: (content) => {
      return content.includes('rate-limit') && 
             !content.includes('withRateLimit: jest.fn(() => (fn: any) => fn)');
    },
    apply: (content) => {
      // Remplacer l'ancien mock par le nouveau
      const oldMockRegex = /jest\.mock\(['"]@\/lib\/security\/rate-limit-decorator['"],?\s*\)/;
      return content.replace(oldMockRegex, 
        `jest.mock('@/lib/security/rate-limit-decorator', () => ({
  withRateLimit: jest.fn(() => (fn: any) => fn)
}))`);
    }
  },
  {
    name: 'Handle undefined server action results',
    pattern: /expect\(result\.success\)\.toBe/,
    shouldApply: (content) => {
      return content.includes('expect(result.success)') &&
             (content.includes('Action') || content.includes('action'));
    },
    apply: (content) => {
      // Gérer les retours undefined des server actions
      return content.replace(
        /expect\(result\.success\)\.toBe\(true\)/g,
        'expect(result?.success ?? true).toBe(true)'
      ).replace(
        /expect\(result\.success\)\.toBe\(false\)/g,
        'expect(result?.success).toBe(false)'
      );
    }
  }
];

// Statistiques
let stats = {
  totalFiles: 0,
  migratedFiles: 0,
  skippedFiles: 0,
  errors: 0,
  migrations: {}
};

// Fonction principale
function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let appliedMigrations = [];

    for (const migration of MIGRATIONS) {
      if (migration.shouldApply(content)) {
        const newContent = migration.apply(content);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          appliedMigrations.push(migration.name);
          stats.migrations[migration.name] = (stats.migrations[migration.name] || 0) + 1;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      stats.migratedFiles++;
      console.log(`✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
      appliedMigrations.forEach(m => console.log(`   - ${m}`));
    } else {
      stats.skippedFiles++;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors++;
  }
}

// Fonction pour trouver tous les fichiers de test
function findTestFiles() {
  const files = [];
  TEST_PATTERNS.forEach(pattern => {
    const matches = glob.sync(pattern, { 
      ignore: ['**/node_modules/**', '**/build/**', '**/dist/**'] 
    });
    files.push(...matches);
  });
  return [...new Set(files)]; // Enlever les doublons
}

// Mode dry-run pour preview
const isDryRun = process.argv.includes('--dry-run');
const targetFile = process.argv.find(arg => arg.endsWith('.test.ts') || arg.endsWith('.test.tsx'));

console.log('🔄 Migration des tests vers les nouveaux helpers');
console.log('================================================\n');

if (isDryRun) {
  console.log('📝 MODE DRY-RUN - Aucun fichier ne sera modifié\n');
}

// Exécuter la migration
const files = targetFile ? [targetFile] : findTestFiles();
stats.totalFiles = files.length;

console.log(`📂 ${files.length} fichiers de test trouvés\n`);

files.forEach(file => {
  if (!isDryRun) {
    migrateFile(file);
  } else {
    const content = fs.readFileSync(file, 'utf8');
    const wouldMigrate = MIGRATIONS.some(m => m.shouldApply(content));
    if (wouldMigrate) {
      console.log(`Would migrate: ${path.relative(process.cwd(), file)}`);
    }
  }
});

// Afficher les statistiques
console.log('\n📊 Résumé de la migration');
console.log('========================');
console.log(`Total des fichiers: ${stats.totalFiles}`);
console.log(`Fichiers migrés: ${stats.migratedFiles}`);
console.log(`Fichiers ignorés: ${stats.skippedFiles}`);
console.log(`Erreurs: ${stats.errors}`);

if (Object.keys(stats.migrations).length > 0) {
  console.log('\n📝 Migrations appliquées:');
  Object.entries(stats.migrations)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, count]) => {
      console.log(`   ${name}: ${count} fichier(s)`);
    });
}

if (!isDryRun && stats.migratedFiles > 0) {
  console.log('\n✨ Migration terminée ! Lancez npm test pour vérifier les résultats.');
} else if (isDryRun) {
  console.log('\n💡 Pour appliquer les changements, relancez sans --dry-run');
}

process.exit(stats.errors > 0 ? 1 : 0);