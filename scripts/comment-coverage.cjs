#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Analyseur de couverture des commentaires pour HerbisVeritas
 * 
 * Calcule des métriques détaillées sur la qualité et la couverture
 * de la documentation JSDoc dans le projet.
 */
class CommentCoverage {
  constructor() {
    this.results = {
      totalFiles: 0,
      totalFunctions: 0,
      documentedFunctions: 0,
      totalComponents: 0,
      documentedComponents: 0,
      totalHooks: 0,
      documentedHooks: 0,
      totalServerActions: 0,
      documentedServerActions: 0,
      coverageByFile: [],
      qualityMetrics: {},
      trends: {}
    };

    this.minCoverage = 80; // Seuil minimum par défaut
  }

  /**
   * Analyse la couverture des commentaires
   */
  analyzeCoverage(srcPath = './src', minCoverage = 80) {
    this.minCoverage = minCoverage;
    
    console.log('📊 Analyse de la couverture des commentaires...\n');
    console.log(`📁 Répertoire: ${path.resolve(srcPath)}`);
    console.log(`🎯 Seuil minimum: ${minCoverage}%\n`);
    
    const startTime = Date.now();
    this.walkDirectory(srcPath);
    const endTime = Date.now();
    
    this.calculateMetrics();
    this.generateReport(endTime - startTime);
    this.checkThresholds();
  }

