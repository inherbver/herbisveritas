/**
 * Rules ESLint personnalisées pour la validation des commentaires HerbisVeritas
 * 
 * Ces règles s'intègrent dans la configuration ESLint existante pour
 * automatiser la validation de la qualité des commentaires.
 */

module.exports = {
  'no-obvious-comments': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Interdit les commentaires évidents qui n\'ajoutent pas de valeur',
        category: 'Stylistic Issues',
        recommended: true
      },
      fixable: 'code',
      schema: []
    },
    create(context) {
      const obviousPatterns = [
        /\/\/ Importe? .*/,
        /\/\/ Déclaration? .*/,
        /\/\/ Fonction .*/,
        /\/\/ Constante? .*/,
        /\/\/ Variable? .*/,
        /\/\/ Return .*/,
        /\/\/ Set .*/,
        /\/\/ Get .*/,
        /\/\/ Create .*/,
        /\/\/ Initialize? .*/,
        /\/\/ Export .*/
      ];

      return {
        Program(node) {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            if (comment.type === 'Line') {
              const commentText = comment.value.trim();
              
              for (const pattern of obviousPatterns) {
                if (pattern.test('//' + commentText)) {
                  context.report({
                    node: comment,
                    message: 'Commentaire évident qui n\'ajoute pas de valeur contextuelle',
                    fix(fixer) {
                      // Supprimer le commentaire et la ligne si elle ne contient que le commentaire
                      const line = sourceCode.lines[comment.loc.start.line - 1];
                      if (line.trim() === comment.raw.trim()) {
                        return fixer.removeRange([
                          sourceCode.getIndexFromLoc({ line: comment.loc.start.line - 1, column: 0 }),
                          sourceCode.getIndexFromLoc({ line: comment.loc.start.line, column: 0 })
                        ]);
                      }
                      return fixer.remove(comment);
                    }
                  });
                  break;
                }
              }
            }
          });
        }
      };
    }
  },

  'require-jsdoc': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Exige une JSDoc pour les fonctions publiques exportées',
        category: 'Best Practices',
        recommended: true
      },
      schema: [
        {
          type: 'object',
          properties: {
            require: {
              type: 'object',
              properties: {
                FunctionDeclaration: { type: 'boolean' },
                MethodDefinition: { type: 'boolean' },
                ClassDeclaration: { type: 'boolean' },
                ArrowFunctionExpression: { type: 'boolean' },
                FunctionExpression: { type: 'boolean' }
              },
              default: {
                FunctionDeclaration: true,
                ArrowFunctionExpression: true
              }
            }
          }
        }
      ]
    },
    create(context) {
      const options = context.options[0] || {};
      const require = Object.assign({
        FunctionDeclaration: true,
        ArrowFunctionExpression: true
      }, options.require || {});

      function checkJSDoc(node) {
        const sourceCode = context.getSourceCode();
        const comment = sourceCode.getJSDocComment(node);

        if (!comment) {
          // Vérifier si la fonction est exportée
          const parent = node.parent;
          const isExported = (
            parent &&
            parent.type === 'ExportDefaultDeclaration' ||
            parent.type === 'ExportNamedDeclaration' ||
            (parent.type === 'VariableDeclarator' && 
             parent.parent && 
             parent.parent.parent && 
             parent.parent.parent.type === 'ExportNamedDeclaration')
          );

          if (isExported) {
            context.report({
              node,
              message: 'Fonction exportée manque de documentation JSDoc'
            });
          }
        }
      }

      return {
        FunctionDeclaration(node) {
          if (require.FunctionDeclaration) {
            checkJSDoc(node);
          }
        },
        ArrowFunctionExpression(node) {
          if (require.ArrowFunctionExpression) {
            checkJSDoc(node);
          }
        }
      };
    }
  },

  'validate-jsdoc-examples': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Valide que les exemples JSDoc sont syntaxiquement corrects',
        category: 'Possible Errors',
        recommended: false
      },
      schema: []
    },
    create(context) {
      function validateCodeBlock(code) {
        try {
          // Vérifications basiques de syntaxe
          const hasMatchingBraces = (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length;
          const hasMatchingParens = (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length;
          const hasMatchingBrackets = (code.match(/\[/g) || []).length === (code.match(/\]/g) || []).length;
          
          return hasMatchingBraces && hasMatchingParens && hasMatchingBrackets;
        } catch {
          return false;
        }
      }

      return {
        Program(node) {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            if (comment.type === 'Block' && comment.value.includes('@example')) {
              const commentText = comment.value;
              const codeBlocks = commentText.match(/```[\w]*\n([\s\S]*?)\n```/g);
              
              if (codeBlocks) {
                codeBlocks.forEach((block, index) => {
                  const code = block.replace(/```[\w]*\n/, '').replace(/\n```/, '');
                  
                  if (!validateCodeBlock(code)) {
                    context.report({
                      node: comment,
                      message: `Exemple JSDoc ${index + 1} contient une syntaxe invalide`
                    });
                  }
                });
              }
            }
          });
        }
      };
    }
  },

  'consistent-comment-format': {
    meta: {
      type: 'layout',
      docs: {
        description: 'Assure la cohérence du format des commentaires spéciaux',
        category: 'Stylistic Issues',
        recommended: true
      },
      fixable: 'whitespace',
      schema: []
    },
    create(context) {
      const specialCommentPatterns = {
        'TODO': /^\/\/ TODO:? (.+)$/,
        'FIXME': /^\/\/ FIXME:? (.+)$/,
        'HACK': /^\/\/ HACK:? (.+)$/,
        'SECURITY': /^\/\/ SECURITY:? (.+)$/,
        'PERF': /^\/\/ PERF:? (.+)$/
      };

      const correctFormats = {
        'TODO': '// TODO: [PRIORITY] [DATE] Description',
        'FIXME': '// FIXME: [PRIORITY] [DATE] Description', 
        'HACK': '// HACK: [PRIORITY] Description',
        'SECURITY': '// SECURITY: Description',
        'PERF': '// PERF: Description'
      };

      return {
        Program(node) {
          const sourceCode = context.getSourceCode();
          const comments = sourceCode.getAllComments();

          comments.forEach(comment => {
            if (comment.type === 'Line') {
              const commentText = comment.value.trim();
              const fullComment = '//' + commentText;

              Object.entries(specialCommentPatterns).forEach(([type, pattern]) => {
                if (fullComment.toUpperCase().includes(type + ':') || 
                    fullComment.toUpperCase().includes(type + ' ')) {
                  
                  // Vérifier le format
                  if (!pattern.test(fullComment)) {
                    context.report({
                      node: comment,
                      message: `Format de commentaire ${type} incohérent. Format attendu: ${correctFormats[type]}`,
                      fix(fixer) {
                        // Proposer une correction basique
                        const corrected = fullComment.replace(
                          new RegExp(`${type}:?\\s*`, 'i'),
                          `${type}: `
                        );
                        return fixer.replaceText(comment, corrected);
                      }
                    });
                  }

                  // Vérifications spécifiques pour TODO/FIXME
                  if ((type === 'TODO' || type === 'FIXME') && fullComment.includes(type + ':')) {
                    const hasDate = /\d{4}-\d{2}-\d{2}/.test(fullComment);
                    const hasPriority = /(HIGH|MED|LOW|URGENT|CRITIQUE)/i.test(fullComment);
                    
                    if (!hasDate) {
                      context.report({
                        node: comment,
                        message: `${type} manque de date (format: YYYY-MM-DD)`
                      });
                    }
                    
                    if (!hasPriority) {
                      context.report({
                        node: comment,
                        message: `${type} manque de priorité (HIGH, MED, LOW)`
                      });
                    }
                  }
                }
              });
            }
          });
        }
      };
    }
  },

  'require-server-action-jsdoc': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Exige une JSDoc complète pour les Server Actions avec tags spécifiques',
        category: 'Best Practices',
        recommended: true
      },
      schema: []
    },
    create(context) {
      function isServerActionFile() {
        const filename = context.getFilename();
        const sourceCode = context.getSourceCode();
        const text = sourceCode.getText();
        
        return filename.includes('/actions/') && text.includes('"use server"');
      }

      function validateServerActionJSDoc(node, comment) {
        const commentText = comment.value;
        const requiredTags = ['@param', '@returns', '@throws'];
        const recommendedTags = ['@example', '@security'];
        
        const missingRequired = requiredTags.filter(tag => 
          !commentText.includes(tag)
        );
        
        const missingRecommended = recommendedTags.filter(tag => 
          !commentText.includes(tag)
        );

        if (missingRequired.length > 0) {
          context.report({
            node,
            message: `Server Action manque de tags JSDoc requis: ${missingRequired.join(', ')}`
          });
        }

        if (missingRecommended.length > 0) {
          context.report({
            node,
            message: `Server Action manque de tags JSDoc recommandés: ${missingRecommended.join(', ')}`
          });
        }

        // Vérifier la description
        const descriptionMatch = commentText.match(/\*\s*([^@\n]+)/);
        if (!descriptionMatch || descriptionMatch[1].trim().length < 20) {
          context.report({
            node,
            message: 'Server Action nécessite une description JSDoc détaillée (minimum 20 caractères)'
          });
        }
      }

      return {
        FunctionDeclaration(node) {
          if (!isServerActionFile()) return;

          const sourceCode = context.getSourceCode();
          const comment = sourceCode.getJSDocComment(node);

          if (!comment) {
            context.report({
              node,
              message: 'Server Action doit avoir une JSDoc complète'
            });
          } else {
            validateServerActionJSDoc(node, comment);
          }
        },
        
        ExportNamedDeclaration(node) {
          if (!isServerActionFile()) return;
          
          if (node.declaration && node.declaration.type === 'FunctionDeclaration') {
            const sourceCode = context.getSourceCode();
            const comment = sourceCode.getJSDocComment(node.declaration);

            if (!comment) {
              context.report({
                node: node.declaration,
                message: 'Server Action exportée doit avoir une JSDoc complète'
              });
            } else {
              validateServerActionJSDoc(node.declaration, comment);
            }
          }
        }
      };
    }
  }
};

/**
 * Configuration ESLint recommandée pour HerbisVeritas
 * À ajouter dans .eslintrc.js
 */
const recommendedConfig = {
  plugins: ['herbisveritas-comments'],
  rules: {
    'herbisveritas-comments/no-obvious-comments': 'error',
    'herbisveritas-comments/require-jsdoc': 'error',
    'herbisveritas-comments/validate-jsdoc-examples': 'warn',
    'herbisveritas-comments/consistent-comment-format': 'error'
  },
  overrides: [
    {
      files: ['src/actions/*.ts'],
      rules: {
        'herbisveritas-comments/require-server-action-jsdoc': 'error'
      }
    },
    {
      files: ['src/components/**/*.tsx'],
      rules: {
        'herbisveritas-comments/require-jsdoc': ['error', {
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: false // Components peuvent être plus flexibles
          }
        }]
      }
    }
  ]
};

module.exports.recommendedConfig = recommendedConfig;