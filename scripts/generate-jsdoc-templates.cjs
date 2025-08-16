#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Générateur de templates JSDoc pour HerbisVeritas
 * 
 * Analyse les fonctions sans JSDoc et génère des templates appropriés
 * selon le type de fichier et les patterns détectés.
 */
class JSDocTemplateGenerator {
  constructor() {
    this.templates = {
      serverAction: this.createServerActionTemplate.bind(this),
      component: this.createComponentTemplate.bind(this),
      utility: this.createUtilityTemplate.bind(this),
      hook: this.createHookTemplate.bind(this),
      service: this.createServiceTemplate.bind(this)
    };

    this.processedFiles = [];
    this.generatedTemplates = 0;
  }

  /**
   * Lance la génération de templates pour le projet
   */
  generateTemplates(srcPath = './src') {
    console.log('📝 Génération des templates JSDoc...\n');
    console.log(`📁 Analyse du répertoire: ${path.resolve(srcPath)}\n`);
    
    const startTime = Date.now();
    this.walkDirectory(srcPath);
    const endTime = Date.now();
    
    this.generateReport(endTime - startTime);
    this.generateInsertionScript();
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
          this.processFile(filePath);
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
   * Traite un fichier pour identifier les fonctions sans JSDoc
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileType = this.detectFileType(filePath, content);
      const functionsWithoutJSDoc = this.findFunctionsWithoutJSDoc(content);
      
      if (functionsWithoutJSDoc.length === 0) return;

      const fileResult = {
        path: filePath,
        type: fileType,
        functions: functionsWithoutJSDoc.map(func => {
          const template = this.generateTemplate(func, fileType, content);
          this.generatedTemplates++;
          return {
            ...func,
            template
          };
        })
      };

      this.processedFiles.push(fileResult);
    } catch (error) {
      console.warn(`⚠️  Erreur traitement fichier ${filePath}: ${error.message}`);
    }
  }

  /**
   * Détecte le type d'un fichier
   */
  detectFileType(filePath, content) {
    if (filePath.includes('/actions/') && content.includes('"use server"')) {
      return 'serverAction';
    } else if (filePath.includes('/components/') && content.includes('tsx')) {
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
   * Trouve les fonctions sans JSDoc dans un fichier
   */
  findFunctionsWithoutJSDoc(content) {
    const functions = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Détecter export function
      const exportMatch = line.match(/export\s+(async\s+)?function\s+(\w+)\s*\(/);
      if (exportMatch && !this.hasJSDocAbove(lines, i)) {
        functions.push({
          line: i + 1,
          name: exportMatch[2],
          type: 'function',
          isAsync: !!exportMatch[1],
          isExported: true,
          signature: this.extractFunctionSignature(lines, i)
        });
      }

      // Détecter export const arrow functions
      const constMatch = line.match(/export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/);
      if (constMatch && !this.hasJSDocAbove(lines, i)) {
        functions.push({
          line: i + 1,
          name: constMatch[1],
          type: 'arrow_function',
          isAsync: !!constMatch[2],
          isExported: true,
          signature: this.extractArrowFunctionSignature(lines, i)
        });
      }

      // Détecter fonctions internes importantes (non-exported mais publiques)
      const internalMatch = line.match(/^(async\s+)?function\s+(\w+)\s*\(/);
      if (internalMatch && !exportMatch && !this.hasJSDocAbove(lines, i)) {
        // Seulement si la fonction est utilisée ailleurs (heuristique simple)
        const functionName = internalMatch[2];
        const isUsedElsewhere = content.split('\n')
          .some((l, idx) => idx !== i && l.includes(functionName));
        
        if (isUsedElsewhere) {
          functions.push({
            line: i + 1,
            name: functionName,
            type: 'function',
            isAsync: !!internalMatch[1],
            isExported: false,
            signature: this.extractFunctionSignature(lines, i)
          });
        }
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
   * Extrait la signature d'une fonction
   */
  extractFunctionSignature(lines, startIndex) {
    let signature = '';
    let braceCount = 0;
    let foundOpening = false;
    
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 10); i++) {
      const line = lines[i];
      signature += line + '\n';
      
      if (line.includes('(')) foundOpening = true;
      if (line.includes('{')) braceCount++;
      
      if (foundOpening && line.includes(')') && (braceCount > 0 || line.includes('{'))) {
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
    
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 5); i++) {
      signature += lines[i] + '\n';
      if (lines[i].includes('=>')) break;
    }
    
    return signature.trim();
  }

  /**
   * Génère un template JSDoc pour une fonction
   */
  generateTemplate(func, fileType, fileContent) {
    const templateGenerator = this.templates[fileType] || this.templates.utility;
    return templateGenerator(func, fileContent);
  }

  /**
   * Template pour Server Actions
   */
  createServerActionTemplate(func, fileContent) {
    const params = this.extractParameters(func.signature);
    const isFormAction = params.some(p => p.type.includes('FormData'));
    const hasRedirect = fileContent.includes('redirect(');
    
    let template = `/**\n * ${this.generateDescription(func, 'serverAction')}\n *\n`;
    
    // Description détaillée pour Server Actions
    if (isFormAction) {
      template += ` * Cette Server Action traite les données de formulaire et effectue les validations.\n`;
    }
    if (hasRedirect) {
      template += ` * Redirige automatiquement après succès vers la page appropriée.\n`;
    }
    template += ` *\n`;

    // Paramètres
    params.forEach(param => {
      template += ` * @param ${param.name} ${param.description}\n`;
    });

    // Return
    const returnType = func.isAsync ? 'Promise<ActionResult<T>>' : 'ActionResult<T>';
    template += ` * @returns ${returnType} Résultat avec succès/erreur et données\n`;
    template += ` *\n`;

    // Throws
    template += ` * @throws {ValidationError} Si données invalides\n`;
    if (fileContent.includes('AuthenticationError')) {
      template += ` * @throws {AuthenticationError} Si utilisateur non authentifié\n`;
    }
    template += ` *\n`;

    // Exemple
    template += ` * @example\n`;
    template += ` * \`\`\`tsx\n`;
    if (isFormAction) {
      template += ` * // Dans un composant avec useActionState\n`;
      template += ` * const [state, ${func.name}] = useActionState(${func.name}, undefined);\n`;
      template += ` *\n`;
      template += ` * // Dans un formulaire\n`;
      template += ` * <form action={${func.name}}>\n`;
      template += ` *   <!-- champs du formulaire -->\n`;
      template += ` *   <button type="submit">Valider</button>\n`;
      template += ` * </form>\n`;
    } else {
      template += ` * const result = await ${func.name}(${params.map(p => p.example).join(', ')});\n`;
      template += ` * if (result.success) {\n`;
      template += ` *   // Traitement succès\n`;
      template += ` * }\n`;
    }
    template += ` * \`\`\`\n`;
    template += ` *\n`;

    // Tags spéciaux
    template += ` * @security RLS policies appliquées automatiquement\n`;
    template += ` * @performance Optimisé pour Edge Runtime\n`;
    template += ` */`;

    return template;
  }

  /**
   * Template pour Composants React
   */
  createComponentTemplate(func, fileContent) {
    const params = this.extractParameters(func.signature);
    const hasProps = params.some(p => p.name === 'props' || p.type.includes('Props'));
    
    let template = `/**\n * ${this.generateDescription(func, 'component')}\n *\n`;

    // Description composant
    if (hasProps) {
      template += ` * Composant React optimisé avec gestion d'état et accessibilité.\n *\n`;
    }

    // Props
    params.forEach(param => {
      template += ` * @param ${param.name} ${param.description}\n`;
    });

    // Exemple
    template += ` *\n * @example\n`;
    template += ` * \`\`\`tsx\n`;
    template += ` * <${func.name}`;
    params.forEach(param => {
      if (param.name !== 'children') {
        template += `\n *   ${param.name}={${param.example}}`;
      }
    });
    template += `\n * >\n`;
    if (params.some(p => p.name === 'children')) {
      template += ` *   <div>Contenu enfant</div>\n`;
    }
    template += ` * </${func.name}>\n`;
    template += ` * \`\`\`\n`;
    template += ` *\n`;

    // Tags spéciaux pour composants
    template += ` * @a11y Compatible lecteurs d'écran\n`;
    if (fileContent.includes('useState') || fileContent.includes('useEffect')) {
      template += ` * @performance Optimisé avec React hooks\n`;
    }
    
    template += ` */`;

    return template;
  }

  /**
   * Template pour fonctions utilitaires
   */
  createUtilityTemplate(func, fileContent) {
    const params = this.extractParameters(func.signature);
    
    let template = `/**\n * ${this.generateDescription(func, 'utility')}\n *\n`;

    // Paramètres
    params.forEach(param => {
      template += ` * @param ${param.name} ${param.description}\n`;
    });

    // Return
    const returnType = this.inferReturnType(func, fileContent);
    template += ` * @returns ${returnType} ${this.generateReturnDescription(func)}\n`;

    // Throws si applicable
    if (fileContent.includes('throw') || fileContent.includes('Error')) {
      template += ` *\n * @throws {Error} Si paramètres invalides\n`;
    }

    // Exemple
    template += ` *\n * @example\n`;
    template += ` * \`\`\`typescript\n`;
    template += ` * const result = ${func.name}(${params.map(p => p.example).join(', ')});\n`;
    template += ` * console.log(result); // ${this.generateExampleOutput(func)}\n`;
    template += ` * \`\`\`\n`;

    template += ` */`;

    return template;
  }

  /**
   * Template pour hooks React
   */
  createHookTemplate(func, fileContent) {
    const params = this.extractParameters(func.signature);
    
    let template = `/**\n * ${this.generateDescription(func, 'hook')}\n *\n`;
    template += ` * Hook React personnalisé pour la gestion d'état et d'effets.\n *\n`;

    // Paramètres
    params.forEach(param => {
      template += ` * @param ${param.name} ${param.description}\n`;
    });

    // Return
    template += ` * @returns Hook object avec état et fonctions de contrôle\n`;
    template += ` *\n`;

    // Exemple
    template += ` * @example\n`;
    template += ` * \`\`\`tsx\n`;
    template += ` * function MyComponent() {\n`;
    template += ` *   const { data, loading, error } = ${func.name}(${params.map(p => p.example).join(', ')});\n`;
    template += ` *\n`;
    template += ` *   if (loading) return <div>Chargement...</div>;\n`;
    template += ` *   if (error) return <div>Erreur: {error.message}</div>;\n`;
    template += ` *\n`;
    template += ` *   return <div>{/* Rendu avec data */}</div>;\n`;
    template += ` * }\n`;
    template += ` * \`\`\`\n`;
    template += ` *\n`;
    template += ` * @performance Optimisé avec useMemo et useCallback\n`;

    template += ` */`;

    return template;
  }

  /**
   * Template pour services
   */
  createServiceTemplate(func, fileContent) {
    const params = this.extractParameters(func.signature);
    
    let template = `/**\n * ${this.generateDescription(func, 'service')}\n *\n`;

    // Paramètres
    params.forEach(param => {
      template += ` * @param ${param.name} ${param.description}\n`;
    });

    // Return
    const returnType = this.inferReturnType(func, fileContent);
    template += ` * @returns ${returnType} ${this.generateReturnDescription(func)}\n`;

    // Throws
    template += ` *\n * @throws {Error} Si opération échoue\n`;

    // Exemple
    template += ` *\n * @example\n`;
    template += ` * \`\`\`typescript\n`;
    template += ` * try {\n`;
    template += ` *   const result = await ${func.name}(${params.map(p => p.example).join(', ')});\n`;
    template += ` *   console.log('Succès:', result);\n`;
    template += ` * } catch (error) {\n`;
    template += ` *   console.error('Erreur:', error.message);\n`;
    template += ` * }\n`;
    template += ` * \`\`\`\n`;

    template += ` */`;

    return template;
  }

  /**
   * Extrait les paramètres d'une signature de fonction
   */
  extractParameters(signature) {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    
    const params = match[1].split(',')
      .map(param => param.trim())
      .filter(param => param.length > 0)
      .map(param => {
        const nameMatch = param.match(/^(\w+)/);
        const typeMatch = param.match(/:\s*([^=]+?)(?:\s*=|$)/);
        
        const name = nameMatch ? nameMatch[1] : 'param';
        const type = typeMatch ? typeMatch[1].trim() : 'unknown';
        
        return {
          name,
          type,
          description: this.generateParamDescription(name, type),
          example: this.generateParamExample(name, type)
        };
      });
    
    return params;
  }

  /**
   * Génère une description pour un paramètre
   */
  generateParamDescription(name, type) {
    const descriptions = {
      'id': 'Identifiant unique',
      'email': 'Adresse email de l\'utilisateur',
      'password': 'Mot de passe',
      'data': 'Données à traiter',
      'formData': 'Données du formulaire',
      'prevState': 'État précédent de l\'action',
      'props': 'Propriétés du composant',
      'children': 'Éléments enfants du composant',
      'onSuccess': 'Callback en cas de succès',
      'onError': 'Callback en cas d\'erreur'
    };

    if (descriptions[name]) {
      return descriptions[name];
    }

    if (type.includes('string')) return 'Chaîne de caractères';
    if (type.includes('number')) return 'Valeur numérique';
    if (type.includes('boolean')) return 'Valeur booléenne';
    if (type.includes('Array')) return 'Tableau de données';
    if (type.includes('FormData')) return 'Données du formulaire HTML';
    if (type.includes('Props')) return 'Propriétés du composant';

    return `Paramètre ${name}`;
  }

  /**
   * Génère un exemple pour un paramètre
   */
  generateParamExample(name, type) {
    const examples = {
      'id': '"123"',
      'email': '"user@example.com"',
      'password': '"motdepasse123"',
      'data': '{ key: "value" }',
      'formData': 'new FormData()',
      'prevState': 'undefined',
      'props': '{ title: "Exemple" }',
      'children': '<span>Contenu</span>',
      'onSuccess': '() => console.log("Succès")',
      'onError': '(error) => console.error(error)'
    };

    if (examples[name]) {
      return examples[name];
    }

    if (type.includes('string')) return '"exemple"';
    if (type.includes('number')) return '42';
    if (type.includes('boolean')) return 'true';
    if (type.includes('Array')) return '[]';
    if (type.includes('FormData')) return 'formData';

    return 'value';
  }

  /**
   * Génère une description pour une fonction
   */
  generateDescription(func, type) {
    const patterns = {
      serverAction: [
        'Traite les données du formulaire et effectue les validations nécessaires',
        'Server Action pour la gestion des données utilisateur',
        'Action serveur sécurisée pour les opérations CRUD'
      ],
      component: [
        'Composant React réutilisable avec interface utilisateur optimisée',
        'Interface utilisateur interactive avec gestion d\'état',
        'Composant d\'affichage avec support accessibilité'
      ],
      utility: [
        'Fonction utilitaire pour le traitement de données',
        'Helper function pour les opérations communes',
        'Utilitaire de validation et transformation'
      ],
      hook: [
        'Hook React personnalisé pour la logique d\'état',
        'Hook de gestion d\'état et d\'effets de bord',
        'Custom hook pour la réutilisation de logique'
      ],
      service: [
        'Service pour la communication avec l\'API',
        'Couche de service pour la logique métier',
        'Service de gestion des données'
      ]
    };

    const typePatterns = patterns[type] || patterns.utility;
    const randomIndex = Math.floor(Math.random() * typePatterns.length);
    
    // Personnaliser selon le nom de la fonction
    let description = typePatterns[randomIndex];
    
    if (func.name.includes('create') || func.name.includes('add')) {
      description = description.replace('gestion', 'création');
    } else if (func.name.includes('update') || func.name.includes('edit')) {
      description = description.replace('gestion', 'mise à jour');
    } else if (func.name.includes('delete') || func.name.includes('remove')) {
      description = description.replace('gestion', 'suppression');
    }

    return description;
  }

  /**
   * Infère le type de retour d'une fonction
   */
  inferReturnType(func, fileContent) {
    if (func.isAsync) {
      if (fileContent.includes('ActionResult')) return 'Promise<ActionResult<T>>';
      if (fileContent.includes('redirect')) return 'Promise<never>';
      return 'Promise<T>';
    }

    if (fileContent.includes('ActionResult')) return 'ActionResult<T>';
    if (fileContent.includes('JSX.Element')) return 'JSX.Element';
    if (fileContent.includes('boolean')) return 'boolean';
    if (fileContent.includes('string')) return 'string';
    if (fileContent.includes('number')) return 'number';

    return 'T';
  }

  /**
   * Génère une description du retour
   */
  generateReturnDescription(func) {
    if (func.name.includes('validate')) return 'Résultat de la validation';
    if (func.name.includes('create')) return 'Données de l\'élément créé';
    if (func.name.includes('get') || func.name.includes('fetch')) return 'Données récupérées';
    if (func.name.includes('update')) return 'Données mises à jour';
    if (func.name.includes('delete')) return 'Confirmation de suppression';
    
    return 'Résultat de l\'opération';
  }

  /**
   * Génère un exemple de sortie
   */
  generateExampleOutput(func) {
    if (func.name.includes('validate')) return '{ valid: true, errors: [] }';
    if (func.name.includes('create')) return '{ id: "123", success: true }';
    if (func.name.includes('get')) return 'données récupérées';
    
    return 'résultat attendu';
  }

  /**
   * Génère le rapport final
   */
  generateReport(executionTime) {
    const totalFunctions = this.processedFiles.reduce((sum, file) => sum + file.functions.length, 0);
    
    const report = `# Rapport de Génération de Templates JSDoc

📊 **Généré le**: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}  
⏱️ **Temps d'exécution**: ${executionTime}ms

## Métriques

- **Fichiers traités**: ${this.processedFiles.length}
- **Fonctions sans JSDoc**: ${totalFunctions}
- **Templates générés**: ${this.generatedTemplates}

## Répartition par Type de Fichier

${this.generateFileTypeBreakdown()}

## Fichiers avec Templates Générés

${this.processedFiles.map(file => {
  return `### ${file.path} (${file.type})\n\n${file.functions.map(func => 
    `#### ${func.name} (ligne ${func.line})\n\n\`\`\`javascript\n${func.template}\n\`\`\``
  ).join('\n\n')}`;
}).join('\n\n')}

---
*Templates générés automatiquement par generate-jsdoc-templates.js*
`;

    const reportPath = './docs/JSDOC_TEMPLATES_REPORT.md';
    fs.writeFileSync(reportPath, report);
    
    console.log('📝 Templates générés avec succès !');
    console.log(`📄 Rapport: ${path.resolve(reportPath)}`);
    console.log(`\n📈 Résultats:`);
    console.log(`   • ${this.processedFiles.length} fichiers traités`);
    console.log(`   • ${totalFunctions} fonctions sans JSDoc détectées`);
    console.log(`   • ${this.generatedTemplates} templates générés`);
  }

  /**
   * Génère la répartition par type de fichier
   */
  generateFileTypeBreakdown() {
    const breakdown = {};
    
    this.processedFiles.forEach(file => {
      breakdown[file.type] = (breakdown[file.type] || 0) + file.functions.length;
    });

    return Object.entries(breakdown)
      .map(([type, count]) => `- **${type}**: ${count} fonctions`)
      .join('\n') || 'Aucun fichier traité.';
  }

  /**
   * Génère un script d'insertion automatique
   */
  generateInsertionScript() {
    const script = `#!/usr/bin/env node

/**
 * Script d'insertion automatique des templates JSDoc
 * Généré automatiquement par generate-jsdoc-templates.js
 */

const fs = require('fs');

const TEMPLATES_TO_INSERT = ${JSON.stringify(this.processedFiles, null, 2)};

console.log('📝 Insertion des templates JSDoc...');
console.log(\`📄 \${TEMPLATES_TO_INSERT.length} fichiers à traiter\`);

let insertedCount = 0;
let errorCount = 0;

TEMPLATES_TO_INSERT.forEach(file => {
  try {
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\\n');
    let modified = false;
    
    // Insérer les templates en ordre inverse pour préserver les numéros de ligne
    file.functions.reverse().forEach(func => {
      const insertLine = func.line - 1;
      
      // Vérifier que la fonction existe toujours à cette ligne
      if (lines[insertLine] && lines[insertLine].includes(func.name)) {
        // Insérer le template JSDoc avant la fonction
        const templateLines = func.template.split('\\n');
        lines.splice(insertLine, 0, ...templateLines);
        modified = true;
        insertedCount++;
        console.log(\`✅ \${func.name} dans \${file.path}\`);
      } else {
        console.warn(\`⚠️  Fonction \${func.name} modifiée dans \${file.path}, ignorée\`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(file.path, lines.join('\\n'));
    }
  } catch (error) {
    errorCount++;
    console.error(\`❌ Erreur \${file.path}: \${error.message}\`);
  }
});

console.log(\`\\n🎉 Insertion terminée !\`);
console.log(\`   • \${insertedCount} templates insérés\`);
console.log(\`   • \${errorCount} erreurs\`);
console.log(\`\\n⚠️  N'oubliez pas de :\`);
console.log(\`   1. Vérifier les changements: git diff\`);
console.log(\`   2. Ajuster les templates si nécessaire\`);
console.log(\`   3. Tester la compilation: npm run typecheck\`);
console.log(\`   4. Valider avec: node scripts/validate-jsdoc.js\`);
`;

    fs.writeFileSync('./scripts/insert-jsdoc-templates.js', script);
    console.log(`\n📝 Script d'insertion généré: ./scripts/insert-jsdoc-templates.js`);
  }
}

// Exécution du script
if (require.main === module) {
  const generator = new JSDocTemplateGenerator();
  
  const args = process.argv.slice(2);
  const srcPath = args.find(arg => !arg.startsWith('--')) || './src';
  
  generator.generateTemplates(srcPath);
}

module.exports = JSDocTemplateGenerator;