  /**
   * Parcourt récursivement les répertoires
   */
  walkDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && this.shouldProcessDirectory(file)) {
          this.walkDirectory(filePath);
        } else if (this.shouldProcessFile(file)) {
          this.analyzeFile(filePath);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erreur lecture répertoire ${dir}: ${error.message}`);
    }
  }

  /**
   * Détermine si un répertoire doit être traité
   */
  shouldProcessDirectory(dirname) {
    const skipDirs = ['.next', 'node_modules', '.git', 'dist', 'build', '__tests__'];
    return !dirname.startsWith('.') && !skipDirs.includes(dirname);
  }

  /**
   * Détermine si un fichier doit être traité
   */
  shouldProcessFile(filename) {
    return filename.match(/\.(ts|tsx)$/) && !filename.includes('.test.');
  }

  /**
   * Analyse un fichier spécifique
   */
  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileType = this.detectFileType(filePath, content);
      const functions = this.extractFunctions(content);
      
      this.results.totalFiles++;
      
      const fileCoverage = {
        path: filePath,
        type: fileType,
        totalFunctions: functions.length,
        documentedFunctions: functions.filter(f => f.hasJSDoc).length,
        functions: functions,
        coverage: functions.length > 0 ? 
          ((functions.filter(f => f.hasJSDoc).length / functions.length) * 100).toFixed(1) : 100,
        qualityScore: this.calculateFileQualityScore(functions)
      };
      
      this.results.coverageByFile.push(fileCoverage);
      this.updateGlobalCounters(fileCoverage);
      
    } catch (error) {
      console.warn(`⚠️  Erreur analyse fichier ${filePath}: ${error.message}`);
    }
  }

  /**
   * Détecte le type d'un fichier
   */
  detectFileType(filePath, content) {
    if (filePath.includes('/actions/') && content.includes('"use server"')) {
      return 'serverAction';
    } else if (filePath.includes('/components/') && filePath.endsWith('.tsx')) {
      return 'component';
    } else if (filePath.includes('/hooks/') || path.basename(filePath).startsWith('use')) {
      return 'hook';
    } else if (filePath.includes('/services/') || filePath.includes('/lib/')) {
      return 'service';
    } else {
      return 'utility';
    }
  }

  /**
   * Extrait les fonctions d'un fichier avec leur documentation
   */
  extractFunctions(content) {
    const functions = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter export function
      const exportMatch = line.match(/export\s+(async\s+)?function\s+(\w+)/);
      if (exportMatch) {
        const func = {
          line: i + 1,
          name: exportMatch[2],
          type: 'function',
          isAsync: !!exportMatch[1],
          isExported: true,
          hasJSDoc: this.hasJSDocAbove(lines, i),
          jsDocQuality: this.analyzeJSDocQuality(lines, i)
        };
        functions.push(func);
      }

      // Détecter export const arrow functions
      const constMatch = line.match(/export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (constMatch) {
        const func = {
          line: i + 1,
          name: constMatch[1],
          type: 'arrow_function',
          isAsync: !!constMatch[2],
          isExported: true,
          hasJSDoc: this.hasJSDocAbove(lines, i),
          jsDocQuality: this.analyzeJSDocQuality(lines, i)
        };
        functions.push(func);
      }

      // Détecter React components (function components)
      const componentMatch = line.match(/function\s+([A-Z]\w+)\s*\(/);
      if (componentMatch && content.includes('tsx')) {
        const func = {
          line: i + 1,
          name: componentMatch[1],
          type: 'component',
          isAsync: false,
          isExported: content.includes(`export`) && content.includes(componentMatch[1]),
          hasJSDoc: this.hasJSDocAbove(lines, i),
          jsDocQuality: this.analyzeJSDocQuality(lines, i)
        };
        functions.push(func);
      }
    }
    
    return functions;
  }

  /**
   * Vérifie si une JSDoc existe au-dessus d'une ligne
   */
  hasJSDocAbove(lines, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      if (line === '') continue;
      
      if (line.includes('*/')) {
        for (let j = i; j >= 0; j--) {
          if (lines[j].trim().startsWith('/**')) {
            return true;
          }
        }
      }
      
      break;
    }
    
    return false;
  }

  /**
   * Analyse la qualité d'une JSDoc
   */
  analyzeJSDocQuality(lines, functionLineIndex) {
    if (!this.hasJSDocAbove(lines, functionLineIndex)) {
      return { score: 0, issues: ['Pas de JSDoc'] };
    }

    const jsDoc = this.extractJSDoc(lines, functionLineIndex);
    const issues = [];
    let score = 100;

    // Vérifier description
    if (!jsDoc.description || jsDoc.description.length < 10) {
      issues.push('Description insuffisante');
      score -= 30;
    }

    // Vérifier tags requis
    if (!jsDoc.tags.param && jsDoc.hasParameters) {
      issues.push('Documentation @param manquante');
      score -= 25;
    }

    if (!jsDoc.tags.returns && jsDoc.hasReturn) {
      issues.push('Documentation @returns manquante');
      score -= 25;
    }

    // Vérifier exemples
    if (!jsDoc.tags.example) {
      issues.push('Exemple manquant');
      score -= 10;
    }

    // Vérifier tags spéciaux pour Server Actions
    if (jsDoc.isServerAction) {
      if (!jsDoc.tags.security) {
        issues.push('Tag @security manquant pour Server Action');
        score -= 5;
      }
      if (!jsDoc.tags.throws) {
        issues.push('Tag @throws manquant pour Server Action');
        score -= 5;
      }
    }

    return {
      score: Math.max(0, score),
      issues: issues.length > 0 ? issues : ['Bonne qualité']
    };
  }

  /**
   * Extrait une JSDoc complète
   */
  extractJSDoc(lines, functionLineIndex) {
    const jsDocLines = [];
    let inJSDoc = false;
    
    for (let i = functionLineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      if (line === '') continue;
      
      if (line === '*/') {
        inJSDoc = true;
        jsDocLines.unshift(line);
        continue;
      }
      
      if (inJSDoc) {
        jsDocLines.unshift(line);
        if (line.startsWith('/**')) {
          break;
        }
      } else {
        break;
      }
    }

    const fullJSDoc = jsDocLines.join('\n');
    const description = this.extractDescription(jsDocLines);
    const tags = this.extractTags(jsDocLines);

    return {
      description,
      tags,
      hasParameters: fullJSDoc.includes('(') && fullJSDoc.includes(')'),
      hasReturn: !fullJSDoc.includes('void') && !fullJSDoc.includes('never'),
      isServerAction: fullJSDoc.includes('Server Action') || fullJSDoc.includes('"use server"')
    };
  }

  /**
   * Extrait la description d'une JSDoc
   */
  extractDescription(jsDocLines) {
    const descriptionLines = [];
    let inDescription = false;
    
    for (const line of jsDocLines) {
      const cleaned = line.replace(/^\s*\*\s?/, '').trim();
      
      if (cleaned.startsWith('/**')) {
        inDescription = true;
        const content = cleaned.replace('/**', '').trim();
        if (content) descriptionLines.push(content);
        continue;
      }
      
      if (cleaned.startsWith('@') || cleaned === '*/') {
        break;
      }
      
      if (inDescription && cleaned) {
        descriptionLines.push(cleaned);
      }
    }
    
    return descriptionLines.join(' ').trim();
  }

  /**
   * Extrait les tags JSDoc
   */
  extractTags(jsDocLines) {
    const tags = {};
    
    for (const line of jsDocLines) {
      const cleaned = line.replace(/^\s*\*\s?/, '').trim();
      const tagMatch = cleaned.match(/^@(\w+)/);
      
      if (tagMatch) {
        tags[tagMatch[1]] = true;
      }
    }
    
    return tags;
  }

  /**
   * Met à jour les compteurs globaux
   */
  updateGlobalCounters(fileCoverage) {
    this.results.totalFunctions += fileCoverage.totalFunctions;
    this.results.documentedFunctions += fileCoverage.documentedFunctions;

    // Compteurs par type
    switch (fileCoverage.type) {
      case 'component':
        this.results.totalComponents += fileCoverage.totalFunctions;
        this.results.documentedComponents += fileCoverage.documentedFunctions;
        break;
      case 'hook':
        this.results.totalHooks += fileCoverage.totalFunctions;
        this.results.documentedHooks += fileCoverage.documentedFunctions;
        break;
      case 'serverAction':
        this.results.totalServerActions += fileCoverage.totalFunctions;
        this.results.documentedServerActions += fileCoverage.documentedFunctions;
        break;
    }
  }

  /**
   * Calcule un score de qualité pour un fichier
   */
  calculateFileQualityScore(functions) {
    if (functions.length === 0) return 100;

    const avgQuality = functions.reduce((sum, func) => 
      sum + (func.jsDocQuality?.score || 0), 0) / functions.length;
    
    return avgQuality.toFixed(1);
  }

  /**
   * Calcule les métriques globales
   */
  calculateMetrics() {
    const totalFunctions = this.results.totalFunctions;
    const documentedFunctions = this.results.documentedFunctions;

    this.results.qualityMetrics = {
      globalCoverage: totalFunctions > 0 ? 
        ((documentedFunctions / totalFunctions) * 100).toFixed(1) : 100,
      componentCoverage: this.results.totalComponents > 0 ? 
        ((this.results.documentedComponents / this.results.totalComponents) * 100).toFixed(1) : 100,
      hookCoverage: this.results.totalHooks > 0 ? 
        ((this.results.documentedHooks / this.results.totalHooks) * 100).toFixed(1) : 100,
      serverActionCoverage: this.results.totalServerActions > 0 ? 
        ((this.results.documentedServerActions / this.results.totalServerActions) * 100).toFixed(1) : 100,
      averageQuality: this.calculateAverageQuality(),
      filesAboveThreshold: this.results.coverageByFile.filter(f => 
        parseFloat(f.coverage) >= this.minCoverage).length,
      filesBelowThreshold: this.results.coverageByFile.filter(f => 
        parseFloat(f.coverage) < this.minCoverage).length
    };
  }

  /**
   * Calcule la qualité moyenne
   */
  calculateAverageQuality() {
    const filesWithFunctions = this.results.coverageByFile.filter(f => f.totalFunctions > 0);
    
    if (filesWithFunctions.length === 0) return 100;

    const avgQuality = filesWithFunctions.reduce((sum, file) => 
      sum + parseFloat(file.qualityScore), 0) / filesWithFunctions.length;
    
    return avgQuality.toFixed(1);
  }

  /**
   * Génère le rapport de couverture
   */
  generateReport(executionTime) {
    const { qualityMetrics } = this.results;
    
    const report = `# Rapport de Couverture des Commentaires HerbisVeritas

📊 **Généré le**: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}  
⏱️ **Temps d'exécution**: ${executionTime}ms  
🎯 **Seuil minimum**: ${this.minCoverage}%

