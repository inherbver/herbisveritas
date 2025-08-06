#!/usr/bin/env node

/**
 * Outil de migration et consolidation des tests
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration des dossiers de tests
const TEST_STRUCTURE = {
  'src/__tests__/unit/domain/': 'Tests unitaires domain',
  'src/__tests__/unit/application/': 'Tests unitaires application', 
  'src/__tests__/unit/adapters/': 'Tests unitaires adapters',
  'src/__tests__/integration/': 'Tests d\'intégration',
  'src/__tests__/e2e/': 'Tests end-to-end',
  'src/__tests__/fixtures/': 'Données de test',
  'src/__tests__/mocks/': 'Mocks et stubs'
};

// Fonction pour créer la structure de tests
function createTestStructure() {
  console.log('🧪 Création de la structure de tests...\n');
  
  Object.entries(TEST_STRUCTURE).forEach(([dir, description]) => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ ${dir} - ${description}`);
    } catch (error) {
      console.log(`❌ ${dir} - ERREUR: ${error.message}`);
    }
  });
  
  console.log('\n✅ Structure de tests créée');
}

// Fonction pour analyser un fichier de test
function analyzeTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const analysis = {
      file: filePath,
      type: 'unknown',
      hasIntegrationTests: false,
      hasUnitTests: false,
      imports: [],
      testCount: 0
    };
    
    // Analyser le type de test
    if (content.includes('integration.test') || content.includes('Integration Test')) {
      analysis.type = 'integration';
      analysis.hasIntegrationTests = true;
    } else if (content.includes('.test.') || content.includes('describe(') || content.includes('it(')) {
      analysis.type = 'unit';
      analysis.hasUnitTests = true;
    }
    
    // Compter les tests
    const testMatches = content.match(/(?:it|test)\s*\(/g);
    analysis.testCount = testMatches ? testMatches.length : 0;
    
    // Analyser les imports
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
    analysis.imports = importMatches.map(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    }).filter(Boolean);
    
    return analysis;
  } catch (error) {
    console.error(`❌ Erreur analyse ${filePath}:`, error.message);
    return null;
  }
}

// Fonction pour migrer les tests existants
function migrateExistingTests() {
  console.log('🔄 Migration des tests existants...\n');
  
  // Trouver tous les fichiers de test
  const testFiles = glob.sync('**/*.test.{ts,tsx}', {
    ignore: ['node_modules/**', 'src/__tests__/**']
  });
  
  console.log(`📁 ${testFiles.length} fichiers de test trouvés\n`);
  
  const migrations = [];
  
  testFiles.forEach(testFile => {
    const analysis = analyzeTestFile(testFile);
    if (!analysis) return;
    
    let targetDir = 'src/__tests__/unit/';
    
    // Déterminer le dossier cible basé sur le chemin et le type
    if (analysis.type === 'integration') {
      targetDir = 'src/__tests__/integration/';
    } else if (testFile.includes('/domain/')) {
      targetDir = 'src/__tests__/unit/domain/';
    } else if (testFile.includes('/application/')) {
      targetDir = 'src/__tests__/unit/application/';
    } else if (testFile.includes('/adapters/') || testFile.includes('/infrastructure/')) {
      targetDir = 'src/__tests__/unit/adapters/';
    }
    
    // Calculer le nouveau nom de fichier
    const fileName = path.basename(testFile);
    const targetPath = path.join(targetDir, fileName);
    
    migrations.push({
      source: testFile,
      target: targetPath,
      type: analysis.type,
      testCount: analysis.testCount
    });
    
    console.log(`📝 ${testFile} -> ${targetPath} (${analysis.testCount} tests, ${analysis.type})`);
  });
  
  // Demander confirmation avant migration
  console.log(`\n⚠️  ${migrations.length} fichiers à migrer`);
  console.log('Exécuter la migration avec: node migration-scripts/04-test-migrator.cjs execute-migration');
  
  // Sauvegarder le plan de migration
  fs.writeFileSync('migration-test-plan.json', JSON.stringify(migrations, null, 2));
  console.log('📝 Plan de migration sauvegardé dans migration-test-plan.json');
  
  return migrations;
}

