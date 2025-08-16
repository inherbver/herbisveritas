#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Suite de tests pour valider les outils de validation des commentaires
 * 
 * Teste tous les scripts créés pour s'assurer qu'ils fonctionnent
 * correctement avant la mise en production.
 */
class CommentToolsTester {
  constructor() {
    this.testResults = [];
    this.tempDir = './test-temp';
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Lance la suite complète de tests
   */
  runTests() {
    console.log('🧪 Test des outils de validation des commentaires\n');
    
    try {
      this.setupTestEnvironment();
      this.testAuditScript();
      this.testValidationScript();
      this.testTemplateGenerator();
      this.testCoverageScript();
      this.testESLintRules();
      this.teardownTestEnvironment();
      
      this.printSummary();
    } catch (error) {
      console.error('💥 Erreur lors des tests:', error.message);
      this.teardownTestEnvironment();
      process.exit(1);
    }
  }

  /**
   * Configure l'environnement de test
   */
  setupTestEnvironment() {
    console.log('🔧 Configuration environnement de test...');
    
    // Créer répertoire temporaire
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
    }
    fs.mkdirSync(this.tempDir, { recursive: true });
    
    // Créer fichiers de test
    this.createTestFiles();
    
    console.log('✅ Environnement de test configuré\n');
  }

  /**
   * Crée des fichiers de test avec différents patterns
   */
  createTestFiles() {
    // Fichier avec commentaires évidents
    const obviousCommentsFile = `
// Importe React depuis react
import React from 'react';
// Importe useState depuis react
import { useState } from 'react';

// Fonction qui calcule la somme
function calculateSum(a: number, b: number): number {
  // Return la somme de a et b
  return a + b;
}

// Export la fonction
export { calculateSum };
`;

    // Fichier Server Action sans JSDoc
    const serverActionFile = `
"use server";

import { z } from "zod";

export async function createUser(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  
  // Logic here
  return { success: true };
}

export function validateEmail(email: string): boolean {
  return email.includes("@");
}
`;

    // Fichier composant avec JSDoc partielle
    const componentFile = `
import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

/**
 * Bouton personnalisé avec gestion d'événements
 */
export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// Composant sans documentation
export function Icon({ name }: { name: string }) {
  return <span>{name}</span>;
}
`;

    // Fichier avec JSDoc complète et de qualité
    const goodDocFile = `
/**
 * Utilitaire de validation des données utilisateur avec gestion d'erreurs avancée.
 * 
 * Effectue une validation complète des champs requis et optionnels,
 * avec support pour les règles personnalisées et internationalisation.
 * 
 * @param data Données utilisateur à valider
 * @param rules Règles de validation personnalisées
 * @param options Options de validation (locale, strict mode, etc.)
 * @returns Résultat de validation avec erreurs détaillées si applicable
 * 
 * @throws {ValidationError} Si les données sont malformées
 * @throws {TypeError} Si les paramètres sont de type incorrect
 * 
 * @example
 * \`\`\`typescript
 * const result = validateUserData(
 *   { email: "user@example.com", age: 25 },
 *   { email: "required|email", age: "numeric|min:18" },
 *   { locale: "fr", strict: true }
 * );
 * 
 * if (result.valid) {
 *   console.log("Données valides:", result.data);
 * } else {
 *   console.error("Erreurs:", result.errors);
 * }
 * \`\`\`
 * 
 * @security Sanitisation automatique des entrées XSS
 * @performance Cache LRU pour règles fréquemment utilisées
 */
export function validateUserData(
  data: Record<string, any>,
  rules: Record<string, string>,
  options: ValidationOptions = {}
): ValidationResult {
  // Implementation here
  return { valid: true, data, errors: [] };
}
`;

    // Écrire les fichiers de test
    fs.writeFileSync(path.join(this.tempDir, 'obvious-comments.ts'), obviousCommentsFile);
    fs.writeFileSync(path.join(this.tempDir, 'server-action.ts'), serverActionFile);
    fs.writeFileSync(path.join(this.tempDir, 'component.tsx'), componentFile);
    fs.writeFileSync(path.join(this.tempDir, 'good-doc.ts'), goodDocFile);
  }