## Vue d'Ensemble

| Métrique | Valeur | Statut |
|----------|--------|--------|
| **Couverture globale** | ${qualityMetrics.globalCoverage}% | ${this.getStatusIcon(qualityMetrics.globalCoverage)} |
| **Qualité moyenne** | ${qualityMetrics.averageQuality}/100 | ${this.getQualityStatusIcon(qualityMetrics.averageQuality)} |
| **Fichiers analysés** | ${this.results.totalFiles} | ℹ️ |
| **Fonctions totales** | ${this.results.totalFunctions} | ℹ️ |
| **Fonctions documentées** | ${this.results.documentedFunctions} | ℹ️ |

## Couverture par Type

| Type | Fonctions | Documentées | Couverture | Statut |
|------|-----------|-------------|------------|--------|
| **Server Actions** | ${this.results.totalServerActions} | ${this.results.documentedServerActions} | ${qualityMetrics.serverActionCoverage}% | ${this.getStatusIcon(qualityMetrics.serverActionCoverage)} |
| **Composants React** | ${this.results.totalComponents} | ${this.results.documentedComponents} | ${qualityMetrics.componentCoverage}% | ${this.getStatusIcon(qualityMetrics.componentCoverage)} |
| **Hooks** | ${this.results.totalHooks} | ${this.results.documentedHooks} | ${qualityMetrics.hookCoverage}% | ${this.getStatusIcon(qualityMetrics.hookCoverage)} |

