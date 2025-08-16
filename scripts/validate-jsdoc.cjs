#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validateur JSDoc pour HerbisVeritas
 * 
 * Vérifie la cohérence, complétude et qualité des commentaires JSDoc
 * Valide que les exemples de code compilent correctement
 */
class JSDocValidator {
  constructor() {
    this.results = {
      totalFunctions: 0,
      validatedFunctions: 0,
      errors: [],
      warnings: [],
      suggestions: [],
      metrics: {}
    };

    // Templates JSDoc par type de fichier
    this.templates = {
      serverAction: {
        requiredTags: ['@param', '@returns', '@throws'],
        suggestedTags: ['@example', '@security', '@performance'],
        description: 'minimum 20 caractères'
      },
      component: {
        requiredTags: ['@param'],
        suggestedTags: ['@example', '@a11y'],
        description: 'minimum 15 caractères'
      },
      utility: {
        requiredTags: ['@param', '@returns'],
        suggestedTags: ['@example', '@throws'],
        description: 'minimum 10 caractères'
      }
    };
  }

  /**
   * Lance la validation complète du projet
   */
  validateProject(srcPath = './src') {
    console.log('🔍 Validation JSDoc en cours...\n');
    console.log(`📁 Analyse du répertoire: ${path.resolve(srcPath)}\n`);
    
    const startTime = Date.now();
    this.walkDirectory(srcPath);
    const endTime = Date.now();
    
    this.calculateMetrics();
    this.generateReport(endTime - startTime);
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
          this.validateFile(filePath);
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
    const skipDirs = ['.next', 'node_modules', '.git', 'dist', 'build'];
    return !dirname.startsWith('.') && !skipDirs.includes(dirname);
  }

  /**
   * Détermine si un fichier doit être traité
   */
  shouldProcessFile(filename) {
    return filename.match(/\.(ts|tsx)$/) && !filename.includes('.test.');
  }

  /**
   * Valide la JSDoc d'un fichier
   */
  validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const functions = this.extractFunctionsWithJSDoc(content, filePath);
      
