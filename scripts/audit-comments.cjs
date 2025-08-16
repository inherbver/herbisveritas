#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Script d'audit automatisé des commentaires HerbisVeritas
 * 
 * Analyse les patterns de commentaires et génère un rapport détaillé
 * pour identifier les commentaires à supprimer et standardiser.
 */
class CommentAuditor {
  constructor() {
    this.results = {
      totalFiles: 0,
      totalLines: 0,
      totalComments: 0,
      obviousComments: [],
      missingJSDoc: [],
      inconsistentComments: [],
      todoComments: [],
      importComments: [],
      securityComments: [],
      performanceComments: [],
      metrics: {}
    };

    // Patterns pour détecter commentaires évidents
    this.obviousPatterns = [
      { pattern: /\/\/ Importe? .*/, reason: 'Import évident' },
      { pattern: /\/\/ Déclaration? .*/, reason: 'Déclaration évidente' },
      { pattern: /\/\/ Fonction .*/, reason: 'Fonction évidente' },
      { pattern: /\/\/ Constante? .*/, reason: 'Constante évidente' },
      { pattern: /\/\/ Variable? .*/, reason: 'Variable évidente' },
      { pattern: /\/\/ Return .*/, reason: 'Return évident' },
      { pattern: /\/\/ Set .*/, reason: 'Setter évident' },
      { pattern: /\/\/ Get .*/, reason: 'Getter évident' },
      { pattern: /\/\/ Create .*/, reason: 'Création évidente' },
      { pattern: /\/\/ Initialize? .*/, reason: 'Initialisation évidente' },
      { pattern: /\/\/ Export .*/, reason: 'Export évident' },
      { pattern: /\/\/ Define .*/, reason: 'Définition évidente' }
    ];

    // Patterns pour commentaires utiles à conserver
    this.keepPatterns = [
      /SECURITY:/,
      /PERF:/,
      /TODO:/,
      /FIXME:/,
      /HACK:/,
      /XXX:/,
      /BUG:/,
      /NOTE:/,
      /WARNING:/,
      /@ts-ignore/,
      /@ts-expect-error/
    ];
  }

  /**
   * Lance l'audit complet du projet
   */
  auditProject(srcPath = './src') {
    console.log('🔍 Début de l\'audit des commentaires HerbisVeritas...\n');
    console.log(`📁 Analyse du répertoire: ${path.resolve(srcPath)}\n`);
    
    const startTime = Date.now();
    this.walkDirectory(srcPath);
    const endTime = Date.now();
    
    this.calculateMetrics();
    this.generateReport(endTime - startTime);
    this.generateCleanupScript();
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
          this.auditFile(filePath);
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
    return filename.match(/\.(ts|tsx|js|jsx)$/) && !filename.includes('.test.');
  }

  /**
   * Analyse un fichier spécifique
   */
  auditFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.results.totalFiles++;
      this.results.totalLines += lines.length;
      
