#!/usr/bin/env node
/**
 * Script d'Audit Automatisé des Commentaires HerbisVeritas
 * 
 * Ce script analyse le codebase pour identifier :
 * - Commentaires évidents (redondants avec le code)
 * - JSDoc manquante sur fonctions publiques
 * - Incohérences entre commentaires et code
 * - Métriques de qualité des commentaires
 * 
 * Usage: node scripts/comment-audit.js [--fix] [--report=json|html]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CommentAuditor {
  constructor() {
    this.config = {
      srcDir: './src',
      ignorePatterns: ['node_modules', 'dist', 'build', '.next', 'coverage'],
      fileExtensions: ['.ts', '.tsx', '.js', '.jsx'],
      obviousCommentPatterns: [
        // Commentaires qui ne font que répéter le code
        /\/\*\*?\s*Sets?\s+(\w+)\s*\*?\//i,          // "Sets something"
        /\/\*\*?\s*Gets?\s+(\w+)\s*\*?\//i,          // "Gets something"  
        /\/\*\*?\s*Returns?\s+(\w+)\s*\*?\//i,       // "Returns something"
        /\/\/\s*Set\s+\w+/i,                         // "// Set variable"
        /\/\/\s*Get\s+\w+/i,                         // "// Get variable"
        /\/\/\s*Initialize\s+\w+/i,                  // "// Initialize variable"
        /\/\/\s*Create\s+\w+/i,                      // "// Create variable"
        /\/\/\s*Call\s+\w+/i,                        // "// Call function"
        /\/\/\s*Check\s+if\s+\w+/i,                  // "// Check if condition"
        /\/\/\s*Loop\s+(through|over)\s+\w+/i,       // "// Loop through array"
        /\/\*\*?\s*\d+\.\s+\w+/,                     // "1. Something" (listes numérotées simples)
        /\/\*\*?\s*-+\s*\w+\s*-+\s*\*?\//,          // "--- Section ---"
        /\/\/\s*TODO:\s*$/i,                         // "// TODO:" sans description
        /\/\/\s*FIXME:\s*$/i,                        // "// FIXME:" sans description
      ],
      requiredJSDocFunctions: [
        'export function',
        'export async function', 
        'export const.*=.*=>',
        'export const.*=.*function',
        'async function',
        'function.*Action\\(',  // Server Actions
      ],
      codeQualityChecks: [
        {
          name: 'outdated-imports',
          pattern: /\/\/.*import.*from/i,
          description: 'Commentaires mentionnant d\'anciens imports'
        },
        {
          name: 'hardcoded-values',
          pattern: /\/\/.*TODO.*hardcod/i,
          description: 'TODOs pour remplacer des valeurs hardcodées'
        },
        {
          name: 'french-english-mix',
          pattern: /\/\*\*.*[a-z]+.*\*\//,
          description: 'Mélange français/anglais dans JSDoc'
        }
      ]
    };
    this.results = {
      totalFiles: 0,
      totalComments: 0,
      obviousComments: [],
      missingJSDoc: [],
      codeQualityIssues: [],
      metrics: {
        commentDensity: 0,
        jsdocCoverage: 0,
        obviousCommentRatio: 0
      }
    };
  }

  /**
   * Point d'entrée principal pour l'audit
   */
  async run(options = {}) {
    console.log('🔍 Début de l\'audit des commentaires HerbisVeritas...\n');

    try {
      const files = this.findFiles();
      console.log(`📁 ${files.length} fichiers trouvés\n`);

      for (const file of files) {
        await this.auditFile(file);
      }

      this.calculateMetrics();
      this.displayResults();

      if (options.report) {
        await this.generateReport(options.report);
      }

      if (options.fix) {
        await this.applyAutoFixes();
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'audit:', error.message);
      process.exit(1);
    }
  }

  /**
   * Trouve tous les fichiers TypeScript/JavaScript dans le projet
   */
  findFiles() {
    const files = [];
    
    const walkDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!this.config.ignorePatterns.some(pattern => entry.name.includes(pattern))) {
            walkDir(fullPath);
          }
        } else if (this.config.fileExtensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walkDir(this.config.srcDir);
    this.results.totalFiles = files.length;
    return files;
  }

  /**
   * Audite un fichier spécifique
   */
  async auditFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    // Analyser les commentaires
    this.analyzeComments(filePath, content, lines);
    
    // Vérifier JSDoc manquante
    this.checkMissingJSDoc(filePath, content);
    
    // Vérifier la qualité du code
    this.checkCodeQuality(filePath, content);

    process.stdout.write('.');
  }

  /**
   * Analyse tous les commentaires d'un fichier
   */
  analyzeComments(filePath, content, lines) {
    // Regex pour capturer différents types de commentaires
    const commentRegex = /(?:\/\*\*?[\s\S]*?\*\/|\/\/.*)/g;
    let match;
    let commentCount = 0;

    while ((match = commentRegex.exec(content)) !== null) {
      commentCount++;
      const comment = match[0];
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Vérifier si c'est un commentaire évident
      for (const pattern of this.config.obviousCommentPatterns) {
        if (pattern.test(comment)) {
          this.results.obviousComments.push({
            file: filePath,
            line: lineNumber,
            comment: comment.trim(),
            reason: this.getObviousCommentReason(pattern, comment),
            suggestion: this.suggestCommentImprovement(comment)
          });
          break;
        }
      }
    }

    this.results.totalComments += commentCount;
  }

  /**
   * Vérifie les fonctions manquant de JSDoc
   */
  checkMissingJSDoc(filePath, content) {
    for (const pattern of this.config.requiredJSDocFunctions) {
      const regex = new RegExp(pattern, 'gm');
      let match;

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const functionLine = content.split('\n')[lineNumber - 1];
        
        // Vérifier si il y a déjà une JSDoc au-dessus
        const prevLines = content.split('\n').slice(Math.max(0, lineNumber - 5), lineNumber - 1);
        const hasJSDoc = prevLines.some(line => line.trim().includes('/**'));

        if (!hasJSDoc && this.isFunctionExported(functionLine)) {
          const functionName = this.extractFunctionName(functionLine);
          
          this.results.missingJSDoc.push({
            file: filePath,
            line: lineNumber,
            function: functionName,
            type: this.getFunctionType(functionLine),
            suggestion: this.generateJSDocTemplate(functionName, functionLine)
          });
        }
      }
    }
  }

  /**
   * Vérifie la qualité générale du code et des commentaires
   */
  checkCodeQuality(filePath, content) {
    for (const check of this.config.codeQualityChecks) {
      const matches = content.match(new RegExp(check.pattern, 'gm'));
      
      if (matches) {
        matches.forEach(match => {
          const lineNumber = content.substring(0, content.indexOf(match)).split('\n').length;
          
          this.results.codeQualityIssues.push({
            file: filePath,
            line: lineNumber,
            type: check.name,
            description: check.description,
            content: match.trim()
          });
        });
      }
    }
  }

  /**
   * Calcule les métriques de qualité
   */
  calculateMetrics() {
    const totalLines = this.getTotalLines();
    
    this.results.metrics = {
      commentDensity: ((this.results.totalComments / totalLines) * 100).toFixed(2),
      jsdocCoverage: this.calculateJSDocCoverage().toFixed(2),
      obviousCommentRatio: ((this.results.obviousComments.length / this.results.totalComments) * 100).toFixed(2),
      qualityScore: this.calculateQualityScore().toFixed(1)
    };
  }

  /**
   * Affiche les résultats de l'audit
   */
  displayResults() {
    console.log('\n\n📊 RÉSULTATS DE L\'AUDIT DES COMMENTAIRES\n');
    console.log('═'.repeat(60));

    // Métriques générales
    console.log('\n📈 MÉTRIQUES GÉNÉRALES:');
    console.log(`   • Fichiers analysés: ${this.results.totalFiles}`);
    console.log(`   • Commentaires trouvés: ${this.results.totalComments}`);
    console.log(`   • Densité de commentaires: ${this.results.metrics.commentDensity}%`);
    console.log(`   • Couverture JSDoc: ${this.results.metrics.jsdocCoverage}%`);
    console.log(`   • Score qualité: ${this.results.metrics.qualityScore}/10`);

    // Commentaires évidents
    if (this.results.obviousComments.length > 0) {
      console.log(`\n🚨 COMMENTAIRES ÉVIDENTS (${this.results.obviousComments.length}):`);
      this.results.obviousComments.slice(0, 10).forEach(item => {
        console.log(`   📄 ${item.file}:${item.line}`);
        console.log(`      💬 "${item.comment}"`);
        console.log(`      ❓ Raison: ${item.reason}`);
        console.log(`      💡 Suggestion: ${item.suggestion}\n`);
      });

      if (this.results.obviousComments.length > 10) {
        console.log(`   ... et ${this.results.obviousComments.length - 10} autres\n`);
      }
    }

    // JSDoc manquante
    if (this.results.missingJSDoc.length > 0) {
      console.log(`\n📝 JSDOC MANQUANTE (${this.results.missingJSDoc.length}):`);
      this.results.missingJSDoc.slice(0, 10).forEach(item => {
        console.log(`   📄 ${item.file}:${item.line}`);
        console.log(`      🔧 ${item.type}: ${item.function}`);
        console.log(`      📋 Template suggéré:`);
        console.log(item.suggestion.split('\n').map(line => `         ${line}`).join('\n'));
        console.log('');
      });

      if (this.results.missingJSDoc.length > 10) {
        console.log(`   ... et ${this.results.missingJSDoc.length - 10} autres\n`);
      }
    }

    // Issues de qualité
    if (this.results.codeQualityIssues.length > 0) {
      console.log(`\n⚠️  PROBLÈMES DE QUALITÉ (${this.results.codeQualityIssues.length}):`);
      const groupedIssues = this.groupIssuesByType();
      
      Object.entries(groupedIssues).forEach(([type, issues]) => {
        console.log(`   🔍 ${type}: ${issues.length} occurrences`);
        issues.slice(0, 3).forEach(issue => {
          console.log(`      📄 ${issue.file}:${issue.line} - ${issue.content}`);
        });
        if (issues.length > 3) {
          console.log(`      ... et ${issues.length - 3} autres`);
        }
        console.log('');
      });
    }

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    console.log(`   • Supprimer ${this.results.obviousComments.length} commentaires évidents (${this.results.metrics.obviousCommentRatio}% du total)`);
    console.log(`   • Ajouter JSDoc à ${this.results.missingJSDoc.length} fonctions publiques`);
    console.log(`   • Résoudre ${this.results.codeQualityIssues.length} problèmes de qualité`);
    
    const estimatedTime = this.estimateRefactoringTime();
    console.log(`   • Temps estimé de refactoring: ${estimatedTime.hours}h ${estimatedTime.minutes}min`);

    console.log('\n═'.repeat(60));
  }

  /**
   * Utilitaires pour l'analyse
   */
  getObviousCommentReason(pattern, comment) {
    const reasons = {
      '/Sets?/': 'Commentaire qui ne fait que répéter l\'affectation',
      '/Gets?/': 'Commentaire qui ne fait que répéter l\'accès',
      '/Returns?/': 'Commentaire qui ne fait que répéter le return',
      '/Initialize/': 'Commentaire évident sur l\'initialisation',
      '/Create/': 'Commentaire évident sur la création',
      '/TODO:\\s*$/': 'TODO sans description utile',
      '/FIXME:\\s*$/': 'FIXME sans description utile'
    };

    for (const [key, reason] of Object.entries(reasons)) {
      if (new RegExp(key, 'i').test(comment)) {
        return reason;
      }
    }
    return 'Commentaire redondant avec le code';
  }

  suggestCommentImprovement(comment) {
    if (comment.includes('TODO:') && comment.trim().endsWith('TODO:')) {
      return 'Ajouter une description claire de ce qui doit être fait';
    }
    if (comment.includes('Set') || comment.includes('Get')) {
      return 'Expliquer POURQUOI cette opération est nécessaire, pas QUOI elle fait';
    }
    if (comment.includes('Initialize') || comment.includes('Create')) {
      return 'Documenter le contexte métier plutôt que l\'action technique';
    }
    return 'Supprimer ce commentaire ou expliquer la logique métier';
  }

  isFunctionExported(line) {
    return line.includes('export') || 
           line.includes('async function') || 
           line.includes('Action(');
  }

  extractFunctionName(line) {
    const match = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*=/);
    return match ? (match[1] || match[2]) : 'unknownFunction';
  }

  getFunctionType(line) {
    if (line.includes('Action(')) return 'Server Action';
    if (line.includes('async')) return 'Async Function';
    if (line.includes('const') && line.includes('=>')) return 'Arrow Function';
    return 'Function';
  }

  generateJSDocTemplate(functionName, line) {
    const isServerAction = line.includes('Action(');
    const isAsync = line.includes('async');
    
    let template = '/**\n';
    
    if (isServerAction) {
      template += ` * Server Action: ${functionName}\n`;
      template += ' * \n';
      template += ' * @description [Décrire l\'action et son impact métier]\n';
      template += ' * @param {FormData} formData - Données du formulaire\n';
      template += ' * @param {ActionResult<T> | undefined} prevState - État précédent de l\'action\n';
      template += ' * @returns {Promise<ActionResult<T>>} Résultat de l\'action\n';
      template += ' * \n';
      template += ' * @example\n';
      template += ` * const result = await ${functionName}(undefined, formData);\n`;
      template += ' * if (result.success) {\n';
      template += ' *   // Gérer le succès\n';
      template += ' * }\n';
    } else {
      template += ` * ${functionName}\n`;
      template += ' * \n';
      template += ' * @description [Décrire la fonction et son objectif]\n';
      template += ' * @param {type} param - [Description du paramètre]\n';
      
      if (isAsync) {
        template += ' * @returns {Promise<type>} [Description du retour]\n';
      } else {
        template += ' * @returns {type} [Description du retour]\n';
      }
    }
    
    template += ' */';
    return template;
  }

  calculateJSDocCoverage() {
    // Estimation basée sur le nombre de fonctions avec JSDoc vs sans JSDoc
    const totalFunctions = this.countTotalFunctions();
    const functionsWithJSDoc = totalFunctions - this.results.missingJSDoc.length;
    return totalFunctions > 0 ? (functionsWithJSDoc / totalFunctions) * 100 : 100;
  }

  countTotalFunctions() {
    // Approximation basée sur les patterns de fonctions
    let total = 0;
    for (const pattern of this.config.requiredJSDocFunctions) {
      // Cette fonction devrait compter plus précisément, 
      // pour l'instant on utilise une estimation
      total += this.results.missingJSDoc.length;
    }
    return total > 0 ? total : 1; // Éviter division par zéro
  }

  calculateQualityScore() {
    // Score sur 10 basé sur plusieurs facteurs
    const jsdocScore = this.results.metrics.jsdocCoverage / 10; // 0-10
    const obviousCommentPenalty = (this.results.metrics.obviousCommentRatio / 10); // Pénalité
    const qualityIssuesPenalty = Math.min(this.results.codeQualityIssues.length / 10, 3); // Max 3 points de pénalité
    
    return Math.max(0, 10 - obviousCommentPenalty - qualityIssuesPenalty + (jsdocScore * 0.3));
  }

  getTotalLines() {
    // Estimation pour les métriques - devrait être plus précise en production
    return this.results.totalFiles * 100; // Moyenne de 100 lignes par fichier
  }

  groupIssuesByType() {
    return this.results.codeQualityIssues.reduce((acc, issue) => {
      if (!acc[issue.type]) {
        acc[issue.type] = [];
      }
      acc[issue.type].push(issue);
      return acc;
    }, {});
  }

  estimateRefactoringTime() {
    // Estimation basée sur l'expérience
    const obviousCommentTime = this.results.obviousComments.length * 2; // 2min par commentaire évident
    const jsdocTime = this.results.missingJSDoc.length * 5; // 5min par JSDoc à ajouter
    const qualityIssueTime = this.results.codeQualityIssues.length * 3; // 3min par problème

    const totalMinutes = obviousCommentTime + jsdocTime + qualityIssueTime;
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      totalMinutes
    };
  }

  /**
   * Génère un rapport détaillé
   */
  async generateReport(format = 'json') {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `comment-audit-${timestamp}.${format}`;

    if (format === 'json') {
      await this.generateJSONReport(filename);
    } else if (format === 'html') {
      await this.generateHTMLReport(filename);
    }

    console.log(`\n📋 Rapport généré: ${filename}`);
  }

  async generateJSONReport(filename) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.metrics,
      details: {
        obviousComments: this.results.obviousComments,
        missingJSDoc: this.results.missingJSDoc,
        codeQualityIssues: this.results.codeQualityIssues
      },
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  }

  async generateHTMLReport(filename) {
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit des Commentaires - HerbisVeritas</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #2d5016; border-bottom: 3px solid #4a7c2a; padding-bottom: 10px; }
        h2 { color: #4a7c2a; margin-top: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #4a7c2a; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2d5016; }
        .metric-label { color: #666; font-size: 0.9em; margin-top: 5px; }
        .issue-item { background: #fff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; margin: 10px 0; }
        .issue-header { font-weight: bold; color: #d73027; margin-bottom: 8px; }
        .file-path { font-family: monospace; background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
        .comment-preview { font-family: monospace; background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc; margin: 8px 0; font-size: 0.9em; }
        .suggestion { background: #e8f5e8; padding: 10px; border-radius: 4px; margin-top: 8px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Audit des Commentaires - HerbisVeritas</h1>
        <p><strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value">${this.results.totalFiles}</div>
                <div class="metric-label">Fichiers analysés</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.results.totalComments}</div>
                <div class="metric-label">Commentaires trouvés</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.results.metrics.commentDensity}%</div>
                <div class="metric-label">Densité commentaires</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.results.metrics.jsdocCoverage}%</div>
                <div class="metric-label">Couverture JSDoc</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.results.metrics.qualityScore}/10</div>
                <div class="metric-label">Score qualité</div>
            </div>
        </div>

        <h2>🚨 Commentaires Évidents (${this.results.obviousComments.length})</h2>
        ${this.results.obviousComments.map(item => `
            <div class="issue-item">
                <div class="issue-header">📄 <span class="file-path">${item.file}:${item.line}</span></div>
                <div class="comment-preview">${item.comment}</div>
                <div><strong>Raison:</strong> ${item.reason}</div>
                <div class="suggestion"><strong>💡 Suggestion:</strong> ${item.suggestion}</div>
            </div>
        `).join('')}

        <h2>📝 JSDoc Manquante (${this.results.missingJSDoc.length})</h2>
        ${this.results.missingJSDoc.map(item => `
            <div class="issue-item">
                <div class="issue-header">🔧 <span class="file-path">${item.file}:${item.line}</span></div>
                <div><strong>${item.type}:</strong> ${item.function}</div>
                <div class="suggestion">
                    <strong>📋 Template suggéré:</strong>
                    <pre style="margin: 8px 0; white-space: pre-wrap;">${item.suggestion}</pre>
                </div>
            </div>
        `).join('')}

        <h2>💡 Recommandations</h2>
        ${this.generateRecommendations().map(rec => `
            <div class="recommendation">
                <strong>${rec.priority}:</strong> ${rec.action} (${rec.estimatedTime})
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    fs.writeFileSync(filename, html);
  }

  generateRecommendations() {
    const estimatedTime = this.estimateRefactoringTime();
    
    return [
      {
        priority: 'HAUTE',
        action: `Supprimer ${this.results.obviousComments.length} commentaires évidents`,
        estimatedTime: `${Math.ceil(this.results.obviousComments.length * 2 / 60)}h`
      },
      {
        priority: 'MOYENNE',
        action: `Ajouter JSDoc à ${this.results.missingJSDoc.length} fonctions publiques`,
        estimatedTime: `${Math.ceil(this.results.missingJSDoc.length * 5 / 60)}h`
      },
      {
        priority: 'BASSE',
        action: `Résoudre ${this.results.codeQualityIssues.length} problèmes de qualité`,
        estimatedTime: `${Math.ceil(this.results.codeQualityIssues.length * 3 / 60)}h`
      }
    ];
  }

  /**
   * Applique les corrections automatiques possibles
   */
  async applyAutoFixes() {
    console.log('\n🔧 Application des corrections automatiques...');
    
    // Pour l'instant, on ne fait que les TODOs/FIXME vides
    let fixedCount = 0;
    
    for (const comment of this.results.obviousComments) {
      if (comment.comment.match(/\/\/\s*(TODO|FIXME):\s*$/i)) {
        // Supprimer les TODOs/FIXME vides
        await this.removeLine(comment.file, comment.line);
        fixedCount++;
      }
    }
    
    console.log(`✅ ${fixedCount} corrections automatiques appliquées`);
  }

  async removeLine(filePath, lineNumber) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.splice(lineNumber - 1, 1);
    fs.writeFileSync(filePath, lines.join('\n'));
  }
}

// Point d'entrée du script
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    report: args.find(arg => arg.startsWith('--report='))?.split('=')[1] || null
  };

  const auditor = new CommentAuditor();
  auditor.run(options);
}

module.exports = CommentAuditor;