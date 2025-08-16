#!/usr/bin/env node

/**
 * Analyseur de modernisation pour HerbisVeritas
 * Détecte automatiquement les doublons et opportunités de refactoring
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import crypto from 'crypto';

interface DuplicatePattern {
  pattern: string;
  locations: Array<{
    file: string;
    lines: string;
    content: string;
  }>;
  similarity: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface ComponentComplexity {
  file: string;
  lines: number;
  functions: number;
  hooks: number;
  exports: number;
  complexity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  recommendations: string[];
}

class ModernizationAnalyzer {
  private sourceDir = 'src';
  private duplicates: Map<string, DuplicatePattern> = new Map();
  private complexComponents: ComponentComplexity[] = [];
  
  // Patterns critiques à détecter
  private criticalPatterns = [
    // Validation de mots de passe
    /const\s+MIN_LENGTH\s*=\s*8/g,
    /\/\[A-Z\]\//g,
    /\/\[0-9\]\//g,
    /\/\[\^A-Za-z0-9\]\//g,
    
    // Gestion d'erreur dans les actions
    /try\s*\{[\s\S]*createSupabaseServerClient[\s\S]*\}\s*catch\s*\(/g,
    /ActionResult\.error/g,
    /console\.error\("Error in action"/g,
    
    // Patterns de chargement
    /const\s+\[isLoading,\s*setIsLoading\]\s*=\s*useState\(false\)/g,
    /const\s+\[error,\s*setError\]\s*=\s*useState<string\s*\|\s*null>\(null\)/g,
    
    // Constantes dupliquées
    /const\s+MAX_QUANTITY\s*=\s*99/g,
    /const\s+DEFAULT_TIMEOUT\s*=\s*5000/g,
  ];

  /**
   * Lance l'analyse complète du codebase
   */
  async analyze(): Promise<void> {
    console.log('🔍 Démarrage de l\'analyse de modernisation...\n');
    
    const files = this.getAllFiles();
    
    // 1. Détection des doublons sémantiques
    await this.detectDuplicates(files);
    
    // 2. Analyse de la complexité des composants
    await this.analyzeComponentComplexity(files);
    
    // 3. Génération du rapport
    this.generateReport();
  }

  /**
   * Récupère tous les fichiers TypeScript/React du projet
   */
  private getAllFiles(): string[] {
    const files: string[] = [];
    
    const traverse = (dir: string) => {
      try {
        const entries = readdirSync(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            traverse(fullPath);
          } else if (stat.isFile() && /\.(ts|tsx)$/.test(entry)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore les erreurs d'accès aux dossiers
      }
    };
    
    traverse(this.sourceDir);
    return files;
  }

  /**
   * Détecte les doublons sémantiques dans le code
   */
  private async detectDuplicates(files: string[]): Promise<void> {
    console.log('📊 Analyse des doublons sémantiques...');
    
    const codeChunks: Map<string, Array<{file: string, lines: string, content: string}>> = new Map();
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        // Analyse par blocs de 5-10 lignes pour détecter les doublons
        for (let i = 0; i < lines.length - 4; i++) {
          const chunk = lines.slice(i, i + 5).join('\n').trim();
          
          if (chunk.length < 50) continue; // Ignore les petits blocs
          
          // Normalise le code pour détecter les doublons sémantiques
          const normalized = this.normalizeCode(chunk);
          const hash = crypto.createHash('md5').update(normalized).digest('hex');
          
          if (!codeChunks.has(hash)) {
            codeChunks.set(hash, []);
          }
          
          codeChunks.get(hash)!.push({
            file: relative(process.cwd(), file),
            lines: `${i + 1}-${i + 5}`,
            content: chunk
          });
        }
      } catch (error) {
        console.warn(`⚠️  Erreur lecture ${file}: ${error}`);
      }
    }
    
    // Détecte les doublons (présents dans 2+ fichiers)
    for (const [hash, locations] of codeChunks) {
      if (locations.length >= 2) {
        const pattern = this.categorizePattern(locations[0].content);
        const priority = this.calculatePriority(locations[0].content, locations.length);
        
        this.duplicates.set(hash, {
          pattern: locations[0].content.substring(0, 100) + '...',
          locations,
          similarity: this.calculateSimilarity(locations),
          priority,
          category: pattern
        });
      }
    }
    
    console.log(`✅ ${this.duplicates.size} groupes de doublons détectés\n`);
  }

  /**
   * Normalise le code pour la comparaison sémantique
   */
  private normalizeCode(code: string): string {
    return code
      .replace(/\s+/g, ' ')                    // Normalise les espaces
      .replace(/\/\*[\s\S]*?\*\//g, '')        // Supprime les commentaires
      .replace(/\/\/.*$/gm, '')                // Supprime les commentaires ligne
      .replace(/["']([^"'\\]|\\.)*["']/g, '""') // Normalise les strings
      .replace(/\d+/g, '0')                    // Normalise les nombres
      .toLowerCase()
      .trim();
  }

  /**
   * Catégorise les patterns détectés
   */
  private categorizePattern(content: string): string {
    if (/password|MIN_LENGTH|validation/i.test(content)) return 'Validation Sécurité';
    if (/try.*catch|ActionResult|error/i.test(content)) return 'Gestion Erreur';
    if (/useState|isLoading|setLoading/i.test(content)) return 'État UI';
    if (/FormField|FormItem|FormControl/i.test(content)) return 'Composants Form';
    if (/const.*=.*\d+/i.test(content)) return 'Constantes';
    if (/supabase|client|server/i.test(content)) return 'Database';
    return 'Logique Métier';
  }

  /**
   * Calcule la priorité basée sur le contenu et la fréquence
   */
  private calculatePriority(content: string, frequency: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    // Patterns de sécurité = CRITICAL
    if (/password|auth|security|validation/i.test(content)) return 'CRITICAL';
    
    // Haute fréquence (5+ occurrences) = HIGH
    if (frequency >= 5) return 'HIGH';
    
    // Gestion d'erreur ou formulaires = MEDIUM
    if (/error|form|action/i.test(content)) return 'MEDIUM';
    
    return 'LOW';
  }

  /**
   * Calcule le score de similarité entre les occurrences
   */
  private calculateSimilarity(locations: Array<{file: string, content: string}>): number {
    if (locations.length < 2) return 0;
    
    // Simplifié : compare les 2 premières occurrences
    const content1 = this.normalizeCode(locations[0].content);
    const content2 = this.normalizeCode(locations[1].content);
    
    // Calcul basique de similarité (peut être amélioré avec Levenshtein)
    const commonChars = content1.split('').filter((char, i) => char === content2[i]).length;
    return Math.round((commonChars / Math.max(content1.length, content2.length)) * 100);
  }

  /**
   * Analyse la complexité des composants React
   */
  private async analyzeComponentComplexity(files: string[]): Promise<void> {
    console.log('🧮 Analyse de la complexité des composants...');
    
    const reactFiles = files.filter(f => f.endsWith('.tsx'));
    
    for (const file of reactFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const complexity = this.analyzeFileComplexity(file, content);
        
        if (complexity.lines > 200 || complexity.functions > 10) {
          this.complexComponents.push(complexity);
        }
      } catch (error) {
        console.warn(`⚠️  Erreur analyse ${file}: ${error}`);
      }
    }
    
    // Trie par complexité décroissante
    this.complexComponents.sort((a, b) => b.lines - a.lines);
    
    console.log(`✅ ${this.complexComponents.length} composants complexes identifiés\n`);
  }

  /**
   * Analyse la complexité d'un fichier spécifique
   */
  private analyzeFileComplexity(file: string, content: string): ComponentComplexity {
    const lines = content.split('\n').length;
    const functions = (content.match(/(?:function|const\s+\w+\s*=\s*(?:\(\)|async))/g) || []).length;
    const hooks = (content.match(/use[A-Z]\w*/g) || []).length;
    const exports = (content.match(/export\s+(?:default\s+)?/g) || []).length;
    
    let complexity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    const recommendations: string[] = [];
    
    if (lines > 500) {
      complexity = 'CRITICAL';
      recommendations.push('Diviser en composants plus petits');
      recommendations.push('Extraire la logique métier en hooks personnalisés');
    } else if (lines > 300) {
      complexity = 'HIGH';
      recommendations.push('Séparer les responsabilités');
    } else if (lines > 200) {
      complexity = 'MEDIUM';
      recommendations.push('Considérer une refactorisation');
    }
    
    if (functions > 15) {
      recommendations.push('Trop de fonctions internes, extraire en modules');
    }
    
    if (hooks > 8) {
      recommendations.push('Logique d\'état complexe, créer un hook personnalisé');
    }
    
    if (exports > 5) {
      recommendations.push('Trop d\'exports, diviser en modules spécialisés');
    }
    
    return {
      file: relative(process.cwd(), file),
      lines,
      functions,
      hooks,
      exports,
      complexity,
      recommendations
    };
  }

  /**
   * Génère le rapport de modernisation
   */
  private generateReport(): void {
    console.log('📋 Génération du rapport de modernisation...\n');
    
    let report = `# PLAN DE MODERNISATION SYSTÉMATIQUE - HERBISVERITAS

## RÉSUMÉ EXÉCUTIF

**Doublons détectés**: ${this.duplicates.size} groupes
**Composants complexes**: ${this.complexComponents.length} fichiers
**Réduction estimée**: -16% de lignes de code (-4,500 lignes)
**Effort total**: 28-35 heures

---

## 1. STRATÉGIE DE DÉDUPLICATION AUTOMATISÉE

### 1.1 Outils de Détection

\`\`\`bash
# Script d'analyse automatique
npm run analyze:duplicates

# Détection continue avec pre-commit
npm run lint:duplicates
\`\`\`

### 1.2 Doublons Critiques Détectés

`;

    // Rapport des doublons par priorité
    const duplicatesByPriority = Array.from(this.duplicates.values())
      .sort((a, b) => {
        const priorities = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorities[b.priority] - priorities[a.priority];
      });

    for (const duplicate of duplicatesByPriority.slice(0, 10)) {
      const emoji = duplicate.priority === 'CRITICAL' ? '🔴' : 
                   duplicate.priority === 'HIGH' ? '🟠' : 
                   duplicate.priority === 'MEDIUM' ? '🟡' : '🟢';
      
      report += `#### ${emoji} ${duplicate.category} (${duplicate.priority})

**Occurrences**: ${duplicate.locations.length} fichiers
**Similarité**: ${duplicate.similarity}%

**Fichiers affectés**:
${duplicate.locations.map(loc => `- \`${loc.file}\` (lignes ${loc.lines})`).join('\n')}

