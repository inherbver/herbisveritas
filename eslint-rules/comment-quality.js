/**
 * Règles ESLint personnalisées pour la qualité des commentaires HerbisVeritas
 * 
 * Ces règles vérifient:
 * - JSDoc obligatoire sur les Server Actions
 * - Absence de commentaires évidents
 * - Format standardisé des TODO/FIXME
 * - Cohérence entre commentaires et code
 */

module.exports = {
  'require-server-action-jsdoc': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Server Actions doivent avoir une JSDoc complète',
        category: 'Documentation',
        recommended: true
      },
      fixable: 'code',
      schema: []
    },
    create(context) {
      return {
        FunctionDeclaration(node) {
          // Vérifier si c'est une Server Action
          if (this.isServerAction(node)) {
            const jsdoc = this.getJSDocComment(node, context);
            
            if (!jsdoc) {
              context.report({
                node,
                message: 'Server Action "{{ name }}" doit avoir une JSDoc',
                data: { name: node.id?.name || 'anonymous' },
                fix: (fixer) => this.generateJSDocFix(fixer, node)
              });
            } else if (!this.validateServerActionJSDoc(jsdoc)) {
              context.report({
                node,
                message: 'JSDoc de Server Action incomplète pour "{{ name }}"',
                data: { name: node.id?.name || 'anonymous' }
              });
            }
          }
        },

        ExportNamedDeclaration(node) {
          // Vérifier les exports de fonctions
          if (node.declaration?.type === 'FunctionDeclaration') {
            this.checkExportedFunction(node.declaration, context);
          }
        }
      };
    },

    // Méthodes utilitaires
    isServerAction(node) {
      return node.id?.name?.endsWith('Action') || 
             this.hasServerActionPattern(node);
    },

    hasServerActionPattern(node) {
      // Vérifier la signature typique d'une Server Action
      const params = node.params;
      if (params.length !== 2) return false;
      
      // Premier param: prevState
      const firstParam = params[0];
      if (firstParam.type === 'Identifier' && firstParam.name.includes('State')) {
        return true;
      }
      
      // Deuxième param: formData
      const secondParam = params[1];
      if (secondParam.type === 'Identifier' && secondParam.name === 'formData') {
        return true;
      }
      
      return false;
    },

    getJSDocComment(node, context) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);
      
      return comments.find(comment => 
        comment.type === 'Block' && comment.value.startsWith('*')
      );
    },

    validateServerActionJSDoc(jsdoc) {
      const content = jsdoc.value;
      const required = ['@param', '@returns', '@description'];
      
      return required.every(tag => content.includes(tag));
    },

    generateJSDocFix(fixer, node) {
      const functionName = node.id?.name || 'unknownAction';
      const template = this.generateJSDocTemplate(functionName);
      
      return fixer.insertTextBefore(node, template + '\n');
    },

    generateJSDocTemplate(functionName) {
      return `/**
 * Server Action: ${functionName}
 * 
 * @description [Décrire l'action et son impact métier]
 * @param {ActionResult<T> | undefined} prevState - État précédent de l'action
 * @param {FormData} formData - Données du formulaire
 * @returns {Promise<ActionResult<T>>} Résultat de l'action
 * 
 * @example
 * const result = await ${functionName}(undefined, formData);
 */`;
    },

    checkExportedFunction(node, context) {
      if (!this.getJSDocComment(node, context)) {
        context.report({
          node,
          message: 'Fonction exportée "{{ name }}" doit avoir une JSDoc',
          data: { name: node.id?.name || 'anonymous' }
        });
      }
    }
  },

  'no-obvious-comments': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Interdit les commentaires évidents qui répètent le code',
        category: 'Code Quality',
        recommended: true
      },
      fixable: 'code',
      schema: []
    },
    create(context) {
      const obviousPatterns = [
        /\/\/\s*Set\s+\w+/i,
        /\/\/\s*Get\s+\w+/i,
        /\/\/\s*Create\s+\w+/i,
        /\/\/\s*Initialize\s+\w+/i,
        /\/\/\s*Call\s+\w+/i,
        /\/\/\s*Return\s+\w+/i,
        /\/\/\s*Loop\s+(through|over)\s+\w+/i,
        /\/\*\*?\s*\d+\.\s+\w+/,  // "1. Something"
        /\/\/\s*TODO:\s*$/i,       // "TODO:" vide
        /\/\/\s*FIXME:\s*$/i       // "FIXME:" vide
      ];

      return {
        Program() {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            const text = comment.value.trim();
            
            obviousPatterns.forEach(pattern => {
              if (pattern.test(text)) {
                context.report({
                  node: comment,
                  message: 'Commentaire évident: "{{ text }}". Expliquer le POURQUOI, pas le QUOI.',
                  data: { text: text.substring(0, 50) },
                  fix: (fixer) => {
                    // Suggérer la suppression pour les commentaires vraiment évidents
                    if (this.isTrivialComment(text)) {
                      return fixer.remove(comment);
                    }
                    return null;
                  }
                });
              }
            });
          });
        }
      };
    },

    isTrivialComment(text) {
      const trivialPatterns = [
        /^Set\s+\w+$/i,
        /^Get\s+\w+$/i,
        /^TODO:\s*$/i,
        /^FIXME:\s*$/i
      ];

      return trivialPatterns.some(pattern => pattern.test(text));
    }
  },

  'standardize-todo-format': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Impose un format standardisé pour les TODO/FIXME',
        category: 'Documentation',
        recommended: true
      },
      fixable: 'code',
      schema: []
    },
    create(context) {
      const todoPattern = /\/\/\s*(TODO|FIXME)(?:\([^)]+\))?\s*:\s*(.*)/i;
      const validFormat = /\/\/\s*(TODO|FIXME)\([^)]+\)\s*:\s*.{10,}/;

      return {
        Program() {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            const text = comment.value.trim();
            const match = todoPattern.exec(text);

            if (match) {
              const [, type, description] = match;
              
              if (!validFormat.test(text)) {
                context.report({
                  node: comment,
                  message: '{{ type }} doit inclure un auteur et une description détaillée',
                  data: { type: type.toUpperCase() },
                  fix: (fixer) => {
                    const newFormat = this.formatTodoComment(type, description);
                    return fixer.replaceText(comment, newFormat);
                  }
                });
              }
            }
          });
        }
      };
    },

    formatTodoComment(type, description) {
      const author = process.env.USER || 'dev';
      const cleanDescription = description || 'À documenter';
      
      return `// ${type.toUpperCase()}(${author}): ${cleanDescription}
// Context: [Pourquoi c'est nécessaire]
// Priority: [HIGH/MEDIUM/LOW]`;
    }
  },

  'comment-code-consistency': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Vérifie la cohérence entre les commentaires et le code',
        category: 'Code Quality',
        recommended: true
      },
      schema: []
    },
    create(context) {
      return {
        VariableDeclaration(node) {
          this.checkVariableComments(node, context);
        },

        FunctionDeclaration(node) {
          this.checkFunctionComments(node, context);
        }
      };
    },

    checkVariableComments(node, context) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);
      
      comments.forEach(comment => {
        const text = comment.value.toLowerCase();
        
        // Vérifier les imports mentionnés dans les commentaires
        if (text.includes('import') && text.includes('from')) {
          const actualImports = this.extractImports(node);
          if (!this.commentMatchesImports(text, actualImports)) {
            context.report({
              node: comment,
              message: 'Commentaire d\'import obsolète ou incorrect'
            });
          }
        }
      });
    },

    checkFunctionComments(node, context) {
      const sourceCode = context.getSourceCode();
      const jsdoc = this.getJSDocComment(node, context);
      
      if (jsdoc) {
        // Vérifier que les paramètres JSDoc correspondent aux vrais paramètres
        const jsdocParams = this.extractJSDocParams(jsdoc.value);
        const actualParams = node.params.map(param => param.name);
        
        jsdocParams.forEach(jsdocParam => {
          if (!actualParams.includes(jsdocParam)) {
            context.report({
              node: jsdoc,
              message: 'Paramètre JSDoc "{{ param }}" n\'existe pas dans la fonction',
              data: { param: jsdocParam }
            });
          }
        });

        actualParams.forEach(actualParam => {
          if (!jsdocParams.includes(actualParam)) {
            context.report({
              node: jsdoc,
              message: 'Paramètre "{{ param }}" manquant dans la JSDoc',
              data: { param: actualParam }
            });
          }
        });
      }
    },

    getJSDocComment(node, context) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);
      
      return comments.find(comment => 
        comment.type === 'Block' && comment.value.startsWith('*')
      );
    },

    extractJSDocParams(jsdocText) {
      const paramRegex = /@param\s+\{[^}]+\}\s+(\w+)/g;
      const params = [];
      let match;
      
      while ((match = paramRegex.exec(jsdocText)) !== null) {
        params.push(match[1]);
      }
      
      return params;
    },

    extractImports(node) {
      // Simplification: extraire les noms d'imports depuis le code
      if (node.type === 'ImportDeclaration') {
        return node.specifiers.map(spec => spec.local.name);
      }
      return [];
    },

    commentMatchesImports(commentText, actualImports) {
      // Vérification basique de cohérence
      return actualImports.some(importName => 
        commentText.includes(importName.toLowerCase())
      );
    }
  },

  'security-comment-format': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Impose un format standardisé pour les commentaires de sécurité',
        category: 'Security',
        recommended: true
      },
      schema: []
    },
    create(context) {
      const securityKeywords = [
        'sécurité', 'security', 'auth', 'permission', 'role', 'admin',
        'csrf', 'xss', 'injection', 'sanitize', 'validate'
      ];

      return {
        Program() {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            const text = comment.value.toLowerCase();
            
            // Détecter les commentaires de sécurité
            if (securityKeywords.some(keyword => text.includes(keyword))) {
              if (!this.hasSecurityFormat(comment.value)) {
                context.report({
                  node: comment,
                  message: 'Commentaire de sécurité doit suivre le format standardisé',
                  fix: (fixer) => {
                    const formatted = this.formatSecurityComment(comment.value);
                    return fixer.replaceText(comment, formatted);
                  }
                });
              }
            }
          });
        }
      };
    },

    hasSecurityFormat(text) {
      return text.includes('@security-context') || 
             text.includes('SÉCURITÉ:') ||
             text.includes('SECURITY:');
    },

    formatSecurityComment(originalText) {
      return `/**
 * SÉCURITÉ: ${originalText.trim()}
 * 
 * @security-context [Contexte où le risque apparaît]
 * @mitigation [Mesures de protection mises en place]
 * @verification [Comment vérifier que la protection fonctionne]
 */`;
    }
  }
};

// Export pour utilisation dans eslint.config.js
module.exports.rules = module.exports;