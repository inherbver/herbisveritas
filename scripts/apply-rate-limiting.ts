#!/usr/bin/env tsx

/**
 * Script d'Application Automatique du Rate Limiting
 * 
 * OBJECTIF: Appliquer le décorateur @withRateLimit aux Server Actions critiques
 * CRITICITÉ: HAUTE - Vulnérabilité de sécurité critique
 * 
 * Fonctionnalités:
 * - Scan automatique des Server Actions
 * - Application du rate limiting par catégorie
 * - Validation de l'application
 * - Rapport de couverture
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

interface ServerAction {
  filePath: string;
  functionName: string;
  category: 'AUTH' | 'PAYMENT' | 'ADMIN' | 'CART' | 'CONTENT' | 'DEFAULT';
  hasRateLimit: boolean;
  lineNumber: number;
}

interface RateLimitingReport {
  totalActions: number;
  protectedActions: number;
  unprotectedActions: ServerAction[];
  appliedActions: ServerAction[];
  errors: string[];
}

class RateLimitingApplicator {
  private actionsDir: string;
  private actions: ServerAction[] = [];
  private errors: string[] = [];

  constructor() {
    this.actionsDir = join(process.cwd(), 'src/actions');
  }

  /**
   * Scan et application du rate limiting
   */
  async applyRateLimiting(): Promise<RateLimitingReport> {
    console.log('🔍 Scan des Server Actions...');
    
    // 1. Scanner les actions
    await this.scanServerActions();
    
    // 2. Appliquer le rate limiting
    const appliedActions = await this.applyRateLimitingToActions();
    
    // 3. Générer le rapport
    const report = this.generateReport(appliedActions);
    
    return report;
  }

  /**
   * Scan récursif des fichiers d'actions
   */
  private async scanServerActions(): Promise<void> {
    if (!existsSync(this.actionsDir)) {
      this.errors.push(`Dossier actions non trouvé: ${this.actionsDir}`);
      return;
    }

    const files = this.scanDirectory(this.actionsDir);
    
    for (const filePath of files) {
      if (extname(filePath) === '.ts' && !filePath.includes('.test.')) {
        await this.scanFileForActions(filePath);
      }
    }

    console.log(`✅ Scan terminé: ${this.actions.length} actions trouvées`);
  }

  /**
   * Scan récursif des dossiers
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.scanDirectory(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      this.errors.push(`Erreur scan dossier ${dir}: ${error}`);
    }
    
    return files;
  }

  /**
   * Scan d'un fichier pour trouver les Server Actions
   */
  private async scanFileForActions(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // Vérifier si c'est un fichier Server Actions
      if (!content.includes('"use server"')) {
        return;
      }

      // Chercher les exports de fonctions
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Patterns pour détecter les Server Actions
        const exportPatterns = [
          /export\s+async\s+function\s+(\w+)/,
          /export\s+const\s+(\w+)\s*=.*async\s+function/,
          /export\s+const\s+(\w+)\s*=.*withRateLimit/
        ];

        for (const pattern of exportPatterns) {
          const match = line.match(pattern);
          if (match) {
            const functionName = match[1];
            const category = this.categorizeAction(functionName, filePath);
            const hasRateLimit = content.includes('withRateLimit') && 
                                 content.includes(functionName);

            this.actions.push({
              filePath,
              functionName,
              category,
              hasRateLimit,
              lineNumber: i + 1
            });
            break;
          }
        }
      }

    } catch (error) {
      this.errors.push(`Erreur scan fichier ${filePath}: ${error}`);
    }
  }

  /**
   * Catégorise une action selon son nom et fichier
   */
  private categorizeAction(functionName: string, filePath: string): ServerAction['category'] {
    const fileName = filePath.toLowerCase();
    const actionName = functionName.toLowerCase();

    // Actions d'authentification
    if (fileName.includes('auth') || 
        ['login', 'signup', 'logout', 'resetpassword', 'forgotpassword'].some(auth => actionName.includes(auth))) {
      return 'AUTH';
    }

    // Actions de paiement
    if (fileName.includes('stripe') || fileName.includes('payment') ||
        ['checkout', 'payment', 'stripe'].some(payment => actionName.includes(payment))) {
      return 'PAYMENT';
    }

    // Actions d'administration
    if (fileName.includes('admin') || 
        ['setuserrole', 'deleteuser', 'admin'].some(admin => actionName.includes(admin))) {
      return 'ADMIN';
    }

    // Actions de panier
    if (fileName.includes('cart') ||
        ['additem', 'removeitem', 'updatequantity', 'cart'].some(cart => actionName.includes(cart))) {
      return 'CART';
    }

    // Actions de contenu
    if (['create', 'update', 'delete', 'upload', 'publish'].some(content => actionName.includes(content))) {
      return 'CONTENT';
    }

    return 'DEFAULT';
  }

  /**
   * Applique le rate limiting aux actions non protégées
   */
  private async applyRateLimitingToActions(): Promise<ServerAction[]> {
    const appliedActions: ServerAction[] = [];
    const unprotectedActions = this.actions.filter(action => !action.hasRateLimit);

    console.log(`🛡️  Application du rate limiting à ${unprotectedActions.length} actions...`);

    for (const action of unprotectedActions) {
      try {
        const success = await this.applyRateLimitingToFile(action);
        if (success) {
          appliedActions.push(action);
          action.hasRateLimit = true;
        }
      } catch (error) {
        this.errors.push(`Erreur application rate limiting ${action.functionName}: ${error}`);
      }
    }

    return appliedActions;
  }

  /**
   * Applique le rate limiting à un fichier spécifique
   */
  private async applyRateLimitingToFile(action: ServerAction): Promise<boolean> {
    try {
      let content = readFileSync(action.filePath, 'utf8');
      
      // 1. Ajouter l'import si nécessaire
      if (!content.includes('withRateLimit')) {
        const importLine = '\n// SÉCURITÉ: Rate limiting pour Server Actions\nimport { withRateLimit } from "@/lib/security/rate-limit-decorator";';
        
        // Trouver la position après les imports existants
        const lines = content.split('\n');
        let insertPos = 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('import ') || lines[i].includes('from ')) {
            insertPos = i + 1;
          } else if (lines[i].trim() === '') {
            continue;
          } else {
            break;
          }
        }
        
        lines.splice(insertPos, 0, ...importLine.split('\n'));
        content = lines.join('\n');
      }

      // 2. Modifier la déclaration de fonction
      const functionPatterns = [
        {
          pattern: new RegExp(`export\\s+async\\s+function\\s+${action.functionName}\\s*\\(`),
          replacement: `export const ${action.functionName} = withRateLimit(\n  '${action.category}',\n  '${this.kebabCase(action.functionName)}'\n)(async function ${action.functionName}(`
        },
        {
          pattern: new RegExp(`export\\s+const\\s+${action.functionName}\\s*=\\s*async\\s+function`),
          replacement: `export const ${action.functionName} = withRateLimit(\n  '${action.category}',\n  '${this.kebabCase(action.functionName)}'\n)(async function`
        }
      ];

      let modified = false;
      for (const { pattern, replacement } of functionPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          modified = true;
          break;
        }
      }

      if (!modified) {
        return false;
      }

      // 3. Ajouter la parenthèse fermante
      // Trouver la fin de la fonction et ajouter ); 
      const functionEndPattern = new RegExp(`(}\\s*$)(?=[^}]*$)`, 'm');
      if (functionEndPattern.test(content)) {
        content = content.replace(functionEndPattern, '});');
      }

      // 4. Écrire le fichier modifié
      writeFileSync(action.filePath, content);
      
      console.log(`✅ Rate limiting appliqué: ${action.functionName} (${action.category})`);
      return true;

    } catch (error) {
      console.error(`❌ Erreur modification ${action.functionName}:`, error);
      return false;
    }
  }

  /**
   * Convertit un nom en kebab-case
   */
  private kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/action$/i, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Génère le rapport final
   */
  private generateReport(appliedActions: ServerAction[]): RateLimitingReport {
    const protectedActions = this.actions.filter(action => action.hasRateLimit);
    const unprotectedActions = this.actions.filter(action => !action.hasRateLimit);

    return {
      totalActions: this.actions.length,
      protectedActions: protectedActions.length,
      unprotectedActions,
      appliedActions,
      errors: this.errors
    };
  }
}