// Fonction pour exécuter la migration
function executeMigration() {
  console.log('🚀 Exécution de la migration des tests...\n');
  
  if (!fs.existsSync('migration-test-plan.json')) {
    console.log('❌ Aucun plan de migration trouvé. Exécutez d\'abord: migrate-tests');
    return;
  }
  
  const migrations = JSON.parse(fs.readFileSync('migration-test-plan.json', 'utf8'));
  let successCount = 0;
  let errorCount = 0;
  
  migrations.forEach(({ source, target, type }) => {
    try {
      // Créer le dossier cible
      fs.mkdirSync(path.dirname(target), { recursive: true });
      
      // Copier le fichier
      fs.copyFileSync(source, target);
      
      console.log(`✅ Migré: ${source} -> ${target}`);
      successCount++;
    } catch (error) {
      console.log(`❌ Erreur: ${source} - ${error.message}`);
      errorCount++;
    }
  });
  
  console.log(`\n📊 Résultats: ${successCount} succès, ${errorCount} erreurs`);
  
  if (successCount > 0) {
    console.log('\n⚠️  N\'oubliez pas de:');
    console.log('1. Supprimer les anciens fichiers de test après vérification');
    console.log('2. Mettre à jour les imports dans les nouveaux tests');
    console.log('3. Adapter la configuration Jest si nécessaire');
  }
}

// Fonction pour fixer la configuration Jest
function fixJestConfig() {
  console.log('⚙️  Correction de la configuration Jest...\n');
  
  const jestConfigPath = 'jest.config.js';
  
  if (!fs.existsSync(jestConfigPath)) {
    console.log('❌ Fichier jest.config.js non trouvé');
    return;
  }
  
  // Lire la configuration actuelle
  const currentConfig = fs.readFileSync(jestConfigPath, 'utf8');
  
  // Configuration améliorée pour ESM et structure de tests
  const improvedConfig = `
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  
  // Support pour ESM et modules modernes
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  
  // Transformation des modules ESM
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|@next|uuid)/)'
  ],
  
  // Structure des tests organisée
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}'
  ],
  
  // Collections pour différents types de tests
  collectCoverageFrom: [
    'src/domain/**/*.{js,ts,jsx,tsx}',
    'src/application/**/*.{js,ts,jsx,tsx}',
    'src/adapters/**/*.{js,ts,jsx,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts,jsx,tsx}'
  ],
  
  // Mappings de modules
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Configuration pour tests parallèles
  maxWorkers: '50%',
  
  // Timeouts adaptés
  testTimeout: 15000,
  
  // Reporter pour CI/CD
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'jest-results.xml'
    }]
  ]
}

module.exports = createJestConfig(customJestConfig)
`;
  
  // Sauvegarder la nouvelle configuration
  const backupPath = 'jest.config.js.backup';
  fs.copyFileSync(jestConfigPath, backupPath);
  fs.writeFileSync(jestConfigPath, improvedConfig);
  
  console.log('✅ Configuration Jest améliorée');
  console.log(`📁 Backup sauvegardé: ${backupPath}`);
  console.log('\n📦 Installer les dépendances manquantes:');
  console.log('npm install --save-dev jest-junit');
}

// Fonction pour valider les tests après migration
function validateTests() {
  console.log('🧪 Validation des tests après migration...\n');
  
  const { execSync } = require('child_process');
  
  try {
    console.log('1. Test de syntaxe Jest...');
    const dryRun = execSync('npm test -- --listTests', { encoding: 'utf8' });
    console.log(`✅ ${dryRun.split('\n').length - 1} tests détectés`);
    
    console.log('\n2. Exécution d\'un test rapide...');
    execSync('npm test -- --testPathPattern=__tests__ --maxWorkers=1 --bail=1', {
      encoding: 'utf8',
      stdio: 'inherit'
    });
    
    console.log('\n✅ Validation des tests réussie');
    return true;
  } catch (error) {
    console.log('\n❌ Validation échouée:');
    console.log(error.message);
    return false;
  }
}

// Interface CLI
const command = process.argv[2];

switch (command) {
  case 'init':
    createTestStructure();
    break;
  case 'migrate-tests':
    migrateExistingTests();
    break;
  case 'execute-migration':
    executeMigration();
    break;
  case 'fix-jest':
    fixJestConfig();
    break;
  case 'validate':
    validateTests();
    break;
  case 'full':
    console.log('🚀 MIGRATION COMPLÈTE DES TESTS\n');
    createTestStructure();
    console.log('\n');
    migrateExistingTests();
    console.log('\n');
    fixJestConfig();
    console.log('\n');
    console.log('⚠️  Exécutez manuellement pour finaliser:');
    console.log('node migration-scripts/04-test-migrator.cjs execute-migration');
    console.log('node migration-scripts/04-test-migrator.cjs validate');
    break;
  default:
    console.log(\`
🧪 OUTIL DE MIGRATION DES TESTS

Commandes disponibles:
  init             - Créer la structure de tests
  migrate-tests    - Analyser et planifier la migration
  execute-migration- Exécuter la migration planifiée
  fix-jest         - Corriger la configuration Jest
  validate         - Valider les tests après migration
  full             - Migration complète (sauf exécution)

Usage: node migration-scripts/04-test-migrator.cjs [command]
    \`);
}