      this.analyzeComments(lines, filePath);
      this.analyzeJSDocPresence(content, filePath);
    } catch (error) {
      console.warn(`⚠️  Erreur lecture fichier ${filePath}: ${error.message}`);
    }
  }

  /**
   * Analyse les commentaires ligne par ligne
   */
  analyzeComments(lines, filePath) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      if (this.isComment(line)) {
        this.results.totalComments++;
        
        // Analyser type de commentaire
        this.categorizeComment(line, filePath, lineNumber);
      }
    }
  }

  /**
   * Détermine si une ligne est un commentaire
   */
  isComment(line) {
    return line.startsWith('//') || 
           line.startsWith('/*') || 
           line.startsWith('*') ||
           (line.includes('//') && !line.includes('http://') && !line.includes('https://'));
  }

  /**
   * Catégorise un commentaire selon son type
   */
  categorizeComment(line, filePath, lineNumber) {
    const comment = {
      file: filePath,
      line: lineNumber,
      text: line
    };

    // Vérifier si c'est un commentaire à conserver
    if (this.shouldKeepComment(line)) {
      this.categorizeSpecialComment(comment);
      return;
    }

    // Vérifier si c'est un commentaire évident
    for (const { pattern, reason } of this.obviousPatterns) {
      if (pattern.test(line)) {
        this.results.obviousComments.push({
          ...comment,
          reason
        });
        return;
      }
    }
  }

  /**
   * Détermine si un commentaire doit être conservé
   */
  shouldKeepComment(line) {
    return this.keepPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Catégorise les commentaires spéciaux à conserver
   */
  categorizeSpecialComment(comment) {
    const line = comment.text;
    
    if (/TODO:|FIXME:|HACK:|XXX:|BUG:/.test(line)) {
      this.results.todoComments.push({
        ...comment,
        type: this.getTodoType(line),
        priority: this.getTodoPriority(line),
        hasDate: /\d{4}-\d{2}-\d{2}/.test(line)
      });
    } else if (/SECURITY:/.test(line)) {
      this.results.securityComments.push(comment);
    } else if (/PERF:/.test(line)) {
      this.results.performanceComments.push(comment);
    }
  }

  /**
   * Extrait le type de TODO
   */
  getTodoType(line) {
    if (line.includes('TODO:')) return 'TODO';
    if (line.includes('FIXME:')) return 'FIXME';
    if (line.includes('HACK:')) return 'HACK';
    if (line.includes('XXX:')) return 'XXX';
    if (line.includes('BUG:')) return 'BUG';
    return 'OTHER';
  }

  /**
   * Extrait la priorité d'un TODO
   */
  getTodoPriority(line) {
    if (/HIGH|URGENT|CRITIQUE/i.test(line)) return 'HIGH';
    if (/MED|MEDIUM|MOYEN/i.test(line)) return 'MEDIUM';
    if (/LOW|BAS|FAIBLE/i.test(line)) return 'LOW';
    return 'UNDEFINED';
  }

  /**
   * Analyse la présence de JSDoc
   */
  analyzeJSDocPresence(content, filePath) {
    // Détecter fonctions exportées sans JSDoc
    const exportedFunctions = this.extractExportedFunctions(content);
    
    exportedFunctions.forEach(func => {
      if (!func.hasJSDoc) {
        this.results.missingJSDoc.push({
          file: filePath,
          line: func.line,
          name: func.name,
          type: func.type,
          isAsync: func.isAsync,
          isServerAction: filePath.includes('/actions/') && content.includes('"use server"')
        });
      }
    });
  }

  /**
   * Extrait les fonctions exportées d'un fichier
   */
  extractExportedFunctions(content) {
    const functions = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Détecter exports de fonctions
      const exportMatch = line.match(/export\s+(async\s+)?function\s+(\w+)/);
      if (exportMatch) {
        const hasJSDoc = i > 0 && this.hasJSDocAbove(lines, i);
        
        functions.push({
          line: lineNumber,
          name: exportMatch[2],
          type: 'function',
          isAsync: !!exportMatch[1],
          hasJSDoc
        });
      }

      // Détecter exports const arrow functions
      const constMatch = line.match(/export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (constMatch) {
        const hasJSDoc = i > 0 && this.hasJSDocAbove(lines, i);
        
        functions.push({
          line: lineNumber,
          name: constMatch[1],
          type: 'arrow_function',
          isAsync: !!constMatch[2],
          hasJSDoc
        });
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
      
      if (line === '') continue; // Ignorer lignes vides
      
      if (line.includes('*/')) {
        // Trouver le début du bloc JSDoc
        for (let j = i; j >= 0; j--) {
          if (lines[j].trim().startsWith('/**')) {
            return true;
          }
        }
      }
      
      break; // Arrêter à la première ligne non-vide
    }
    
    return false;
  }

  /**
   * Calcule les métriques globales
   */
  calculateMetrics() {
    const { totalComments, obviousComments, todoComments, securityComments, performanceComments } = this.results;
    
    this.results.metrics = {
      obviousCommentsPercentage: totalComments > 0 ? ((obviousComments.length / totalComments) * 100).toFixed(1) : 0,
      todoCommentsPercentage: totalComments > 0 ? ((todoComments.length / totalComments) * 100).toFixed(1) : 0,
      specialCommentsCount: securityComments.length + performanceComments.length,
      averageCommentsPerFile: totalComments > 0 ? (totalComments / this.results.totalFiles).toFixed(1) : 0,
      potentialReduction: obviousComments.length,
      reductionPercentage: totalComments > 0 ? ((obviousComments.length / totalComments) * 100).toFixed(1) : 0
    };
  }

  /**
   * Génère le rapport détaillé
   */
  generateReport(executionTime) {
    const { metrics } = this.results;
    
    const report = `# Rapport d'Audit des Commentaires HerbisVeritas

📊 **Généré le**: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}  
⏱️ **Temps d'exécution**: ${executionTime}ms  
📁 **Répertoire analysé**: src/

## Métriques Globales

| Métrique | Valeur |
|----------|--------|
| **Fichiers analysés** | ${this.results.totalFiles} |
| **Lignes de code totales** | ${this.results.totalLines.toLocaleString()} |
| **Commentaires totaux** | ${this.results.totalComments} |
| **Commentaires par fichier (moyenne)** | ${metrics.averageCommentsPerFile} |

## Analyse de Réduction

| Type | Nombre | Pourcentage |
|------|--------|-------------|
| **Commentaires évidents** (à supprimer) | ${this.results.obviousComments.length} | ${metrics.obviousCommentsPercentage}% |
| **Réduction potentielle** | ${metrics.potentialReduction} commentaires | ${metrics.reductionPercentage}% |
| **Objectif (40% de réduction)** | ${Math.ceil(this.results.totalComments * 0.4)} commentaires | 40% |
| **Statut objectif** | ${metrics.potentialReduction >= Math.ceil(this.results.totalComments * 0.4) ? '✅ Atteignable' : '❌ Insuffisant'} | |

## Commentaires à Supprimer (${this.results.obviousComments.length})

${this.results.obviousComments.length > 0 ? 
  this.results.obviousComments
    .slice(0, 20) // Limiter à 20 pour la lisibilité
    .map(c => `- **${c.file}:${c.line}** - ${c.reason}\n  \`${c.text.substring(0, 100)}${c.text.length > 100 ? '...' : ''}\``)
    .join('\n\n') 
  : 'Aucun commentaire évident détecté.'}

${this.results.obviousComments.length > 20 ? `\n*... et ${this.results.obviousComments.length - 20} autres commentaires évidents.*` : ''}

## JSDoc Manquantes (${this.results.missingJSDoc.length})

${this.results.missingJSDoc.length > 0 ?
  this.results.missingJSDoc
    .slice(0, 15)
    .map(f => `- **${f.file}:${f.line}** - ${f.type} \`${f.name}\`${f.isServerAction ? ' (Server Action)' : ''}${f.isAsync ? ' (async)' : ''}`)
    .join('\n')
  : 'Toutes les fonctions publiques ont une JSDoc !'}

${this.results.missingJSDoc.length > 15 ? `\n*... et ${this.results.missingJSDoc.length - 15} autres fonctions sans JSDoc.*` : ''}

## Actions TODO/FIXME (${this.results.todoComments.length})

### Par Priorité
${this.generateTodoByPriority()}

### Détail des TODOs
${this.results.todoComments.length > 0 ?
  this.results.todoComments
    .slice(0, 10)
    .map(t => `- **${t.file}:${t.line}** - ${t.type} (${t.priority})${t.hasDate ? ' 📅' : ' ⚠️ Sans date'}\n  \`${t.text.substring(0, 120)}${t.text.length > 120 ? '...' : ''}\``)
    .join('\n\n')
  : 'Aucun TODO/FIXME trouvé.'}

## Commentaires Spéciaux à Conserver

### Sécurité (${this.results.securityComments.length})
${this.results.securityComments.slice(0, 5).map(c => `- **${c.file}:${c.line}** \`${c.text}\``).join('\n')}

### Performance (${this.results.performanceComments.length})
${this.results.performanceComments.slice(0, 5).map(c => `- **${c.file}:${c.line}** \`${c.text}\``).join('\n')}

## Recommandations

### Actions Immédiates
1. **Supprimer ${this.results.obviousComments.length} commentaires évidents** (gain: ${metrics.reductionPercentage}%)
2. **Ajouter JSDoc à ${this.results.missingJSDoc.length} fonctions publiques**
3. **Standardiser ${this.results.todoComments.filter(t => !t.hasDate).length} TODOs sans date**

### Fichiers Prioritaires
${this.getTopFilesWithIssues().map(f => `- **${f.file}** (${f.issues} problèmes)`).join('\n')}

### Prochaines Étapes
1. Exécuter le script de nettoyage: \`node scripts/cleanup-obvious-comments.js\`
2. Appliquer templates JSDoc: \`node scripts/add-jsdoc-templates.js\`
3. Standardiser TODOs: \`node scripts/standardize-todos.js\`

---
*Rapport généré automatiquement par audit-comments.js*
`;

    const reportPath = './docs/COMMENT_AUDIT_REPORT.md';
    fs.writeFileSync(reportPath, report);
    
    console.log('📊 Rapport généré avec succès !');
    console.log(`📄 Fichier: ${path.resolve(reportPath)}`);
    console.log(`\n📈 Résultats clés:`);
    console.log(`   • ${this.results.totalFiles} fichiers analysés`);
    console.log(`   • ${this.results.totalComments} commentaires trouvés`);
    console.log(`   • ${this.results.obviousComments.length} commentaires évidents à supprimer (${metrics.reductionPercentage}%)`);
    console.log(`   • ${this.results.missingJSDoc.length} fonctions sans JSDoc`);
    console.log(`   • Objectif 40% de réduction: ${metrics.potentialReduction >= Math.ceil(this.results.totalComments * 0.4) ? '✅ Atteignable' : '❌ Besoin de plus d\'analyse'}`);
  }

  /**
   * Génère un résumé des TODOs par priorité
   */
  generateTodoByPriority() {
    const byPriority = this.results.todoComments.reduce((acc, todo) => {
      acc[todo.priority] = (acc[todo.priority] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(byPriority)
      .map(([priority, count]) => `- **${priority}**: ${count} éléments`)
      .join('\n') || 'Aucun TODO trouvé.';
  }

  /**
   * Identifie les fichiers avec le plus de problèmes
   */
  getTopFilesWithIssues() {
    const fileIssues = {};
    
    // Compter les problèmes par fichier
    [...this.results.obviousComments, ...this.results.missingJSDoc].forEach(issue => {
      fileIssues[issue.file] = (fileIssues[issue.file] || 0) + 1;
    });
    
    return Object.entries(fileIssues)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([file, issues]) => ({ file, issues }));
  }

  /**
   * Génère un script de nettoyage automatique
   */
  generateCleanupScript() {
    const script = `#!/usr/bin/env node

/**
 * Script de nettoyage automatique des commentaires évidents
 * Généré automatiquement par audit-comments.js
 */

const fs = require('fs');

const OBVIOUS_COMMENTS_TO_REMOVE = ${JSON.stringify(this.results.obviousComments, null, 2)};

console.log('🧹 Début du nettoyage des commentaires évidents...');
console.log(\`📝 \${OBVIOUS_COMMENTS_TO_REMOVE.length} commentaires à supprimer\`);

let removedCount = 0;
let errorCount = 0;

OBVIOUS_COMMENTS_TO_REMOVE.forEach((comment, index) => {
  try {
    const content = fs.readFileSync(comment.file, 'utf8');
    const lines = content.split('\\n');
    
    // Vérifier que la ligne correspond toujours
    if (lines[comment.line - 1] && lines[comment.line - 1].trim() === comment.text.trim()) {
      lines.splice(comment.line - 1, 1);
      fs.writeFileSync(comment.file, lines.join('\\n'));
      removedCount++;
      console.log(\`✅ (\${index + 1}/\${OBVIOUS_COMMENTS_TO_REMOVE.length}) \${comment.file}:\${comment.line}\`);
    } else {
      console.warn(\`⚠️  Ligne modifiée, ignorée: \${comment.file}:\${comment.line}\`);
    }
  } catch (error) {
    errorCount++;
    console.error(\`❌ Erreur \${comment.file}: \${error.message}\`);
  }
});

console.log(\`\\n🎉 Nettoyage terminé !\`);
console.log(\`   • \${removedCount} commentaires supprimés\`);
console.log(\`   • \${errorCount} erreurs\`);
console.log(\`\\n⚠️  N'oubliez pas de :\`);
console.log(\`   1. Vérifier les changements: git diff\`);
console.log(\`   2. Tester la compilation: npm run typecheck\`);
console.log(\`   3. Lancer les tests: npm run test\`);
`;

    fs.writeFileSync('./scripts/cleanup-obvious-comments.js', script);
    console.log(`\n🧹 Script de nettoyage généré: ./scripts/cleanup-obvious-comments.js`);
  }
}

// Exécution du script
if (require.main === module) {
  const auditor = new CommentAuditor();
  
  // Gérer les arguments de ligne de commande
  const args = process.argv.slice(2);
  const srcPath = args.find(arg => !arg.startsWith('--')) || './src';
  
  auditor.auditProject(srcPath);
}

module.exports = CommentAuditor;