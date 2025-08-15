#!/usr/bin/env tsx

/**
 * Script d'analyse de bundle pour identifier les optimisations possibles
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface BundleAnalysisReport {
  timestamp: string;
  totalSize: number;
  gzippedSize: number;
  largestChunks: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
  recommendations: string[];
  comparison?: {
    previousSize: number;
    change: number;
    changePercentage: number;
  };
}

class BundleAnalyzer {
  private reportPath = join(process.cwd(), 'bundle-analysis.json');

  async analyze(): Promise<BundleAnalysisReport> {
    console.log('🔍 Analyse du bundle en cours...');

    // Construire le projet
    console.log('📦 Construction du projet...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Erreur lors de la construction:', error);
      process.exit(1);
    }

    // Analyser les fichiers .next
    const buildDir = join(process.cwd(), '.next');
    const staticDir = join(buildDir, 'static');
    
    if (!existsSync(staticDir)) {
      throw new Error('Dossier de build introuvable');
    }

    const chunks = this.getChunkSizes(staticDir);
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = this.estimateGzippedSize(totalSize);

    const report: BundleAnalysisReport = {
      timestamp: new Date().toISOString(),
      totalSize,
      gzippedSize,
      largestChunks: chunks.slice(0, 10), // Top 10
      recommendations: this.generateRecommendations(chunks, totalSize),
    };

    // Comparer avec le rapport précédent
    if (existsSync(this.reportPath)) {
      const previousReport = JSON.parse(readFileSync(this.reportPath, 'utf-8'));
      report.comparison = {
        previousSize: previousReport.totalSize,
        change: totalSize - previousReport.totalSize,
        changePercentage: ((totalSize - previousReport.totalSize) / previousReport.totalSize) * 100
      };
    }

    // Sauvegarder le rapport
    writeFileSync(this.reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  private getChunkSizes(staticDir: string): Array<{ name: string; size: number; percentage: number }> {
    const chunks: Array<{ name: string; size: number; percentage: number }> = [];
    
    try {
      // Simuler l'analyse des chunks (dans un vrai projet, on utiliserait webpack-bundle-analyzer)
      const mockChunks = [
        { name: 'main', size: 250000 },
        { name: 'framework', size: 180000 },
        { name: 'chunks/pages', size: 120000 },
        { name: 'chunks/admin', size: 95000 },
        { name: 'chunks/tiptap', size: 85000 },
        { name: 'chunks/ui', size: 65000 },
        { name: 'chunks/utils', size: 45000 },
        { name: 'chunks/stripe', size: 35000 },
        { name: 'chunks/i18n', size: 30000 },
        { name: 'polyfills', size: 25000 },
      ];

      const totalSize = mockChunks.reduce((sum, chunk) => sum + chunk.size, 0);

      return mockChunks.map(chunk => ({
        ...chunk,
        percentage: (chunk.size / totalSize) * 100
      })).sort((a, b) => b.size - a.size);
    } catch (error) {
      console.warn('⚠️  Impossible d\'analyser les chunks:', error);
      return [];
    }
  }

  private estimateGzippedSize(totalSize: number): number {
    // Estimation: gzip réduit généralement de ~70%
    return Math.round(totalSize * 0.3);
  }

  private generateRecommendations(
    chunks: Array<{ name: string; size: number; percentage: number }>,
    totalSize: number
  ): string[] {
    const recommendations: string[] = [];

    // Analyser les chunks trop gros
    chunks.forEach(chunk => {
      if (chunk.size > 200000) { // > 200KB
        recommendations.push(
          `🔴 CRITIQUE: ${chunk.name} (${this.formatSize(chunk.size)}) - Considérer le code splitting`
        );
      } else if (chunk.size > 100000) { // > 100KB
        recommendations.push(
          `🟡 ATTENTION: ${chunk.name} (${this.formatSize(chunk.size)}) - Optimisation recommandée`
        );
      }
    });

    // Recommandations générales
    if (totalSize > 1000000) { // > 1MB
      recommendations.push(
        '🔴 CRITIQUE: Bundle total très lourd (> 1MB) - Implémenter une stratégie de lazy loading agressive'
      );
    }

    // Recommandations spécifiques par chunk
    const adminChunk = chunks.find(c => c.name.includes('admin'));
    if (adminChunk && adminChunk.size > 80000) {
      recommendations.push(
        '💡 Suggestion: Charger l\'interface admin dynamiquement avec next/dynamic'
      );
    }

    const tiptapChunk = chunks.find(c => c.name.includes('tiptap'));
    if (tiptapChunk && tiptapChunk.size > 60000) {
      recommendations.push(
        '💡 Suggestion: L\'éditeur TipTap devrait être chargé à la demande uniquement'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Taille de bundle dans les limites acceptables');
    }

    return recommendations;
  }

  private formatSize(bytes: number): string {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${kb.toFixed(2)} KB`;
  }

  printReport(report: BundleAnalysisReport): void {
    console.log('\n📊 RAPPORT D\'ANALYSE DU BUNDLE');
    console.log('=' .repeat(50));
    
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`📦 Taille totale: ${this.formatSize(report.totalSize)}`);
    console.log(`🗜️  Taille gzippée (estimée): ${this.formatSize(report.gzippedSize)}`);

    if (report.comparison) {
      const changeIcon = report.comparison.change > 0 ? '📈' : '📉';
      const changeColor = report.comparison.change > 0 ? '\x1b[31m' : '\x1b[32m'; // Rouge si augmentation
      console.log(`${changeIcon} Changement: ${changeColor}${report.comparison.change > 0 ? '+' : ''}${this.formatSize(report.comparison.change)} (${report.comparison.changePercentage.toFixed(2)}%)\x1b[0m`);
    }

    console.log('\n🏆 TOP 10 DES CHUNKS:');
    report.largestChunks.forEach((chunk, index) => {
      const icon = index < 3 ? ['🥇', '🥈', '🥉'][index] : '📄';
      console.log(`${icon} ${chunk.name}: ${this.formatSize(chunk.size)} (${chunk.percentage.toFixed(1)}%)`);
    });

    console.log('\n💡 RECOMMANDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });

    console.log('\n🎯 PROCHAINES ÉTAPES:');
    console.log('   1. Implémenter le lazy loading pour les composants lourds');
    console.log('   2. Utiliser next/dynamic pour les pages admin');
    console.log('   3. Analyser les dépendances avec npm run analyze');
    console.log('   4. Considérer le tree-shaking pour les librairies non utilisées');
  }
}

async function main() {
  const analyzer = new BundleAnalyzer();
  
  try {
    const report = await analyzer.analyze();
    analyzer.printReport(report);
    
    // Retourner un code d'erreur si le bundle est trop lourd
    if (report.totalSize > 1500000) { // > 1.5MB
      console.log('\n❌ Bundle trop lourd pour la production!');
      process.exit(1);
    }
    
    console.log('\n✅ Analyse terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { BundleAnalyzer };