/**
 * Utilitaires de validation
 */
export class RateLimitingValidator {
  /**
   * Valide que le rate limiting est correctement appliqué
   */
  static async validateRateLimiting(): Promise<{
    valid: boolean;
    coverage: number;
    issues: string[];
  }> {
    const applicator = new RateLimitingApplicator();
    await applicator.scanServerActions();

    const actions = (applicator as any).actions as ServerAction[];
    const protectedActions = actions.filter(action => action.hasRateLimit);
    const coverage = actions.length > 0 ? (protectedActions.length / actions.length) * 100 : 0;
    
    const issues: string[] = [];
    
    // Vérifier la couverture minimale
    if (coverage < 80) {
      issues.push(`Couverture insuffisante: ${coverage.toFixed(1)}% (minimum 80%)`);
    }

    // Vérifier les actions critiques
    const criticalActions = actions.filter(action => 
      ['AUTH', 'PAYMENT', 'ADMIN'].includes(action.category)
    );
    const unprotectedCritical = criticalActions.filter(action => !action.hasRateLimit);
    
    if (unprotectedCritical.length > 0) {
      issues.push(`Actions critiques non protégées: ${unprotectedCritical.map(a => a.functionName).join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      coverage,
      issues
    };
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🛡️  Application du Rate Limiting aux Server Actions');
    console.log('='.repeat(60));

    const applicator = new RateLimitingApplicator();
    const report = await applicator.applyRateLimiting();

    // Afficher le rapport
    console.log('\n📊 RAPPORT DE COUVERTURE');
    console.log('='.repeat(30));
    console.log(`Total actions: ${report.totalActions}`);
    console.log(`Actions protégées: ${report.protectedActions}`);
    console.log(`Actions appliquées: ${report.appliedActions.length}`);
    console.log(`Couverture: ${((report.protectedActions / report.totalActions) * 100).toFixed(1)}%`);

    if (report.appliedActions.length > 0) {
      console.log('\n✅ Actions mises à jour:');
      report.appliedActions.forEach(action => {
        console.log(`  - ${action.functionName} (${action.category})`);
      });
    }

    if (report.unprotectedActions.length > 0) {
      console.log('\n⚠️  Actions non protégées:');
      report.unprotectedActions.forEach(action => {
        console.log(`  - ${action.functionName} (${action.category}) - ${action.filePath}`);
      });
    }

    if (report.errors.length > 0) {
      console.log('\n❌ Erreurs:');
      report.errors.forEach(error => console.log(`  - ${error}`));
    }

    // Validation finale
    console.log('\n🔍 Validation finale...');
    const validation = await RateLimitingValidator.validateRateLimiting();
    
    if (validation.valid) {
      console.log('✅ Validation réussie!');
      console.log(`📊 Couverture finale: ${validation.coverage.toFixed(1)}%`);
      process.exit(0);
    } else {
      console.log('❌ Validation échouée:');
      validation.issues.forEach(issue => console.log(`  - ${issue}`));
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter si lancé directement
if (require.main === module) {
  main();
}

export { RateLimitingApplicator, RateLimitingValidator };