  /**
   * Teste le script d'audit des commentaires
   */
  testAuditScript() {
    console.log('🔍 Test du script d\'audit...');
    
    try {
      // Tester l'exécution sur les fichiers de test
      const result = execSync(`node scripts/audit-comments.js ${this.tempDir}`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      // Vérifier que le rapport est généré
      const reportExists = fs.existsSync('./docs/COMMENT_AUDIT_REPORT.md');
      
      this.addTestResult('Audit Script - Exécution', true, 'Script exécuté sans erreur');
      this.addTestResult('Audit Script - Rapport généré', reportExists, 
        reportExists ? 'Rapport créé' : 'Rapport non trouvé');
      
      // Vérifier contenu du rapport
      if (reportExists) {
        const reportContent = fs.readFileSync('./docs/COMMENT_AUDIT_REPORT.md', 'utf8');
        const hasObviousComments = reportContent.includes('Commentaires évidents détectés');
        const hasMissingJSDoc = reportContent.includes('JSDoc manquantes');
        
        this.addTestResult('Audit Script - Détection commentaires évidents', 
          hasObviousComments, 'Commentaires évidents détectés');
        this.addTestResult('Audit Script - Détection JSDoc manquantes', 
          hasMissingJSDoc, 'JSDoc manquantes détectées');
      }
      
    } catch (error) {
      this.addTestResult('Audit Script - Exécution', false, error.message);
    }
  }

  /**
   * Teste le script de validation JSDoc
   */
  testValidationScript() {
    console.log('📚 Test du script de validation JSDoc...');
    
    try {
      const result = execSync(`node scripts/validate-jsdoc.js ${this.tempDir}`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      const reportExists = fs.existsSync('./docs/JSDOC_VALIDATION_REPORT.md');
      
      this.addTestResult('Validation JSDoc - Exécution', true, 'Script exécuté sans erreur');
      this.addTestResult('Validation JSDoc - Rapport généré', reportExists,
        reportExists ? 'Rapport créé' : 'Rapport non trouvé');
      
      if (reportExists) {
        const reportContent = fs.readFileSync('./docs/JSDOC_VALIDATION_REPORT.md', 'utf8');
        const hasScore = reportContent.includes('Score global');
        const hasErrors = reportContent.includes('Erreurs Critiques');
        
        this.addTestResult('Validation JSDoc - Score calculé', hasScore, 'Score présent');
        this.addTestResult('Validation JSDoc - Erreurs détectées', hasErrors, 'Erreurs listées');
      }
      
    } catch (error) {
      this.addTestResult('Validation JSDoc - Exécution', false, error.message);
    }
  }

  /**
   * Teste le générateur de templates
   */
  testTemplateGenerator() {
    console.log('📝 Test du générateur de templates...');
    
    try {
      const result = execSync(`node scripts/generate-jsdoc-templates.js ${this.tempDir}`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      const reportExists = fs.existsSync('./docs/JSDOC_TEMPLATES_REPORT.md');
      
      this.addTestResult('Template Generator - Exécution', true, 'Script exécuté sans erreur');
      this.addTestResult('Template Generator - Rapport généré', reportExists,
        reportExists ? 'Rapport créé' : 'Rapport non trouvé');
      
      // Vérifier génération du script d'insertion
      const insertScriptExists = fs.existsSync('./scripts/insert-jsdoc-templates.js');
      this.addTestResult('Template Generator - Script d\'insertion', insertScriptExists,
        insertScriptExists ? 'Script d\'insertion créé' : 'Script d\'insertion manquant');
      
    } catch (error) {
      this.addTestResult('Template Generator - Exécution', false, error.message);
    }
  }

  /**
   * Teste le script de couverture
   */
  testCoverageScript() {
    console.log('📊 Test du script de couverture...');
    
    try {
      const result = execSync(`node scripts/comment-coverage.js ${this.tempDir} --min-coverage=50`, 
        { encoding: 'utf8', stdio: 'pipe' });
      
      const reportExists = fs.existsSync('./docs/COMMENT_COVERAGE_REPORT.md');
      
      this.addTestResult('Coverage Script - Exécution', true, 'Script exécuté sans erreur');
      this.addTestResult('Coverage Script - Rapport généré', reportExists,
        reportExists ? 'Rapport créé' : 'Rapport non trouvé');
      
      if (reportExists) {
        const reportContent = fs.readFileSync('./docs/COMMENT_COVERAGE_REPORT.md', 'utf8');
        const hasCoverage = reportContent.includes('Couverture globale');
        const hasRecommendations = reportContent.includes('Recommandations');
        
        this.addTestResult('Coverage Script - Métriques calculées', hasCoverage, 'Couverture calculée');
        this.addTestResult('Coverage Script - Recommandations générées', hasRecommendations, 'Recommandations présentes');
      }
      
    } catch (error) {
      this.addTestResult('Coverage Script - Exécution', false, error.message);
    }
  }

  /**
   * Teste les règles ESLint personnalisées
   */
  testESLintRules() {
    console.log('⚙️  Test des règles ESLint...');
    
    try {
      // Vérifier que le fichier de règles existe et est valide
      const rulesPath = './scripts/eslint-custom-rules.js';
      const rulesExist = fs.existsSync(rulesPath);
      
      this.addTestResult('ESLint Rules - Fichier existe', rulesExist,
        rulesExist ? 'Fichier de règles trouvé' : 'Fichier de règles manquant');
      
      if (rulesExist) {
        const rulesContent = fs.readFileSync(rulesPath, 'utf8');
        const hasObviousRule = rulesContent.includes('no-obvious-comments');
        const hasJSDocRule = rulesContent.includes('require-jsdoc');
        const hasValidation = rulesContent.includes('validate-jsdoc-examples');
        
        this.addTestResult('ESLint Rules - Règle commentaires évidents', hasObviousRule,
          'Règle no-obvious-comments présente');
        this.addTestResult('ESLint Rules - Règle JSDoc requise', hasJSDocRule,
          'Règle require-jsdoc présente');
        this.addTestResult('ESLint Rules - Validation exemples', hasValidation,
          'Règle validate-jsdoc-examples présente');
      }
      
    } catch (error) {
      this.addTestResult('ESLint Rules - Validation', false, error.message);
    }
  }

  /**
   * Ajoute un résultat de test
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({ testName, passed, message });
    
    if (passed) {
      console.log(`   ✅ ${testName}: ${message}`);
      this.passed++;
    } else {
      console.log(`   ❌ ${testName}: ${message}`);
      this.failed++;
    }
  }

  /**
   * Nettoie l'environnement de test
   */
  teardownTestEnvironment() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Affiche le résumé des tests
   */
  printSummary() {
    console.log(`\n📊 Résumé des tests:`);
    console.log(`   ✅ Tests réussis: ${this.passed}`);
    console.log(`   ❌ Tests échoués: ${this.failed}`);
    console.log(`   📈 Taux de réussite: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed > 0) {
      console.log(`\n❌ Tests échoués:`);
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => console.log(`   • ${r.testName}: ${r.message}`));
    }
    
    // Générer rapport de test
    this.generateTestReport();
    
    if (this.failed === 0) {
      console.log(`\n🎉 Tous les outils fonctionnent correctement !`);
      console.log(`✅ La Phase 0 est prête pour l'implémentation.`);
    } else {
      console.log(`\n⚠️  Certains outils nécessitent des corrections.`);
      process.exit(1);
    }
  }

  /**
   * Génère un rapport de test détaillé
   */
  generateTestReport() {
    const report = `# Rapport de Test - Outils de Validation des Commentaires

📊 **Généré le**: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}

## Résumé

- **Tests exécutés**: ${this.testResults.length}
- **Tests réussis**: ${this.passed}
- **Tests échoués**: ${this.failed}
- **Taux de réussite**: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%

## Résultats Détaillés

${this.testResults.map(result => 
  `- ${result.passed ? '✅' : '❌'} **${result.testName}**: ${result.message}`
).join('\n')}

## Validation des Outils

| Outil | Statut | Description |
|-------|--------|-------------|
| audit-comments.js | ${this.getToolStatus('Audit Script')} | Script d'audit des commentaires évidents |
| validate-jsdoc.js | ${this.getToolStatus('Validation JSDoc')} | Validation qualité JSDoc |
| generate-jsdoc-templates.js | ${this.getToolStatus('Template Generator')} | Génération templates JSDoc |
| comment-coverage.js | ${this.getToolStatus('Coverage Script')} | Analyse couverture documentation |
| eslint-custom-rules.js | ${this.getToolStatus('ESLint Rules')} | Règles ESLint personnalisées |

## Prochaines Étapes

${this.failed === 0 ? 
  `✅ **Tous les tests passent** - Prêt pour l'implémentation de la Phase 0

1. Exécuter: \`npm run setup:comment-validation\`
2. Lancer l'audit initial: \`npm run audit:comments\`
3. Commencer le nettoyage des commentaires évidents` :
  `❌ **Corrections nécessaires** - Résoudre les échecs avant implémentation

1. Corriger les outils défaillants
2. Relancer les tests: \`node scripts/test-comment-tools.js\`
3. Valider tous les tests avant implémentation`}

---
*Rapport généré automatiquement par test-comment-tools.js*
`;

    fs.writeFileSync('./docs/COMMENT_TOOLS_TEST_REPORT.md', report);
    console.log(`\n📄 Rapport de test: ./docs/COMMENT_TOOLS_TEST_REPORT.md`);
  }

  /**
   * Détermine le statut d'un outil basé sur les tests
   */
  getToolStatus(toolPrefix) {
    const toolTests = this.testResults.filter(r => r.testName.startsWith(toolPrefix));
    const allPassed = toolTests.every(t => t.passed);
    const somePassed = toolTests.some(t => t.passed);
    
    if (allPassed) return '✅';
    if (somePassed) return '⚠️';
    return '❌';
  }
}

// Exécution du script
if (require.main === module) {
  const tester = new CommentToolsTester();
  tester.runTests();
}

module.exports = CommentToolsTester;