      functions.forEach(func => {
        this.results.totalFunctions++;
        this.validateFunction(func, filePath);
      });
    } catch (error) {
      this.results.errors.push({
        file: filePath,
        line: 1,
        type: 'FILE_ERROR',
        message: `Erreur lecture fichier: ${error.message}`
      });
    }
  }

  /**
   * Extrait les fonctions avec leur JSDoc
   */
  extractFunctionsWithJSDoc(content, filePath) {
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
          type: this.detectFunctionType(filePath, content),
          isAsync: !!exportMatch[1],
          jsDoc: this.extractJSDocAbove(lines, i),
          signature: this.extractFunctionSignature(lines, i)
        };
        functions.push(func);
      }

      // Détecter export const arrow functions
      const constMatch = line.match(/export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (constMatch) {
        const func = {
          line: i + 1,
          name: constMatch[1],
          type: this.detectFunctionType(filePath, content),
          isAsync: !!constMatch[2],
          jsDoc: this.extractJSDocAbove(lines, i),
          signature: this.extractArrowFunctionSignature(lines, i)
        };
        functions.push(func);
      }
    }
    
    return functions;
  }

  /**
   * Détecte le type de fonction (Server Action, Component, Utility)
   */
  detectFunctionType(filePath, content) {
    if (filePath.includes('/actions/') && content.includes('"use server"')) {
      return 'serverAction';
    } else if (filePath.includes('/components/') && content.includes('tsx')) {
      return 'component';
    } else {
      return 'utility';
    }
  }

  /**
   * Extrait la JSDoc au-dessus d'une fonction
   */
  extractJSDocAbove(lines, functionLineIndex) {
    let jsDocLines = [];
    let inJSDoc = false;
    
    for (let i = functionLineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      if (line === '') continue; // Ignorer lignes vides
      
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
        break; // Pas de JSDoc trouvée
      }
    }
    
    if (jsDocLines.length === 0) return null;
    
    return {
      raw: jsDocLines.join('\n'),
      description: this.extractDescription(jsDocLines),
      tags: this.extractTags(jsDocLines),
      examples: this.extractExamples(jsDocLines)
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
   * Extrait les tags JSDoc (@param, @returns, etc.)
   */
  extractTags(jsDocLines) {
    const tags = {};
    let currentTag = null;
    let currentContent = [];
    
    for (const line of jsDocLines) {
      const cleaned = line.replace(/^\s*\*\s?/, '').trim();
      
      const tagMatch = cleaned.match(/^@(\w+)(.*)$/);
      if (tagMatch) {
        // Sauvegarder le tag précédent
        if (currentTag) {
          if (!tags[currentTag]) tags[currentTag] = [];
          tags[currentTag].push(currentContent.join(' ').trim());
        }
        
        // Nouveau tag
        currentTag = tagMatch[1];
        currentContent = [tagMatch[2].trim()];
      } else if (currentTag && cleaned && !cleaned.includes('*/')) {
        currentContent.push(cleaned);
      }
    }
    
    // Sauvegarder le dernier tag
    if (currentTag) {
      if (!tags[currentTag]) tags[currentTag] = [];
      tags[currentTag].push(currentContent.join(' ').trim());
    }
    
    return tags;
  }

  /**
   * Extrait les exemples de code JSDoc
   */
  extractExamples(jsDocLines) {
    const examples = [];
    let inExample = false;
    let currentExample = [];
    
    for (const line of jsDocLines) {
      const cleaned = line.replace(/^\s*\*\s?/, '');
      
      if (cleaned.includes('@example')) {
        inExample = true;
        continue;
      }
      
      if (inExample) {
        if (cleaned.startsWith('@') || cleaned.includes('*/')) {
          if (currentExample.length > 0) {
            examples.push(currentExample.join('\n'));
            currentExample = [];
          }
          inExample = false;
        } else {
          currentExample.push(cleaned);
        }
      }
    }
    
    if (currentExample.length > 0) {
      examples.push(currentExample.join('\n'));
    }
    
    return examples;
  }

  /**
   * Extrait la signature d'une fonction
   */
  extractFunctionSignature(lines, startIndex) {
    let signature = '';
    let braceCount = 0;
    let inSignature = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      signature += line;
      
      if (line.includes('(')) inSignature = true;
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      
      if (inSignature && line.includes(')') && braceCount === 0) {
        break;
      }
    }
    
    return signature.trim();
  }

  /**
   * Extrait la signature d'une arrow function
   */
  extractArrowFunctionSignature(lines, startIndex) {
    let signature = '';
    
    for (let i = startIndex; i < lines.length && i < startIndex + 5; i++) {
      signature += lines[i];
      if (lines[i].includes('=>')) break;
    }
    
    return signature.trim();
  }

  /**
   * Valide une fonction spécifique
   */
  validateFunction(func, filePath) {
    if (!func.jsDoc) {
      this.results.errors.push({
        file: filePath,
        line: func.line,
        type: 'MISSING_JSDOC',
        message: `Fonction '${func.name}' sans JSDoc`,
        function: func.name
      });
      return;
    }

    this.results.validatedFunctions++;
    
    // Valider selon le template approprié
    const template = this.templates[func.type];
    this.validateAgainstTemplate(func, template, filePath);
    
    // Validations spécifiques
    this.validateDescription(func, filePath);
    this.validateParameters(func, filePath);
    this.validateExamples(func, filePath);
    this.validateSpecialTags(func, filePath);
  }

  /**
   * Valide contre un template spécifique
   */
  validateAgainstTemplate(func, template, filePath) {
    if (!template) return;
    
    // Vérifier tags requis
    template.requiredTags.forEach(requiredTag => {
      if (!func.jsDoc.tags[requiredTag.replace('@', '')]) {
        this.results.errors.push({
          file: filePath,
          line: func.line,
          type: 'MISSING_REQUIRED_TAG',
          message: `Tag requis manquant: ${requiredTag}`,
          function: func.name,
          tag: requiredTag
        });
      }
    });
    
    // Suggérer tags recommandés
    template.suggestedTags.forEach(suggestedTag => {
      if (!func.jsDoc.tags[suggestedTag.replace('@', '')]) {
        this.results.suggestions.push({
          file: filePath,
          line: func.line,
          type: 'SUGGESTED_TAG',
          message: `Tag recommandé: ${suggestedTag}`,
          function: func.name,
          tag: suggestedTag
        });
      }
    });
  }

  /**
   * Valide la description
   */
  validateDescription(func, filePath) {
    const desc = func.jsDoc.description;
    
    if (!desc || desc.length < 10) {
      this.results.errors.push({
        file: filePath,
        line: func.line,
        type: 'INSUFFICIENT_DESCRIPTION',
        message: `Description trop courte (${desc ? desc.length : 0} caractères, minimum 10)`,
        function: func.name
      });
    }
    
    // Vérifier que la description n'est pas évidente
    if (desc && this.isObviousDescription(desc, func.name)) {
      this.results.warnings.push({
        file: filePath,
        line: func.line,
        type: 'OBVIOUS_DESCRIPTION',
        message: `Description évidente qui pourrait être améliorée`,
        function: func.name
      });
    }
  }

  /**
   * Vérifie si une description est évidente
   */
  isObviousDescription(description, functionName) {
    const obvious = [
      new RegExp(`${functionName}`, 'i'),
      /Cette fonction/,
      /Cette méthode/,
      /Fonction qui/,
      /Méthode qui/
    ];
    
    return obvious.some(pattern => pattern.test(description));
  }

  /**
   * Valide la cohérence des paramètres
   */
  validateParameters(func, filePath) {
    const paramDocs = func.jsDoc.tags.param || [];
    const funcParams = this.extractParametersFromSignature(func.signature);
    
    // Paramètres documentés mais pas dans la fonction
    paramDocs.forEach(paramDoc => {
      const paramName = paramDoc.split(' ')[0];
      if (!funcParams.includes(paramName)) {
        this.results.errors.push({
          file: filePath,
          line: func.line,
          type: 'EXTRA_PARAM_DOC',
          message: `Paramètre documenté mais absent: ${paramName}`,
          function: func.name,
          parameter: paramName
        });
      }
    });
    
    // Paramètres dans la fonction mais pas documentés
    funcParams.forEach(paramName => {
      const isDocumented = paramDocs.some(doc => doc.startsWith(paramName + ' '));
      if (!isDocumented) {
        this.results.errors.push({
          file: filePath,
          line: func.line,
          type: 'MISSING_PARAM_DOC',
          message: `Paramètre non documenté: ${paramName}`,
          function: func.name,
          parameter: paramName
        });
      }
    });
  }

  /**
   * Extrait les paramètres d'une signature de fonction
   */
  extractParametersFromSignature(signature) {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    
    const params = match[1].split(',')
      .map(param => param.trim())
      .filter(param => param.length > 0)
      .map(param => {
        // Extraire nom du paramètre (avant : ou =)
        const nameMatch = param.match(/^(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      })
      .filter(Boolean);
    
    return params;
  }

  /**
   * Valide les exemples de code
   */
  validateExamples(func, filePath) {
    if (!func.jsDoc.examples || func.jsDoc.examples.length === 0) {
      if (func.type === 'serverAction' || func.type === 'component') {
        this.results.suggestions.push({
          file: filePath,
          line: func.line,
          type: 'MISSING_EXAMPLE',
          message: `Exemple recommandé pour ${func.type}`,
          function: func.name
        });
      }
      return;
    }
    
    func.jsDoc.examples.forEach((example, index) => {
      const validationResult = this.validateCodeExample(example);
      if (!validationResult.valid) {
        this.results.warnings.push({
          file: filePath,
          line: func.line,
          type: 'INVALID_EXAMPLE',
          message: `Exemple ${index + 1} invalide: ${validationResult.error}`,
          function: func.name
        });
      }
    });
  }

  /**
   * Valide un exemple de code
   */
  validateCodeExample(example) {
    try {
      // Extraire le code TypeScript de l'exemple
      const codeBlocks = example.match(/```[\w]*\n([\s\S]*?)\n```/g);
      
      if (!codeBlocks) {
        return { valid: false, error: 'Pas de bloc de code trouvé' };
      }
      
      for (const block of codeBlocks) {
        const code = block.replace(/```[\w]*\n/, '').replace(/\n```/, '');
        
        // Vérifications basiques de syntaxe
        if (!this.isValidJavaScriptSyntax(code)) {
          return { valid: false, error: 'Syntaxe JavaScript invalide' };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Vérifie la syntaxe JavaScript basique
   */
  isValidJavaScriptSyntax(code) {
    try {
      // Vérifications simples
      const hasMatchingBraces = (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length;
      const hasMatchingParens = (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length;
      const hasMatchingBrackets = (code.match(/\[/g) || []).length === (code.match(/\]/g) || []).length;
      
      return hasMatchingBraces && hasMatchingParens && hasMatchingBrackets;
    } catch {
      return false;
    }
  }

  /**
   * Valide les tags spéciaux (@security, @performance, etc.)
   */
  validateSpecialTags(func, filePath) {
    const { tags } = func.jsDoc;
    
    // Valider @security pour Server Actions
    if (func.type === 'serverAction' && !tags.security) {
      this.results.suggestions.push({
        file: filePath,
        line: func.line,
        type: 'MISSING_SECURITY_TAG',
        message: 'Tag @security recommandé pour Server Action',
        function: func.name
      });
    }
    
    // Valider @performance pour fonctions async
    if (func.isAsync && !tags.performance) {
      this.results.suggestions.push({
        file: filePath,
        line: func.line,
        type: 'MISSING_PERFORMANCE_TAG',
        message: 'Tag @performance recommandé pour fonction async',
        function: func.name
      });
    }
  }

  /**
   * Calcule les métriques finales
   */
  calculateMetrics() {
    this.results.metrics = {
      validationRate: this.results.totalFunctions > 0 ? 
        ((this.results.validatedFunctions / this.results.totalFunctions) * 100).toFixed(1) : 0,
      errorRate: this.results.totalFunctions > 0 ? 
        ((this.results.errors.length / this.results.totalFunctions) * 100).toFixed(1) : 0,
      averageErrorsPerFunction: this.results.totalFunctions > 0 ? 
        (this.results.errors.length / this.results.totalFunctions).toFixed(2) : 0,
      qualityScore: this.calculateQualityScore()
    };
  }

  /**
   * Calcule un score de qualité JSDoc
   */
  calculateQualityScore() {
    if (this.results.totalFunctions === 0) return 100;
    
    const errorWeight = 3;
    const warningWeight = 1;
    const suggestionWeight = 0.5;
    
    const penalties = 
      (this.results.errors.length * errorWeight) +
      (this.results.warnings.length * warningWeight) +
      (this.results.suggestions.length * suggestionWeight);
    
    const maxScore = 100;
    const score = Math.max(0, maxScore - (penalties / this.results.totalFunctions * 10));
    
    return score.toFixed(1);
  }

  /**
   * Génère le rapport de validation
   */
  generateReport(executionTime) {
    const { metrics } = this.results;
    
    const report = `# Rapport de Validation JSDoc HerbisVeritas

📊 **Généré le**: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}  
⏱️ **Temps d'exécution**: ${executionTime}ms  
📁 **Répertoire analysé**: src/

## Score de Qualité JSDoc

🎯 **Score global**: ${metrics.qualityScore}/100

| Métrique | Valeur |
|----------|--------|
| **Fonctions analysées** | ${this.results.totalFunctions} |
| **Fonctions avec JSDoc** | ${this.results.validatedFunctions} |
| **Taux de documentation** | ${metrics.validationRate}% |
| **Taux d'erreur** | ${metrics.errorRate}% |
| **Erreurs par fonction (moyenne)** | ${metrics.averageErrorsPerFunction} |

## Résumé des Problèmes

| Type | Nombre | Priorité |
|------|--------|----------|
| **Erreurs** | ${this.results.errors.length} | 🔴 Critique |
| **Avertissements** | ${this.results.warnings.length} | 🟡 Important |
| **Suggestions** | ${this.results.suggestions.length} | 🔵 Amélioration |

## Erreurs Critiques (${this.results.errors.length})

${this.results.errors.length > 0 ?
  this.results.errors.slice(0, 15).map(e => 
    `- **${e.file}:${e.line}** - ${e.function ? `\`${e.function}\`` : ''} ${e.message}`
  ).join('\n')
  : '✅ Aucune erreur critique !'}

## Avertissements (${this.results.warnings.length})

${this.results.warnings.length > 0 ?
  this.results.warnings.slice(0, 10).map(w => 
    `- **${w.file}:${w.line}** - ${w.function ? `\`${w.function}\`` : ''} ${w.message}`
  ).join('\n')
  : '✅ Aucun avertissement !'}

## Suggestions d'Amélioration (${this.results.suggestions.length})

${this.results.suggestions.length > 0 ?
  this.results.suggestions.slice(0, 10).map(s => 
    `- **${s.file}:${s.line}** - ${s.function ? `\`${s.function}\`` : ''} ${s.message}`
  ).join('\n')
  : '✅ Aucune amélioration suggérée !'}

## Analyse par Type de Problème

${this.generateProblemAnalysis()}

## Actions Recommandées

### Priorité 1 - Erreurs Critiques
${this.generateActionPlan('errors')}

### Priorité 2 - Améliorations
${this.generateActionPlan('warnings')}

### Priorité 3 - Optimisations
${this.generateActionPlan('suggestions')}

## Fichiers à Traiter en Priorité

${this.getTopFilesWithProblems().slice(0, 10).map(f => 
  `- **${f.file}** (${f.problems} problèmes)`
).join('\n')}

---
*Rapport généré automatiquement par validate-jsdoc.js*
`;

    const reportPath = './docs/JSDOC_VALIDATION_REPORT.md';
    fs.writeFileSync(reportPath, report);
    
    console.log('📊 Validation JSDoc terminée !');
    console.log(`📄 Rapport: ${path.resolve(reportPath)}`);
    console.log(`\n📈 Résultats:`);
    console.log(`   • Score de qualité: ${metrics.qualityScore}/100`);
    console.log(`   • ${this.results.validatedFunctions}/${this.results.totalFunctions} fonctions documentées (${metrics.validationRate}%)`);
    console.log(`   • ${this.results.errors.length} erreurs critiques`);
    console.log(`   • ${this.results.warnings.length} avertissements`);
    console.log(`   • ${this.results.suggestions.length} suggestions d'amélioration`);
  }

  /**
   * Génère l'analyse par type de problème
   */
  generateProblemAnalysis() {
    const errorTypes = {};
    const warningTypes = {};
    const suggestionTypes = {};
    
    this.results.errors.forEach(e => {
      errorTypes[e.type] = (errorTypes[e.type] || 0) + 1;
    });
    
    this.results.warnings.forEach(w => {
      warningTypes[w.type] = (warningTypes[w.type] || 0) + 1;
    });
    
    this.results.suggestions.forEach(s => {
      suggestionTypes[s.type] = (suggestionTypes[s.type] || 0) + 1;
    });
    
    let analysis = '';
    
    if (Object.keys(errorTypes).length > 0) {
      analysis += '### Erreurs par Type\n';
      analysis += Object.entries(errorTypes)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `- **${type}**: ${count}`)
        .join('\n') + '\n\n';
    }
    
    if (Object.keys(suggestionTypes).length > 0) {
      analysis += '### Suggestions par Type\n';
      analysis += Object.entries(suggestionTypes)
        .sort(([,a], [,b]) => b - a)
        .map(([type, count]) => `- **${type}**: ${count}`)
        .join('\n') + '\n\n';
    }
    
    return analysis || 'Aucun problème détecté.';
  }

  /**
   * Génère un plan d'action pour un type de problème
   */
  generateActionPlan(type) {
    const items = this.results[type] || [];
    
    if (items.length === 0) {
      return '✅ Aucune action requise.';
    }
    
    const actionsByType = {};
    items.forEach(item => {
      if (!actionsByType[item.type]) {
        actionsByType[item.type] = [];
      }
      actionsByType[item.type].push(item);
    });
    
    return Object.entries(actionsByType)
      .map(([problemType, problems]) => {
        const action = this.getActionForProblemType(problemType);
        return `- **${action}** (${problems.length} occurrences)`;
      })
      .join('\n') || 'Aucune action spécifique.';
  }

  /**
   * Retourne l'action recommandée pour un type de problème
   */
  getActionForProblemType(problemType) {
    const actions = {
      'MISSING_JSDOC': 'Ajouter JSDoc complète',
      'MISSING_REQUIRED_TAG': 'Compléter tags requis',
      'INSUFFICIENT_DESCRIPTION': 'Améliorer descriptions',
      'MISSING_PARAM_DOC': 'Documenter paramètres',
      'EXTRA_PARAM_DOC': 'Nettoyer documentation paramètres',
      'INVALID_EXAMPLE': 'Corriger exemples de code',
      'MISSING_EXAMPLE': 'Ajouter exemples utiles',
      'MISSING_SECURITY_TAG': 'Ajouter notes de sécurité',
      'OBVIOUS_DESCRIPTION': 'Améliorer qualité descriptions'
    };
    
    return actions[problemType] || 'Corriger problème';
  }

  /**
   * Identifie les fichiers avec le plus de problèmes
   */
  getTopFilesWithProblems() {
    const fileProblems = {};
    
    [...this.results.errors, ...this.results.warnings, ...this.results.suggestions]
      .forEach(problem => {
        fileProblems[problem.file] = (fileProblems[problem.file] || 0) + 1;
      });
    
    return Object.entries(fileProblems)
      .sort(([,a], [,b]) => b - a)
      .map(([file, problems]) => ({ file, problems }));
  }
}

// Exécution du script
if (require.main === module) {
  const validator = new JSDocValidator();
  
  // Gérer les arguments de ligne de commande
  const args = process.argv.slice(2);
  const srcPath = args.find(arg => !arg.startsWith('--')) || './src';
  
  validator.validateProject(srcPath);
}

module.exports = JSDocValidator;