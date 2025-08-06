#!/usr/bin/env node

/**
 * Outil de correction automatique des imports après migration
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mappings de migration des imports
const IMPORT_MAPPINGS = {
  // Infrastructure -> Adapters
  '@/lib/infrastructure/services/': '@/adapters/services/',
  '@/lib/infrastructure/repositories/': '@/adapters/repositories/',
  '@/lib/infrastructure/events/': '@/adapters/events/',
  
  // Services -> Application/Domain
  '@/lib/services/': '@/application/services/',
  '@/lib/domain/services/': '@/domain/services/',
  
  // Actions -> Controllers
  '@/actions/': '@/presentation/controllers/',
  
  // Components restructuration
  '@/components/domain/': '@/presentation/components/domain/',
  '@/components/shared/': '@/presentation/components/shared/',
  
  // Types et utils
  '@/types/': '@/shared/types/',
  '@/utils/': '@/shared/utils/',
  
  // Domain consolidation
  '@/lib/domain/entities/': '@/domain/entities/',
  '@/lib/domain/value-objects/': '@/domain/value-objects/',
  '@/lib/domain/interfaces/': '@/domain/repositories/',
};

// Fonction pour analyser et corriger un fichier
function fixImportsInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;
    let changesCount = 0;
    
    // Pattern pour capturer tous les imports
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+['"]([^'"]+)['"]/g;
    
    updatedContent = updatedContent.replace(importRegex, (match, importPath) => {
      let newImportPath = importPath;
      
      // Appliquer les mappings
      for (const [oldPath, newPath] of Object.entries(IMPORT_MAPPINGS)) {
        if (importPath.includes(oldPath)) {
          newImportPath = importPath.replace(oldPath, newPath);
          changesCount++;
          break;
        }
      }
      
      return match.replace(importPath, newImportPath);
    });
    
    // Sauvegarder si des changements ont été apportés
    if (changesCount > 0) {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✅ ${filePath} - ${changesCount} imports corrigés`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erreur traitement ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour corriger les imports dans un dossier
function fixImportsInDirectory(directory, pattern = '**/*.{ts,tsx}') {
  console.log(`🔧 Correction des imports dans: ${directory}`);
  
  const files = glob.sync(pattern, {
    cwd: directory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
  });
  
  let totalFiles = 0;
  let fixedFiles = 0;
  
  files.forEach(file => {
    totalFiles++;
    if (fixImportsInFile(file)) {
      fixedFiles++;
    }
  });
  
  console.log(`📊 Résultats: ${fixedFiles}/${totalFiles} fichiers modifiés\n`);
  return { totalFiles, fixedFiles };
}

// Fonction pour valider que tous les imports sont corrects
function validateImports(directory) {
  console.log(`🧪 Validation des imports dans: ${directory}`);
  
  const files = glob.sync('**/*.{ts,tsx}', {
    cwd: directory,
    absolute: true,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*']
  });
  
  const invalidImports = [];
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Vérifier les imports obsolètes
        const obsoletePaths = [
          '/lib/infrastructure/services/',
          '/lib/infrastructure/repositories/',
          '/lib/services/',
          '/actions/',
        ];
        
        if (obsoletePaths.some(obsolete => importPath.includes(obsolete))) {
          invalidImports.push({
            file: file.replace(directory + '/', ''),
            import: importPath,
            line: content.substr(0, match.index).split('\n').length
          });
        }
      }
    } catch (error) {
      console.error(`❌ Erreur validation ${file}:`, error.message);
    }
  });
  
  if (invalidImports.length === 0) {
    console.log('✅ Tous les imports sont valides\n');
    return true;
  } else {
    console.log('❌ Imports obsolètes trouvés:');
    invalidImports.forEach(({ file, import: imp, line }) => {
      console.log(`  ${file}:${line} -> ${imp}`);
    });
    console.log('');
    return false;
  }
}

// Fonction pour créer un tsconfig temporaire pour validation TypeScript
function createTempTsConfig() {
  const tempConfig = {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": true,
      "skipLibCheck": true,
      "strict": false
    },
    "include": ["src/**/*"],
    "exclude": ["**/*.test.*", "**/*.spec.*", "node_modules"]
  };
  
  fs.writeFileSync('tsconfig.temp.json', JSON.stringify(tempConfig, null, 2));
  console.log('📝 Configuration TypeScript temporaire créée');
}

// Fonction pour valider TypeScript
function validateTypeScript() {
  const { execSync } = require('child_process');
  
  try {
    console.log('🔍 Validation TypeScript...');
    createTempTsConfig();
    
    const result = execSync('npx tsc --project tsconfig.temp.json --noEmit', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log('✅ Validation TypeScript réussie');
    return true;
  } catch (error) {
    console.log('❌ Erreurs TypeScript détectées:');
    console.log(error.stdout || error.message);
    return false;
  } finally {
    // Nettoyer le fichier temporaire
    if (fs.existsSync('tsconfig.temp.json')) {
      fs.unlinkSync('tsconfig.temp.json');
    }
  }
}

// Interface CLI
const command = process.argv[2];
const targetDir = process.argv[3] || 'src';

switch (command) {
  case 'fix':
    fixImportsInDirectory(targetDir);
    break;
  case 'validate':
    validateImports(targetDir);
    break;
  case 'check-ts':
    validateTypeScript();
    break;
  case 'full':
    console.log('🚀 CORRECTION COMPLÈTE DES IMPORTS\n');
    const results = fixImportsInDirectory(targetDir);
    console.log('🧪 VALIDATION DES IMPORTS\n');
    const valid = validateImports(targetDir);
    console.log('🔍 VALIDATION TYPESCRIPT\n');
    const tsValid = validateTypeScript();
    
    console.log('\n📊 RÉSUMÉ FINAL:');
    console.log(`  Fichiers modifiés: ${results.fixedFiles}/${results.totalFiles}`);
    console.log(`  Imports valides: ${valid ? '✅' : '❌'}`);
    console.log(`  TypeScript valide: ${tsValid ? '✅' : '❌'}`);
    break;
  default:
    console.log(`
🔧 OUTIL DE CORRECTION DES IMPORTS

Commandes disponibles:
  fix [dir]      - Corriger les imports dans un dossier (défaut: src)
  validate [dir] - Valider les imports dans un dossier
  check-ts       - Vérifier la compilation TypeScript
  full [dir]     - Correction et validation complète

Usage: node migration-scripts/03-import-fixer.cjs [command] [directory]

Exemples:
  node migration-scripts/03-import-fixer.cjs fix src
  node migration-scripts/03-import-fixer.cjs validate src/adapters
  node migration-scripts/03-import-fixer.cjs full
    `);
}