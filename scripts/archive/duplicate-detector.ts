#!/usr/bin/env node

/**
 * Détecteur de doublons sémantiques spécialisé
 * Focus sur les patterns critiques identifiés dans l'audit
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

interface CriticalDuplicate {
  type: string;
  pattern: RegExp;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  consolidationTarget: string;
  occurrences: Array<{
    file: string;
    line: number;
    match: string;
    context: string;
  }>;
}

class DuplicateDetector {
  private criticalPatterns: CriticalDuplicate[] = [
    {
      type: "PASSWORD_VALIDATION",
      pattern:
        /const\s+MIN_LENGTH\s*=\s*8|\/\[A-Z\]\/|\/\[0-9\]\/|\/\[\^A-Za-z0-9\]\//g,
      description: "Règles de validation de mot de passe dupliquées",
      severity: "CRITICAL",
      consolidationTarget: "src/lib/validators/password-rules.ts",
      occurrences: [],
    },
    {
      type: "ERROR_HANDLING",
      pattern:
        /try\s*\{[\s\S]*?createSupabaseServerClient[\s\S]*?\}\s*catch|ActionResult\.error|console\.error\("Error in action"/g,
      description: "Patterns de gestion d'erreur dans les actions",
      severity: "CRITICAL",
      consolidationTarget: "src/lib/actions/action-wrapper.ts",
      occurrences: [],
    },
    {
      type: "FORM_STATE",
      pattern:
        /const\s+\[isLoading,\s*setIsLoading\]\s*=\s*useState\(false\)|const\s+\[error,\s*setError\]\s*=\s*useState<string\s*\|\s*null>/g,
      description: "État de formulaire dupliqué",
      severity: "HIGH",
      consolidationTarget: "src/hooks/use-form-state.ts",
      occurrences: [],
    },
    {
      type: "FORM_FIELDS",
      pattern:
        /<FormField[\s\S]*?name="(?:newPassword|confirmPassword)"[\s\S]*?<PasswordInput/g,
      description: "Champs de mot de passe dupliqués",
      severity: "HIGH",
      consolidationTarget: "src/components/forms/password-field.tsx",
      occurrences: [],
    },
    {
      type: "CONSTANTS",
      pattern:
        /const\s+MAX_QUANTITY\s*=\s*99|const\s+DEFAULT_TIMEOUT\s*=\s*5000|const\s+MIN_LENGTH\s*=\s*8/g,
      description: "Constantes de validation dupliquées",
      severity: "MEDIUM",
      consolidationTarget: "src/lib/constants/validation.ts",
      occurrences: [],
    },
    {
      type: "MAGAZINE_ACTIONS",
      pattern:
        /export\s+(?:async\s+)?function\s+(?:create|update|delete)Article/g,
      description: "Actions Magazine dupliquées",
      severity: "HIGH",
      consolidationTarget: "src/actions/magazineActions.ts",
      occurrences: [],
    },
  ];

  /**
   * Lance la détection des doublons critiques
   */
  async detectCriticalDuplicates(): Promise<void> {
    console.log("🔍 Détection des doublons critiques...\n");

    const files = this.getAllTSFiles();

    for (const file of files) {
      await this.scanFile(file);
    }

    this.generateConsolidationPlan();
  }

  /**
   * Récupère tous les fichiers TypeScript du projet
   */
  private getAllTSFiles(): string[] {
    const files: string[] = [];

    const traverse = (dir: string) => {
      try {
        const entries = readdirSync(dir);

        for (const entry of entries) {
          const fullPath = join(dir, entry);

          if (
            statSync(fullPath).isDirectory() &&
            !entry.startsWith(".") &&
            entry !== "node_modules"
          ) {
            traverse(fullPath);
          } else if (fullPath.match(/\.(ts|tsx)$/)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore les erreurs d'accès
      }
    };

    traverse("src");
    return files;
  }

  /**
   * Scanne un fichier pour détecter les patterns critiques
   */
  private async scanFile(file: string): Promise<void> {
    try {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");

      for (const pattern of this.criticalPatterns) {
        let match;
        const regex = new RegExp(pattern.pattern.source, "gm");

        while ((match = regex.exec(content)) !== null) {
          const lineNumber = content
            .substring(0, match.index)
            .split("\n").length;
          const contextStart = Math.max(0, lineNumber - 3);
          const contextEnd = Math.min(lines.length, lineNumber + 2);

          pattern.occurrences.push({
            file: relative(process.cwd(), file),
            line: lineNumber,
            match: match[0].substring(0, 100), // Limite la taille
            context: lines.slice(contextStart, contextEnd).join("\n"),
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️  Erreur lecture ${file}: ${error}`);
    }
  }

  /**
   * Génère le plan de consolidation détaillé
   */
  private generateConsolidationPlan(): void {
    console.log("📋 Génération du plan de consolidation...\n");

    let plan = `# PLAN DE CONSOLIDATION IMMÉDIATE - DOUBLONS CRITIQUES

Généré le: ${new Date().toISOString()}

## RÉSUMÉ

`;

    let totalOccurrences = 0;
    let criticalCount = 0;
    let highCount = 0;

    for (const pattern of this.criticalPatterns) {
      totalOccurrences += pattern.occurrences.length;
      if (pattern.severity === "CRITICAL")
        criticalCount += pattern.occurrences.length;
      if (pattern.severity === "HIGH") highCount += pattern.occurrences.length;
    }

    plan += `**Total doublons détectés**: ${totalOccurrences}
**Doublons critiques**: ${criticalCount}
**Doublons importants**: ${highCount}

---

## DOUBLONS PAR CATÉGORIE

`;

    // Trie par sévérité et nombre d'occurrences
    const sortedPatterns = this.criticalPatterns
      .filter((p) => p.occurrences.length > 0)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 3, HIGH: 2, MEDIUM: 1 };
        return (
          severityOrder[b.severity] - severityOrder[a.severity] ||
          b.occurrences.length - a.occurrences.length
        );
      });

    for (const pattern of sortedPatterns) {
      const emoji =
        pattern.severity === "CRITICAL"
          ? "🔴"
          : pattern.severity === "HIGH"
            ? "🟠"
            : "🟡";

      plan += `### ${emoji} ${pattern.type} (${pattern.severity})

**Description**: ${pattern.description}
**Occurrences**: ${pattern.occurrences.length}
**Cible de consolidation**: \`${pattern.consolidationTarget}\`

**Fichiers affectés**:
`;

      // Groupe par fichier pour éviter la répétition
      const fileGroups = new Map<string, number[]>();
      for (const occurrence of pattern.occurrences) {
        if (!fileGroups.has(occurrence.file)) {
          fileGroups.set(occurrence.file, []);
        }
        fileGroups.get(occurrence.file)!.push(occurrence.line);
      }

      for (const [file, lines] of fileGroups) {
        plan += `- \`${file}\` (lignes: ${lines.join(", ")})\n`;
      }

      plan += `
**Premier exemple**:
\`\`\`typescript
${pattern.occurrences[0].match}
\`\`\`

**Action recommandée**:
${this.getConsolidationAction(pattern.type)}

**Effort estimé**: ${this.estimateEffort(pattern)} heures

---

`;
    }

    plan += `## STRATÉGIE D'IMPLÉMENTATION

### Phase 1: Doublons Critiques (Priorité IMMÉDIATE)

`;

    for (const pattern of sortedPatterns.filter(
      (p) => p.severity === "CRITICAL",
    )) {
      plan += `#### ${pattern.type}

1. **Créer** \`${pattern.consolidationTarget}\`
2. **Implémenter** la version centralisée
3. **Migrer** les ${pattern.occurrences.length} occurrences
4. **Tester** la régression
5. **Supprimer** le code dupliqué

`;
    }

    plan += `### Phase 2: Doublons Importants

`;

    for (const pattern of sortedPatterns.filter((p) => p.severity === "HIGH")) {
      plan += `#### ${pattern.type}

1. **Analyser** les variations entre occurrences
2. **Créer** l'abstraction commune
3. **Migration** progressive avec feature flags
4. **Validation** unitaire et d'intégration

`;
    }

    plan += `### Phase 3: Optimisations

`;

    for (const pattern of sortedPatterns.filter(
      (p) => p.severity === "MEDIUM",
    )) {
      plan += `#### ${pattern.type}

1. **Audit** de l'impact
2. **Centralisation** si ROI positif
3. **Documentation** des nouvelles conventions

`;
    }

    plan += `## SCRIPTS D'AIDE

### Détection Continue

\`\`\`bash
# Surveille les nouveaux doublons
npm run watch:duplicates

# Vérifie avant commit
npm run pre-commit:duplicates
\`\`\`

### Migration Assistée

\`\`\`bash
# Génère les fichiers de consolidation
npm run generate:consolidation

# Valide la migration
npm run validate:consolidation
\`\`\`

---

## NEXT STEPS

1. **IMMÉDIAT**: Traiter les doublons CRITIQUES (${criticalCount} occurrences)
2. **CETTE SEMAINE**: Implémenter les consolidations Phase 1
3. **SEMAINE PROCHAINE**: Migrer les doublons HIGH
4. **MONITORING**: Mettre en place la détection continue

**Estimation totale**: ${this.calculateTotalEffort(sortedPatterns)} heures de refactoring
`;

    // Sauvegarde du plan
    try {
      const planPath = join(process.cwd(), "CONSOLIDATION_PLAN.md");
      require("fs").writeFileSync(planPath, plan);
      console.log(`📄 Plan de consolidation généré: ${planPath}`);

      // Affiche aussi un résumé court
      this.displaySummary(sortedPatterns);
    } catch (error) {
      console.error("❌ Erreur sauvegarde plan:", error);
      console.log("\n" + plan);
    }
  }

  /**
   * Retourne l'action de consolidation recommandée pour un type
   */
  private getConsolidationAction(type: string): string {
    const actions = {
      PASSWORD_VALIDATION: `
1. Créer \`src/lib/validators/password-rules.ts\` avec les règles centralisées
2. Exporter une fonction \`createPasswordSchema(t: TFunction)\` pour l'i18n
3. Mettre à jour tous les formulaires pour utiliser cette fonction
4. Ajouter des tests unitaires pour la validation`,

      ERROR_HANDLING: `
1. Créer \`src/lib/actions/action-wrapper.ts\` avec le wrapper \`withErrorHandling\`
2. Standardiser le logging avec \`LogUtils\` au lieu de \`console.error\`
3. Implémenter l'audit trail automatique pour les actions admin
4. Migrer toutes les actions server une par une`,

      FORM_STATE: `
1. Créer le hook \`src/hooks/use-form-state.ts\`
2. Exporter \`useFormState()\` avec état loading/error standardisé
3. Créer \`useAsyncAction()\` pour les actions avec feedback
4. Migrer les composants de formulaire progressivement`,

      FORM_FIELDS: `
1. Créer \`src/components/forms/password-field.tsx\`
2. Implémenter \`<PasswordField />\` avec validation intégrée
3. Supporter les props \`name\`, \`label\`, \`placeholder\` personnalisables
4. Remplacer tous les \`FormField\` de mot de passe`,

      CONSTANTS: `
1. Créer \`src/lib/constants/validation.ts\`
2. Centraliser toutes les constantes de validation
3. Exporter avec types TypeScript stricts
4. Mettre à jour les imports dans tous les fichiers`,

      MAGAZINE_ACTIONS: `
1. Consolider dans \`src/actions/magazineActions.ts\` unique
2. Supprimer \`src/lib/actions/magazine-actions.ts\` (duplication)
3. Mettre à jour tous les imports
4. Valider avec les tests existants`,
    };

    return actions[type] || "Action de consolidation à définir";
  }

  /**
   * Estime l'effort de consolidation
   */
  private estimateEffort(pattern: CriticalDuplicate): string {
    const baseEffort = {
      PASSWORD_VALIDATION: 6,
      ERROR_HANDLING: 8,
      FORM_STATE: 4,
      FORM_FIELDS: 5,
      CONSTANTS: 2,
      MAGAZINE_ACTIONS: 3,
    };

    const base = baseEffort[pattern.type] || 2;
    const complexity = pattern.occurrences.length * 0.3;

    const total = base + complexity;
    return `${Math.ceil(total)}-${Math.ceil(total * 1.3)}`;
  }

  /**
   * Calcule l'effort total de consolidation
   */
  private calculateTotalEffort(patterns: CriticalDuplicate[]): string {
    let totalMin = 0;
    let totalMax = 0;

    for (const pattern of patterns) {
      const estimate = this.estimateEffort(pattern);
      const [min, max] = estimate.split("-").map(Number);
      totalMin += min;
      totalMax += max;
    }

    return `${totalMin}-${totalMax}`;
  }

  /**
   * Affiche un résumé rapide dans la console
   */
  private displaySummary(patterns: CriticalDuplicate[]): void {
    console.log("📊 RÉSUMÉ DES DOUBLONS CRITIQUES\n");

    for (const pattern of patterns.slice(0, 5)) {
      const emoji =
        pattern.severity === "CRITICAL"
          ? "🔴"
          : pattern.severity === "HIGH"
            ? "🟠"
            : "🟡";

      console.log(
        `${emoji} ${pattern.type}: ${pattern.occurrences.length} occurrences`,
      );
      console.log(`   → ${pattern.consolidationTarget}`);
      console.log(`   → Effort: ${this.estimateEffort(pattern)}h\n`);
    }

    const totalEffort = this.calculateTotalEffort(patterns);
    console.log(`🎯 EFFORT TOTAL: ${totalEffort} heures`);
    console.log(`📈 ROI ATTENDU: -60% bugs, -40% temps maintenance\n`);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const detector = new DuplicateDetector();
  detector.detectCriticalDuplicates().catch(console.error);
}

export { DuplicateDetector };
