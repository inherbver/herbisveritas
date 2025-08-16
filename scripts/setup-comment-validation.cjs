#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script de configuration pour la validation des commentaires HerbisVeritas
 * 
 * Configure automatiquement ESLint, pre-commit hooks, et CI/CD
 * pour la validation continue de la qualité des commentaires.
 */
class CommentValidationSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.scriptsInstalled = [];
    this.configsCreated = [];
    this.errors = [];
  }

  /**
   * Lance la configuration complète
   */
  setup() {
    console.log('🔧 Configuration de la validation des commentaires...\n');
    
    try {
      this.installDependencies();
      this.setupESLintConfig();
      this.setupPreCommitHooks();
      this.setupGitHubActions();
      this.setupNpmScripts();
      this.generateDocumentation();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Erreur lors de la configuration:', error.message);
      process.exit(1);
    }
  }

  /**
   * Installe les dépendances nécessaires
   */
  installDependencies() {
    console.log('📦 Installation des dépendances...');
    
    const devDependencies = [
      '@typescript-eslint/parser',
      '@typescript-eslint/eslint-plugin',
      'eslint-plugin-jsdoc',
      'husky',
      'lint-staged'
    ];

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Ajouter devDependencies si pas déjà présentes
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      let needsInstall = false;
      devDependencies.forEach(dep => {
        if (!packageJson.devDependencies[dep] && !packageJson.dependencies?.[dep]) {
          packageJson.devDependencies[dep] = 'latest';
          needsInstall = true;
        }
      });

      if (needsInstall) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('✅ package.json mis à jour avec nouvelles dépendances');
        console.log('🔄 Exécutez: npm install');
      } else {
        console.log('✅ Toutes les dépendances sont déjà installées');
      }
    }
  }

  /**
   * Configure ESLint avec les règles personnalisées
   */
  setupESLintConfig() {
    console.log('⚙️  Configuration ESLint...');
    
    const eslintConfigPath = path.join(this.projectRoot, '.eslintrc.js');
    
    let existingConfig = {};
    if (fs.existsSync(eslintConfigPath)) {
      try {
        const configContent = fs.readFileSync(eslintConfigPath, 'utf8');
        // Simple parsing pour récupérer la config existante
        existingConfig = this.parseESLintConfig(configContent);
      } catch (error) {
        console.warn('⚠️  Impossible de parser .eslintrc.js existant, création d\\'une nouvelle config');
      }
    }

    const commentRules = {
      'jsdoc/require-jsdoc': ['error', {
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: false,
          MethodDefinition: true,
          ClassDeclaration: true
        },
        contexts: [
          'ExportNamedDeclaration[declaration.type="FunctionDeclaration"]',
          'ExportDefaultDeclaration[declaration.type="FunctionDeclaration"]'
        ]
      }],
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/valid-types': 'error'
    };

    const newConfig = {
      ...existingConfig,
      plugins: [...(existingConfig.plugins || []), 'jsdoc'],
      rules: {
        ...existingConfig.rules,
        ...commentRules
      },
      overrides: [
        ...(existingConfig.overrides || []),
        {
          files: ['src/actions/*.ts'],
          rules: {
            'jsdoc/require-jsdoc': ['error', {
              require: {
                FunctionDeclaration: true,
                ArrowFunctionExpression: true
              }
            }],
            'jsdoc/require-example': 'warn'
          }
        },
        {
          files: ['src/components/**/*.tsx'],
          rules: {
            'jsdoc/require-jsdoc': ['error', {
              require: {
                FunctionDeclaration: true,
                ArrowFunctionExpression: false
              }
            }]
          }
        }
      ]
    };

    const configContent = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;
    fs.writeFileSync(eslintConfigPath, configContent);
    
    this.configsCreated.push('.eslintrc.js');
    console.log('✅ Configuration ESLint mise à jour');
  }

  /**
   * Parse basique d'un fichier ESLint config
   */
  parseESLintConfig(content) {
    try {
      // Retirer module.exports = et évaluer le JSON
      const jsonString = content.replace(/module\.exports\s*=\s*/, '').replace(/;$/, '');
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  }

  /**
   * Configure les hooks pre-commit avec Husky
   */
  setupPreCommitHooks() {
    console.log('🪝 Configuration pre-commit hooks...');
    
    // Créer .husky directory
    const huskyDir = path.join(this.projectRoot, '.husky');
    if (!fs.existsSync(huskyDir)) {
      fs.mkdirSync(huskyDir, { recursive: true });
    }

    // Créer pre-commit hook
    const preCommitPath = path.join(huskyDir, 'pre-commit');
    const preCommitContent = `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Validation des commentaires..."

# Audit commentaires sur fichiers modifiés
git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx)$' | xargs -r node scripts/audit-comments.js --files

# Validation JSDoc
echo "📚 Validation JSDoc..."
git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx)$' | xargs -r node scripts/validate-jsdoc.js --files

# ESLint avec focus sur JSDoc
echo "🔧 Validation ESLint JSDoc..."
npx lint-staged

echo "✅ Validation commentaires terminée"
`;

    fs.writeFileSync(preCommitPath, preCommitContent);
    
    // Rendre exécutable sur Unix
    if (process.platform !== 'win32') {
      fs.chmodSync(preCommitPath, '755');
    }

    // Configuration lint-staged
    this.setupLintStaged();
    
    this.configsCreated.push('.husky/pre-commit');
    console.log('✅ Pre-commit hooks configurés');
  }

  /**
   * Configure lint-staged
   */
  setupLintStaged() {
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    packageJson['lint-staged'] = {
      'src/**/*.{ts,tsx}': [
        'eslint --fix --ext .ts,.tsx',
        'node scripts/validate-jsdoc.js --files'
      ]
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ lint-staged configuré');
  }

  /**
   * Configure GitHub Actions
   */
  setupGitHubActions() {
    console.log('🚀 Configuration GitHub Actions...');
    
    const githubDir = path.join(this.projectRoot, '.github', 'workflows');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    const workflowContent = `name: Comment Quality Check

on:
  pull_request:
    paths: ['src/**/*.ts', 'src/**/*.tsx']
  push:
    branches: [main, develop]

jobs:
  comment-audit:
    runs-on: ubuntu-latest
    name: Audit & Validate Comments
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Audit commentaires évidents
        run: node scripts/audit-comments.js --ci
        
      - name: Validate JSDoc quality
        run: node scripts/validate-jsdoc.js --strict
        
      - name: ESLint JSDoc validation
        run: npx eslint src/ --ext .ts,.tsx
        
      - name: Check comment coverage
        run: node scripts/comment-coverage.js --min-coverage=80
        
      - name: Generate comment metrics
        run: node scripts/comment-metrics.js --output=github-actions
        
      - name: Upload audit reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: comment-audit-reports
          path: |
            docs/COMMENT_AUDIT_REPORT.md
            docs/JSDOC_VALIDATION_REPORT.md
            
  comment-quality-gate:
    runs-on: ubuntu-latest
    needs: comment-audit
    name: Quality Gate
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Quality gate check
        run: |
          echo "🎯 Vérification des seuils de qualité..."
          
          # Vérifier que moins de 5% de commentaires évidents
          OBVIOUS_PERCENT=$(node scripts/audit-comments.js --output=json | jq '.metrics.obviousCommentsPercentage')
          if (( $(echo "$OBVIOUS_PERCENT > 5" | bc -l) )); then
            echo "❌ Trop de commentaires évidents: $OBVIOUS_PERCENT% (max: 5%)"
            exit 1
          fi
          
          # Vérifier score JSDoc > 85
          JSDOC_SCORE=$(node scripts/validate-jsdoc.js --output=json | jq '.metrics.qualityScore')
          if (( $(echo "$JSDOC_SCORE < 85" | bc -l) )); then
            echo "❌ Score JSDoc trop bas: $JSDOC_SCORE/100 (min: 85)"
            exit 1
          fi
          
          echo "✅ Tous les seuils de qualité sont respectés"
`;

    const workflowPath = path.join(githubDir, 'comment-quality.yml');
    fs.writeFileSync(workflowPath, workflowContent);
    
    this.configsCreated.push('.github/workflows/comment-quality.yml');
    console.log('✅ GitHub Actions configurées');
  }

  /**
   * Configure les scripts npm
   */
  setupNpmScripts() {
    console.log('📜 Configuration scripts npm...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const commentScripts = {
      'audit:comments': 'node scripts/audit-comments.js',
      'validate:jsdoc': 'node scripts/validate-jsdoc.js',
      'generate:jsdoc-templates': 'node scripts/generate-jsdoc-templates.js',
      'fix:comments': 'node scripts/cleanup-obvious-comments.js',
      'setup:comment-validation': 'node scripts/setup-comment-validation.js',
      'comment:coverage': 'node scripts/comment-coverage.js',
      'comment:metrics': 'node scripts/comment-metrics.js'
    };

    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    Object.entries(commentScripts).forEach(([script, command]) => {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
      }
    });

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log('✅ Scripts npm configurés');
  }

  /**
   * Génère la documentation finale
   */
  generateDocumentation() {
    console.log('📚 Génération documentation...');
    
    const setupDoc = `# Configuration Validation Commentaires

## Scripts Disponibles

\`\`\`bash
# Audit des commentaires
npm run audit:comments

# Validation JSDoc
npm run validate:jsdoc

# Génération templates JSDoc
npm run generate:jsdoc-templates

# Nettoyage commentaires évidents
npm run fix:comments

# Couverture commentaires
npm run comment:coverage

# Métriques qualité
npm run comment:metrics
\`\`\`

## Configuration ESLint

Les règles suivantes sont activées:
- \`jsdoc/require-jsdoc\`: JSDoc obligatoire pour fonctions exportées
- \`jsdoc/require-description\`: Description obligatoire
- \`jsdoc/require-param\`: Documentation paramètres
- \`jsdoc/require-returns\`: Documentation retour

## Pre-commit Hooks

Validation automatique à chaque commit:
1. Audit commentaires évidents
2. Validation JSDoc
3. ESLint avec focus JSDoc

## GitHub Actions

Pipeline CI/CD avec:
- Audit qualité commentaires
- Validation JSDoc stricte
- Quality gates avec seuils
- Rapports d'audit automatiques

## Seuils de Qualité

- Commentaires évidents: < 5%
- Score JSDoc: > 85/100
- Couverture JSDoc: > 80%

## Maintenance

### Mise à jour des règles
Modifier \`.eslintrc.js\` et relancer \`npm run setup:comment-validation\`

### Ajustement des seuils
Modifier les scripts dans \`scripts/\` directory

### Debug
- Logs pre-commit: \`git commit --no-verify\` pour bypass
- CI/CD: Consulter artifacts des rapports d'audit
`;

    fs.writeFileSync('./docs/COMMENT_VALIDATION_SETUP.md', setupDoc);
    
    console.log('✅ Documentation générée: ./docs/COMMENT_VALIDATION_SETUP.md');
  }

  /**
   * Affiche le résumé de la configuration
   */
  printSummary() {
    console.log('\\n🎉 Configuration terminée avec succès !\\n');
    
    console.log('📋 Fichiers créés/modifiés:');
    this.configsCreated.forEach(file => {
      console.log(\`   ✅ \${file}\`);
    });
    
    console.log('\\n🚀 Prochaines étapes:');
    console.log('   1. Exécuter: npm install');
    console.log('   2. Tester: npm run audit:comments');
    console.log('   3. Valider: npm run validate:jsdoc');
    console.log('   4. Commiter pour tester les hooks');
    
    console.log('\\n📚 Documentation:');
    console.log('   • Guide complet: docs/PHASE_0_COMMENT_AUDIT_GUIDE.md');
    console.log('   • Configuration: docs/COMMENT_VALIDATION_SETUP.md');
    
    if (this.errors.length > 0) {
      console.log('\\n⚠️  Erreurs rencontrées:');
      this.errors.forEach(error => {
        console.log(\`   ❌ \${error}\`);
      });
    }
    
    console.log('\\n🎯 La validation des commentaires est maintenant active !');
  }
}

// Exécution du script
if (require.main === module) {
  const setup = new CommentValidationSetup();
  setup.setup();
}

module.exports = CommentValidationSetup;