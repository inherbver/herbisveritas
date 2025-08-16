/**
 * Règles ESLint personnalisées pour la modernisation HerbisVeritas
 * Détecte et prévient les patterns de duplication identifiés
 */

module.exports = {
  'no-duplicate-password-validation': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Interdire la duplication des règles de validation de mot de passe',
        category: 'Best Practices',
        recommended: true
      },
      fixable: 'code',
      schema: []
    },
    create(context) {
      const duplicatePatterns = [
        /const\s+MIN_LENGTH\s*=\s*8/,
        /\/\[A-Z\]\//,
        /\/\[0-9\]\//,
        /\/\[\^A-Za-z0-9\]\//
      ];

      return {
        VariableDeclarator(node) {
          if (node.init && node.init.type === 'Literal') {
            const code = context.getSourceCode().getText(node);
            
            if (duplicatePatterns.some(pattern => pattern.test(code))) {
              context.report({
                node,
                message: 'Utiliser les règles centralisées de src/lib/validators/password-rules.ts',
                fix(fixer) {
                  return fixer.replaceText(node, 'PasswordRules.MIN_LENGTH');
                }
              });
            }
          }
        }
      };
    }
  },

  'no-duplicate-error-handling': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Interdire la duplication de la gestion d\'erreur dans les actions',
        category: 'Best Practices',
        recommended: true
      },
      schema: []
    },
    create(context) {
      return {
        TryStatement(node) {
          const code = context.getSourceCode().getText(node);
          
          if (code.includes('createSupabaseServerClient') && 
              code.includes('console.error("Error in action"')) {
            context.report({
              node,
              message: 'Utiliser withErrorHandling() de src/lib/actions/action-wrapper.ts'
            });
          }
        }
      };
    }
  },

  'max-component-complexity': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Limiter la complexité des composants React',
        category: 'Best Practices',
        recommended: true
      },
      schema: [
        {
          type: 'object',
          properties: {
            max: {
              type: 'integer',
              minimum: 50
            }
          },
          additionalProperties: false
        }
      ]
    },
    create(context) {
      const options = context.options[0] || {};
      const maxLines = options.max || 200;

      return {
        Program(node) {
          const sourceCode = context.getSourceCode();
          const lines = sourceCode.lines.length;
          
          // Vérifie si c'est un composant React
          const text = sourceCode.getText();
          const isReactComponent = /export\s+(?:default\s+)?(?:function|const)\s+[A-Z]\w*/.test(text) ||
                                  /\.tsx$/.test(context.getFilename());
          
          if (isReactComponent && lines > maxLines) {
            context.report({
              node,
              message: `Composant trop complexe (${lines} lignes > ${maxLines}). Considérer la décomposition.`
            });
          }
        }
      };
    }
  },

  'prefer-custom-hooks': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Encourager l\'utilisation de hooks personnalisés pour la logique complexe',
        category: 'Best Practices',
        recommended: false
      },
      schema: []
    },
    create(context) {
      let hookCount = 0;
      let stateCount = 0;

      return {
        CallExpression(node) {
          if (node.callee.name && node.callee.name.startsWith('use')) {
            hookCount++;
            
            if (node.callee.name === 'useState') {
              stateCount++;
            }
          }
        },
        'Program:exit'() {
          if (hookCount > 8 || stateCount > 5) {
            context.report({
              node: context.getSourceCode().ast,
              message: `Logique d'état complexe détectée (${hookCount} hooks, ${stateCount} states). Extraire en hook personnalisé.`
            });
          }
        }
      };
    }
  },

  'no-hardcoded-validation': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Interdire les règles de validation hardcodées',
        category: 'Best Practices',
        recommended: true
      },
      schema: []
    },
    create(context) {
      const hardcodedPatterns = [
        /minLength:\s*8/,
        /maxLength:\s*99/,
        /required:\s*true/,
        /"Le mot de passe doit"/,
        /"Password must"/
      ];

      return {
        Property(node) {
          if (node.value && node.value.type === 'Literal') {
            const code = context.getSourceCode().getText(node);
            
            if (hardcodedPatterns.some(pattern => pattern.test(code))) {
              context.report({
                node,
                message: 'Utiliser les validateurs centralisés au lieu de règles hardcodées'
              });
            }
          }
        }
      };
    }
  },

  'prefer-server-components': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Encourager l\'utilisation de Server Components quand possible',
        category: 'Performance',
        recommended: false
      },
      schema: []
    },
    create(context) {
      let hasClientDirective = false;
      let hasInteractivity = false;

      return {
        Program(node) {
          const sourceCode = context.getSourceCode();
          const text = sourceCode.getText();
          
          hasClientDirective = text.includes("'use client'");
        },
        CallExpression(node) {
          // Détecte les patterns d'interactivité
          if (node.callee.name && 
              ['useState', 'useEffect', 'onClick', 'onChange'].some(pattern => 
                context.getSourceCode().getText(node).includes(pattern)
              )) {
            hasInteractivity = true;
          }
        },
        'Program:exit'() {
          if (!hasClientDirective && hasInteractivity) {
            context.report({
              node: context.getSourceCode().ast,
              message: 'Composant avec interactivité sans "use client". Ajouter la directive ou extraire la logique.'
            });
          }
        }
      };
    }
  }
};