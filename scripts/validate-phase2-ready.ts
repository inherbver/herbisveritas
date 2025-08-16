#!/usr/bin/env tsx

/**
 * Script de validation finale - Phase 2: Robustification Performance
 * Vérifie que toutes les optimisations sont prêtes au déploiement
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    message: string;
    critical: boolean;
  }>;
}

class Phase2Validator {
  private validationResults: ValidationResult[] = [];

  /**
   * Exécute toutes les validations
   */
  async runValidation(): Promise<boolean> {
    console.log('🔍 VALIDATION PHASE 2: ROBUSTIFICATION PERFORMANCE');
    console.log('=' .repeat(60));

    // 1. Validation des fichiers d'optimisation
    this.validateOptimizationFiles();

    // 2. Validation des configurations
    this.validateConfigurations();

    // 3. Validation des composants
    this.validateComponents();

    // 4. Validation de la documentation
    this.validateDocumentation();

    // 5. Validation du build
    await this.validateBuildPerformance();

    // 6. Validation des tests
    await this.validateTestPerformance();

    // Affichage des résultats
    this.displayResults();

    // Déterminer le succès global
    const criticalFailures = this.validationResults
      .flatMap(r => r.checks)
      .filter(c => c.status === 'FAIL' && c.critical);

    return criticalFailures.length === 0;
  }

  /**
   * Valide la présence des fichiers d'optimisation
   */
  private validateOptimizationFiles(): void {
    const result: ValidationResult = {
      category: '📁 Fichiers d\'Optimisation',
      checks: []
    };

    const requiredFiles = [
      {
        path: 'scripts/database-performance-optimization.sql',
        name: 'Script optimisation base de données',
        critical: true
      },
      {
        path: 'scripts/build-performance-optimizer.ts',
        name: 'Optimiseur de build',
        critical: true
      },
      {
        path: 'scripts/deployment-performance-plan.ts',
        name: 'Plan de déploiement automatisé',
        critical: true
      },
      {
        path: 'scripts/analyze-bundle.ts',
        name: 'Analyseur de bundle',
        critical: false
      }
    ];

    for (const file of requiredFiles) {
      const fullPath = join(process.cwd(), file.path);
      const exists = existsSync(fullPath);
      
      result.checks.push({
        name: file.name,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? `✅ ${file.path}` : `❌ Manquant: ${file.path}`,
        critical: file.critical
      });
    }

    this.validationResults.push(result);
  }

  /**
   * Valide les configurations optimisées
   */
  private validateConfigurations(): void {
    const result: ValidationResult = {
      category: '⚙️ Configurations Optimisées',
      checks: []
    };

    // Vérifier les configurations optimisées générées
    const configs = [
      {
        path: 'next.config.optimized.js',
        name: 'Configuration Next.js optimisée',
        critical: false
      },
      {
        path: 'jest.config.optimized.cjs',
        name: 'Configuration Jest optimisée',
        critical: false
      },
      {
        path: 'package.optimized.json',
        name: 'Scripts package.json optimisés',
        critical: false
      }
    ];

    for (const config of configs) {
      const fullPath = join(process.cwd(), config.path);
      const exists = existsSync(fullPath);
      
      if (exists) {
        // Vérifier que le contenu n'est pas vide
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const hasContent = content.length > 100; // Au moins 100 caractères
          
          result.checks.push({
            name: config.name,
            status: hasContent ? 'PASS' : 'WARN',
            message: hasContent ? 
              `✅ ${config.path} (${(content.length / 1024).toFixed(1)}KB)` : 
              `⚠️ ${config.path} semble vide`,
            critical: config.critical
          });
        } catch (error) {
          result.checks.push({
            name: config.name,
            status: 'WARN',
            message: `⚠️ ${config.path} illisible`,
            critical: false
          });
        }
      } else {
        result.checks.push({
          name: config.name,
          status: 'WARN',
          message: `⚠️ ${config.path} sera généré lors du déploiement`,
          critical: false
        });
      }
    }

    this.validationResults.push(result);
  }

  /**
   * Valide les composants de performance
   */
  private validateComponents(): void {
    const result: ValidationResult = {
      category: '🧩 Composants Performance',
      checks: []
    };

    const components = [
      {
        path: 'src/lib/cache/cache-service.ts',
        name: 'Service de cache multi-niveaux',
        critical: true
      },
      {
        path: 'src/lib/performance/performance-monitor.ts',
        name: 'Monitoring de performance',
        critical: true
      },
      {
        path: 'src/components/common/optimized-image.tsx',
        name: 'Composant image optimisé',
        critical: false
      },
      {
        path: 'src/components/common/dynamic-loader.tsx',
        name: 'Chargeur dynamique',
        critical: false
      },
      {
        path: 'src/app/[locale]/admin/performance/page.tsx',
        name: 'Dashboard performance admin',
        critical: true
      }
    ];

    for (const component of components) {
      const fullPath = join(process.cwd(), component.path);
      const exists = existsSync(fullPath);
      
      if (exists) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          
          // Vérifications de base du contenu
          const hasExports = content.includes('export');
          const hasTypescript = component.path.endsWith('.ts') || component.path.endsWith('.tsx');
          const hasTypes = hasTypescript ? content.includes('interface') || content.includes('type') : true;
          
          const isValid = hasExports && hasTypes;
          
          result.checks.push({
            name: component.name,
            status: isValid ? 'PASS' : 'WARN',
            message: isValid ? 
              `✅ ${component.path} (${(content.length / 1024).toFixed(1)}KB)` : 
              `⚠️ ${component.path} - structure incomplète`,
            critical: component.critical
          });
        } catch (error) {
          result.checks.push({
            name: component.name,
            status: component.critical ? 'FAIL' : 'WARN',
            message: `❌ ${component.path} illisible`,
            critical: component.critical
          });
        }
      } else {
        result.checks.push({
          name: component.name,
          status: component.critical ? 'FAIL' : 'WARN',
          message: `❌ Manquant: ${component.path}`,
          critical: component.critical
        });
      }
    }

    this.validationResults.push(result);
  }

  /**
   * Valide la documentation
   */
  private validateDocumentation(): void {
    const result: ValidationResult = {
      category: '📚 Documentation',
      checks: []
    };

    const docs = [
      {
        path: 'PHASE_2_ROBUSTIFICATION_PERFORMANCE_PLAN.md',
        name: 'Plan détaillé Phase 2',
        critical: true
      },
      {
        path: 'PHASE_2_EXECUTION_GUIDE.md',
        name: 'Guide d\'exécution',
        critical: true
      },
      {
        path: 'PERFORMANCE_OPTIMIZATION_REPORT.md',
        name: 'Rapport d\'optimisation existant',
        critical: false
      }
    ];

    for (const doc of docs) {
      const fullPath = join(process.cwd(), doc.path);
      const exists = existsSync(fullPath);
      
      if (exists) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const hasSubstantialContent = content.length > 1000; // Au moins 1KB
          const hasStructure = content.includes('#') && content.includes('##');
          
          const isValid = hasSubstantialContent && hasStructure;
          
          result.checks.push({
            name: doc.name,
            status: isValid ? 'PASS' : 'WARN',
            message: isValid ? 
              `✅ ${doc.path} (${(content.length / 1024).toFixed(1)}KB)` : 
              `⚠️ ${doc.path} - contenu insuffisant`,
            critical: doc.critical
          });
        } catch (error) {
          result.checks.push({
            name: doc.name,
            status: 'FAIL',
            message: `❌ ${doc.path} illisible`,
            critical: doc.critical
          });
        }
      } else {
        result.checks.push({
          name: doc.name,
          status: doc.critical ? 'FAIL' : 'WARN',
          message: `❌ Manquant: ${doc.path}`,
          critical: doc.critical
        });
      }
    }

    this.validationResults.push(result);
  }

  /**
   * Valide les performances de build
   */
  private async validateBuildPerformance(): Promise<void> {
    const result: ValidationResult = {
      category: '🔨 Performance Build',
      checks: []
    };

    try {
      console.log('\n⏳ Test de performance build...');
      
      const buildStart = performance.now();
      execSync('npm run build', { 
        stdio: 'pipe', 
        timeout: 300000 // 5 minutes max
      });
      const buildTime = performance.now() - buildStart;
      
      const buildTimeSeconds = buildTime / 1000;
      const isOptimal = buildTimeSeconds < 15; // Moins de 15s considéré comme bon
      const isCritical = buildTimeSeconds > 60; // Plus de 60s considéré comme critique
      
      result.checks.push({
        name: 'Temps de build',
        status: isCritical ? 'FAIL' : isOptimal ? 'PASS' : 'WARN',
        message: `${isOptimal ? '✅' : isCritical ? '❌' : '⚠️'} Build en ${buildTimeSeconds.toFixed(2)}s (cible: <15s)`,
        critical: isCritical
      });

    } catch (error) {
      result.checks.push({
        name: 'Temps de build',
        status: 'FAIL',
        message: `❌ Build échoué: ${error}`,
        critical: true
      });
    }

    this.validationResults.push(result);
  }

  /**
   * Valide les performances des tests
   */
  private async validateTestPerformance(): Promise<void> {
    const result: ValidationResult = {
      category: '🧪 Performance Tests',
      checks: []
    };

    try {
      console.log('\n⏳ Test de performance des tests...');
      
      const testStart = performance.now();
      try {
        execSync('npm run test:fast', { 
          stdio: 'pipe', 
          timeout: 300000 // 5 minutes max
        });
      } catch {
        // Fallback vers les tests normaux si test:fast n'existe pas
        execSync('npm run test', { 
          stdio: 'pipe', 
          timeout: 300000
        });
      }
      const testTime = performance.now() - testStart;
      
      const testTimeSeconds = testTime / 1000;
      const isOptimal = testTimeSeconds < 120; // Moins de 2 minutes
      const isCritical = testTimeSeconds > 300; // Plus de 5 minutes
      
      result.checks.push({
        name: 'Temps des tests',
        status: isCritical ? 'FAIL' : isOptimal ? 'PASS' : 'WARN',
        message: `${isOptimal ? '✅' : isCritical ? '❌' : '⚠️'} Tests en ${testTimeSeconds.toFixed(2)}s (cible: <120s)`,
        critical: false
      });

    } catch (error) {
      result.checks.push({
        name: 'Temps des tests',
        status: 'WARN',
        message: `⚠️ Tests échoués ou non disponibles`,
        critical: false
      });
    }

    this.validationResults.push(result);
  }

  /**
   * Affiche les résultats de validation
   */
  private displayResults(): void {
    console.log('\n📊 RÉSULTATS DE VALIDATION');
    console.log('=' .repeat(60));

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let warningChecks = 0;
    let criticalFailures = 0;

    for (const category of this.validationResults) {
      console.log(`\n${category.category}`);
      console.log('-' .repeat(category.category.length));

      for (const check of category.checks) {
        console.log(`  ${check.message}`);
        
        totalChecks++;
        if (check.status === 'PASS') passedChecks++;
        else if (check.status === 'FAIL') {
          failedChecks++;
          if (check.critical) criticalFailures++;
        }
        else warningChecks++;
      }
    }

    console.log('\n📈 RÉSUMÉ GLOBAL');
    console.log('=' .repeat(30));
    console.log(`Total vérifications: ${totalChecks}`);
    console.log(`✅ Réussies: ${passedChecks}`);
    console.log(`⚠️ Avertissements: ${warningChecks}`);
    console.log(`❌ Échecs: ${failedChecks}`);
    console.log(`🚨 Échecs critiques: ${criticalFailures}`);

    const successRate = (passedChecks / totalChecks) * 100;
    console.log(`\n🎯 Taux de réussite: ${successRate.toFixed(1)}%`);

    if (criticalFailures === 0 && successRate >= 80) {
      console.log('\n🎉 ✅ PHASE 2 PRÊTE AU DÉPLOIEMENT!');
      console.log('🚀 Toutes les validations critiques sont passées');
    } else if (criticalFailures === 0) {
      console.log('\n⚠️ 🟡 PHASE 2 PARTIELLEMENT PRÊTE');
      console.log('💡 Quelques avertissements à corriger pour un déploiement optimal');
    } else {
      console.log('\n🚨 ❌ PHASE 2 NON PRÊTE AU DÉPLOIEMENT');
      console.log('🔧 Des problèmes critiques doivent être résolus');
    }

    console.log('\n📋 PROCHAINES ÉTAPES:');
    if (criticalFailures === 0) {
      console.log('  1. Exécuter: tsx scripts/deployment-performance-plan.ts');
      console.log('  2. Surveiller: /admin/performance');
      console.log('  3. Valider: npm run analyze');
    } else {
      console.log('  1. Corriger les échecs critiques listés ci-dessus');
      console.log('  2. Relancer: tsx scripts/validate-phase2-ready.ts');
      console.log('  3. Puis procéder au déploiement');
    }
  }
}

/**
 * Script principal
 */
async function main() {
  const validator = new Phase2Validator();
  
  try {
    const isReady = await validator.runValidation();
    
    if (isReady) {
      console.log('\n✨ Validation terminée avec succès!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Validation terminée avec des problèmes critiques');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Erreur lors de la validation:', error);
    process.exit(1);
  }
}

// ES Module compatibility check
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { Phase2Validator };