## Distribution des Fichiers

- **✅ Au-dessus du seuil (${this.minCoverage}%)**: ${qualityMetrics.filesAboveThreshold} fichiers
- **❌ En-dessous du seuil**: ${qualityMetrics.filesBelowThreshold} fichiers

## Fichiers à Améliorer (${qualityMetrics.filesBelowThreshold})

${this.generateLowCoverageFiles()}

## Top 10 - Meilleure Couverture

${this.generateTopFiles()}

## Analyse Détaillée par Fichier

${this.generateDetailedAnalysis()}

## Recommandations

${this.generateRecommendations()}

## Progression dans le Temps

${this.generateTrends()}

---
*Rapport généré automatiquement par comment-coverage.js*
`;

    const reportPath = './docs/COMMENT_COVERAGE_REPORT.md';
    fs.writeFileSync(reportPath, report);
    
    console.log('📊 Rapport de couverture généré !');
    console.log(`📄 Fichier: ${path.resolve(reportPath)}`);
    console.log(`\n📈 Résultats:`);
    console.log(`   • Couverture globale: ${qualityMetrics.globalCoverage}%`);
    console.log(`   • Qualité moyenne: ${qualityMetrics.averageQuality}/100`);
    console.log(`   • ${qualityMetrics.filesAboveThreshold}/${this.results.totalFiles} fichiers au-dessus du seuil`);
  }

  /**
   * Retourne une icône de statut selon le pourcentage
   */
  getStatusIcon(percentage) {
    const percent = parseFloat(percentage);
    if (percent >= this.minCoverage) return '✅';
    if (percent >= this.minCoverage * 0.8) return '⚠️';
    return '❌';
  }

  /**
   * Retourne une icône de statut pour la qualité
   */
  getQualityStatusIcon(score) {
    const quality = parseFloat(score);
    if (quality >= 85) return '✅';
    if (quality >= 70) return '⚠️';
    return '❌';
  }

  /**
   * Génère la liste des fichiers avec faible couverture
   */
  generateLowCoverageFiles() {
    const lowCoverageFiles = this.results.coverageByFile
      .filter(f => parseFloat(f.coverage) < this.minCoverage)
      .sort((a, b) => parseFloat(a.coverage) - parseFloat(b.coverage))
      .slice(0, 15);

    if (lowCoverageFiles.length === 0) {
      return '✅ Tous les fichiers respectent le seuil minimum !';
    }

    return lowCoverageFiles.map(file => 
      `- **${file.path}** - ${file.coverage}% (${file.documentedFunctions}/${file.totalFunctions})`
    ).join('\n');
  }

  /**
   * Génère le top des fichiers avec meilleure couverture
   */
  generateTopFiles() {
    const topFiles = this.results.coverageByFile
      .filter(f => f.totalFunctions > 0)
      .sort((a, b) => parseFloat(b.coverage) - parseFloat(a.coverage))
      .slice(0, 10);

    return topFiles.map((file, index) => 
      `${index + 1}. **${file.path}** - ${file.coverage}% (qualité: ${file.qualityScore})`
    ).join('\n') || 'Aucun fichier analysé.';
  }

  /**
   * Génère l'analyse détaillée par fichier
   */
  generateDetailedAnalysis() {
    const criticalFiles = this.results.coverageByFile
      .filter(f => parseFloat(f.coverage) < this.minCoverage && f.totalFunctions > 0)
      .slice(0, 5);

    if (criticalFiles.length === 0) {
      return '✅ Aucun fichier critique détecté.';
    }

    return criticalFiles.map(file => {
      const undocumentedFunctions = file.functions
        .filter(f => !f.hasJSDoc)
        .slice(0, 3);

      return `### ${file.path}