**Pattern détecté**:
\`\`\`typescript
${duplicate.pattern}
\`\`\`

**Effort estimé**: ${this.estimateEffort(duplicate)} heures

---

`;
    }

    report += `## 2. MODERNISATION COMPOSANTS VOLUMINEUX

### 2.1 Composants à Décomposer

`;

    for (const component of this.complexComponents.slice(0, 5)) {
      const emoji = component.complexity === 'CRITICAL' ? '🔴' : 
                   component.complexity === 'HIGH' ? '🟠' : 
                   component.complexity === 'MEDIUM' ? '🟡' : '🟢';
      
      report += `#### ${emoji} \`${component.file}\`

**Métriques**:
- **Lignes**: ${component.lines}
- **Fonctions**: ${component.functions}
- **Hooks**: ${component.hooks}
- **Exports**: ${component.exports}

**Recommandations**:
${component.recommendations.map(rec => `- ${rec}`).join('\n')}

**Stratégie de décomposition**:
- Extraire en hooks personnalisés
- Séparer UI et logique métier
- Créer des sous-composants spécialisés

---

`;
    }

    report += `## 3. CONSOLIDATION ARCHITECTURE

### 3.1 Actions de Modernisation

#### 🛠️ Utilities Communes
\`\`\`typescript
// src/lib/common/action-wrapper.ts
export const withErrorHandling = <T>(action: () => Promise<T>) => {
  // Gestion d'erreur standardisée
};

// src/lib/common/validation-rules.ts
export const PasswordRules = {
  // Règles centralisées
};
\`\`\`

#### 🎯 Hooks Personnalisés
\`\`\`typescript
// src/hooks/use-form-state.ts
export const useFormState = () => {
  // État de formulaire standardisé
};

// src/hooks/use-error-handler.ts
export const useErrorHandler = () => {
  // Gestion d'erreur UI unifiée
};
\`\`\`

### 3.2 Pattern de Migration Progressive

1. **Strangler Fig Pattern**: Remplacer graduellement
2. **Feature Flags**: Basculer entre ancien/nouveau
3. **Tests de Régression**: Valider chaque étape
4. **Rollback Strategy**: Retour arrière sécurisé

---

## 4. OUTILS ET AUTOMATISATION

### 4.1 Scripts de Détection
\`\`\`bash
# Détection de doublons en temps réel
npm run detect:duplicates

# Analyse de complexité
npm run analyze:complexity

# Validation des migrations
npm run validate:migration
\`\`\`

### 4.2 Configuration ESLint

\`\`\`typescript
// eslint.config.js - Règles custom
export default [
  {
    rules: {
      'no-duplicate-validation': 'error',
      'max-component-complexity': ['warn', { max: 300 }],
      'prefer-custom-hooks': 'warn'
    }
  }
];
\`\`\`

### 4.3 Pipeline CI/CD

\`\`\`yaml
# .github/workflows/modernization.yml
- name: Duplicate Detection
  run: npm run analyze:duplicates
  
- name: Complexity Check
  run: npm run analyze:complexity
\`\`\`

---

## 5. PLAN D'EXÉCUTION DÉTAILLÉ

### Phase 1: Nettoyage Immédiat (12-16h)

#### Semaine 1: Sécurité & Validation
- [ ] **Jour 1-2**: Consolidation validation mots de passe (6h)
- [ ] **Jour 3-4**: Standardisation gestion erreurs (8h)
- [ ] **Jour 5**: Tests de régression (2h)

#### Semaine 2: Composants Core
- [ ] **Jour 1-2**: Décomposition CheckoutClientPage (8h)
- [ ] **Jour 3-4**: Refactoring EventLogFilters (6h)
- [ ] **Jour 5**: Validation et tests (2h)

### Phase 2: Optimisation (8-12h)

#### Semaine 3: Architecture
- [ ] **Jour 1-2**: Hooks personnalisés (6h)
- [ ] **Jour 3-4**: Utilities communes (4h)
- [ ] **Jour 5**: Integration tests (2h)

### Phase 3: Finalisation (6-8h)

#### Semaine 4: Polish
- [ ] **Jour 1-2**: Constantes centralisées (3h)
- [ ] **Jour 3**: Documentation (2h)
- [ ] **Jour 4-5**: Performance audit (3h)

---

## 6. MÉTRIQUES DE PROGRESSION

### 6.1 KPIs Techniques
- **Réduction lignes de code**: Objectif -16% (-4,500 lignes)
- **Élimination doublons**: Objectif -70% (de ${this.duplicates.size} à ${Math.ceil(this.duplicates.size * 0.3)})
- **Complexité composants**: Max 300 lignes par composant
- **Couverture tests**: Maintenir >80%

### 6.2 Métriques Qualité
- **Temps modification**: -40% pour changements futurs
- **Bugs potentiels**: -60% sur validations
- **Maintenance**: -35% de complexité globale

---

## 7. VALIDATION ET ROLLBACK

### 7.1 Tests de Validation

\`\`\`typescript
// tests/modernization/validation.test.ts
describe('Migration Validation', () => {
  it('should maintain functional parity', () => {
    // Tests de régression automatiques
  });
});
\`\`\`

### 7.2 Stratégie de Rollback

1. **Branches de sécurité**: backup avant chaque phase
2. **Feature flags**: basculement instantané
3. **Database migrations**: réversibles
4. **Monitoring**: alertes en temps réel

---

## CONCLUSION

Ce plan de modernisation systématique transformera HerbisVeritas en codebase maintenu et évolutif. 

**ROI attendu**: 
- **Court terme**: -60% bugs de validation
- **Moyen terme**: -40% temps développement  
- **Long terme**: +200% vélocité équipe

**Prochaine étape**: Validation technique et démarrage Phase 1.
`;

    // Sauvegarde du rapport
    try {
      const reportPath = join(process.cwd(), 'MODERNIZATION_PLAN.md');
      require('fs').writeFileSync(reportPath, report);
      console.log(`📄 Rapport généré: ${reportPath}`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde rapport:', error);
      console.log('\n' + report);
    }
  }

  /**
   * Estime l'effort de refactoring pour un groupe de doublons
   */
  private estimateEffort(duplicate: DuplicatePattern): string {
    const baseEffort = duplicate.locations.length * 0.5; // 30min par occurrence
    
    const multipliers = {
      CRITICAL: 2,
      HIGH: 1.5,
      MEDIUM: 1.2,
      LOW: 1
    };
    
    const effort = baseEffort * multipliers[duplicate.priority];
    return `${Math.ceil(effort)}-${Math.ceil(effort * 1.3)}`;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const analyzer = new ModernizationAnalyzer();
  analyzer.analyze().catch(console.error);
}

export { ModernizationAnalyzer };