- **Couverture**: ${file.coverage}% (${file.documentedFunctions}/${file.totalFunctions})
- **Qualité**: ${file.qualityScore}/100
- **Type**: ${file.type}

**Fonctions non documentées:**
${undocumentedFunctions.map(f => `- \`${f.name}\` (ligne ${f.line})`).join('\n')}
`;
    }).join('\n');
  }

  /**
   * Génère les recommandations
   */
  generateRecommendations() {
    const recommendations = [];
    const { qualityMetrics } = this.results;

    if (parseFloat(qualityMetrics.globalCoverage) < this.minCoverage) {
      recommendations.push(`🎯 **Priorité 1**: Atteindre ${this.minCoverage}% de couverture globale (actuellement ${qualityMetrics.globalCoverage}%)`);
    }

    if (parseFloat(qualityMetrics.serverActionCoverage) < 100) {
      recommendations.push('🔒 **Priorité 1**: Documenter toutes les Server Actions (sécurité critique)');
    }

    if (parseFloat(qualityMetrics.averageQuality) < 85) {
      recommendations.push('📝 **Priorité 2**: Améliorer la qualité des JSDoc existantes');
    }

    if (qualityMetrics.filesBelowThreshold > 0) {
      recommendations.push(`📊 **Priorité 2**: Traiter les ${qualityMetrics.filesBelowThreshold} fichiers sous le seuil`);
    }

    recommendations.push('🔄 **Amélioration continue**: Configurer pre-commit hooks pour maintenir la qualité');
    recommendations.push('📈 **Monitoring**: Suivre l\'évolution des métriques dans le temps');

    return recommendations.join('\n') || '✅ Aucune recommandation, excellent travail !';
  }

  /**
   * Génère l'analyse des tendances
   */
  generateTrends() {
    // Pour une future implémentation avec historique
    return `*Fonctionnalité à venir: Analyse des tendances sur plusieurs commits*

Pour activer le suivi des tendances:
1. Exécuter ce script après chaque commit majeur
2. Stocker les résultats dans \`docs/coverage-history.json\`
3. Générer graphiques d'évolution`;
  }

  /**
   * Vérifie si les seuils sont respectés
   */
  checkThresholds() {
    const { qualityMetrics } = this.results;
    const globalCoverage = parseFloat(qualityMetrics.globalCoverage);
    const averageQuality = parseFloat(qualityMetrics.averageQuality);

    console.log('\n🎯 Vérification des seuils:');
    
    if (globalCoverage >= this.minCoverage) {
      console.log(`   ✅ Couverture globale: ${globalCoverage}% (≥ ${this.minCoverage}%)`);
    } else {
      console.log(`   ❌ Couverture globale: ${globalCoverage}% (< ${this.minCoverage}%)`);
    }

    if (averageQuality >= 85) {
      console.log(`   ✅ Qualité moyenne: ${averageQuality}/100 (≥ 85)`);
    } else {
      console.log(`   ⚠️  Qualité moyenne: ${averageQuality}/100 (< 85)`);
    }

    if (qualityMetrics.filesBelowThreshold === 0) {
      console.log(`   ✅ Aucun fichier sous le seuil`);
    } else {
      console.log(`   ⚠️  ${qualityMetrics.filesBelowThreshold} fichiers sous le seuil`);
    }

    // Exit code pour CI/CD
    if (process.argv.includes('--strict')) {
      const success = globalCoverage >= this.minCoverage && 
                     averageQuality >= 85 && 
                     qualityMetrics.filesBelowThreshold === 0;
      
      if (!success) {
        console.log('\n❌ Échec des seuils de qualité en mode strict');
        process.exit(1);
      } else {
        console.log('\n✅ Tous les seuils respectés en mode strict');
      }
    }
  }
}

// Exécution du script
if (require.main === module) {
  const coverage = new CommentCoverage();
  
  const args = process.argv.slice(2);
  const srcPath = args.find(arg => !arg.startsWith('--')) || './src';
  const minCoverageArg = args.find(arg => arg.startsWith('--min-coverage='));
  const minCoverage = minCoverageArg ? 
    parseInt(minCoverageArg.split('=')[1]) : 80;
  
  coverage.analyzeCoverage(srcPath, minCoverage);
}

module.exports = CommentCoverage;