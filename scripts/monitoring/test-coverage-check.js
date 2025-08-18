#!/usr/bin/env node
/* eslint-env node */
/**
 * Script de vérification de la couverture de tests - Phase 3.5
 * Analyse et rapporte la couverture de code avec des métriques détaillées
 */

const fs = require('fs')
const path = require('path')

// Configuration des seuils de couverture
const COVERAGE_THRESHOLDS = {
  global: {
    statements: 75,
    branches: 75,
    functions: 75,
    lines: 75,
  },
  critical: {
    // Seuils plus élevés pour les modules critiques
    statements: 90,
    branches: 85,
    functions: 90,
    lines: 90,
  }
}

// Modules critiques nécessitant une couverture élevée
const CRITICAL_MODULES = [
  'src/actions/',
  'src/services/',
  'src/lib/auth/',
  'src/lib/storage/',
  'src/lib/stripe/',
  'src/middleware.ts',
]

/**
 * Charge le rapport de couverture depuis le fichier JSON
 */
function loadCoverageReport() {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json')
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Rapport de couverture non trouvé:', coveragePath)
    process.exit(1)
  }
  
  try {
    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    return coverageData
  } catch (error) {
    console.error('❌ Erreur lors du chargement du rapport:', error.message)
    process.exit(1)
  }
}

/**
 * Calcule les métriques globales de couverture
 */
function calculateGlobalMetrics(coverageData) {
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  }
  
  Object.values(coverageData).forEach(file => {
    // Statements
    totals.statements.covered += file.s ? Object.values(file.s).filter(v => v > 0).length : 0
    totals.statements.total += file.s ? Object.keys(file.s).length : 0
    
    // Branches
    totals.branches.covered += file.b ? Object.values(file.b).flat().filter(v => v > 0).length : 0
    totals.branches.total += file.b ? Object.values(file.b).flat().length : 0
    
    // Functions
    totals.functions.covered += file.f ? Object.values(file.f).filter(v => v > 0).length : 0
    totals.functions.total += file.f ? Object.keys(file.f).length : 0
    
    // Lines
    const lineCoverage = file.l || {}
    totals.lines.covered += Object.values(lineCoverage).filter(v => v > 0).length
    totals.lines.total += Object.keys(lineCoverage).length
  })
  
  return {
    statements: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0,
    branches: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0,
    functions: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0,
    lines: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0,
  }
}

/**
 * Vérifie la couverture des modules critiques
 */
function checkCriticalModules(coverageData) {
  const criticalFiles = Object.keys(coverageData).filter(filePath =>
    CRITICAL_MODULES.some(module => filePath.includes(module))
  )
  
  const criticalResults = criticalFiles.map(filePath => {
    const file = coverageData[filePath]
    
    // Calculer les métriques pour ce fichier
    const statements = file.s ? Object.values(file.s) : []
    const statementsTotal = statements.length
    const statementsCovered = statements.filter(v => v > 0).length
    const statementsPercent = statementsTotal > 0 ? (statementsCovered / statementsTotal) * 100 : 0
    
    const branches = file.b ? Object.values(file.b).flat() : []
    const branchesTotal = branches.length
    const branchesCovered = branches.filter(v => v > 0).length
    const branchesPercent = branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 0
    
    const functions = file.f ? Object.values(file.f) : []
    const functionsTotal = functions.length
    const functionsCovered = functions.filter(v => v > 0).length
    const functionsPercent = functionsTotal > 0 ? (functionsCovered / functionsTotal) * 100 : 0
    
    const lines = file.l || {}
    const linesTotal = Object.keys(lines).length
    const linesCovered = Object.values(lines).filter(v => v > 0).length
    const linesPercent = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0
    
    return {
      filePath: filePath.replace(process.cwd(), ''),
      statements: statementsPercent,
      branches: branchesPercent,
      functions: functionsPercent,
      lines: linesPercent,
      isCritical: true,
    }
  })
  
  return criticalResults
}

/**
 * Identifie les fichiers avec une couverture insuffisante
 */
function findUncoveredFiles(coverageData) {
  const uncoveredFiles = []
  
  Object.entries(coverageData).forEach(([filePath, file]) => {
    // Calculer le pourcentage de lignes couvertes
    const lines = file.l || {}
    const linesTotal = Object.keys(lines).length
    const linesCovered = Object.values(lines).filter(v => v > 0).length
    const linesPercent = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0
    
    if (linesPercent < COVERAGE_THRESHOLDS.global.lines && linesTotal > 0) {
      uncoveredFiles.push({
        filePath: filePath.replace(process.cwd(), ''),
        coverage: linesPercent,
        uncoveredLines: linesTotal - linesCovered,
      })
    }
  })
  
  return uncoveredFiles.sort((a, b) => a.coverage - b.coverage)
}

/**
 * Génère un rapport de couverture formaté
 */
function generateReport(globalMetrics, criticalResults, uncoveredFiles) {
  console.log('\n📊 RAPPORT DE COUVERTURE DE TESTS - Phase 3.5\n')
  console.log('=' .repeat(60))
  
  // Métriques globales
  console.log('\n🌍 COUVERTURE GLOBALE:')
  console.log(`  Statements: ${globalMetrics.statements.toFixed(2)}% (seuil: ${COVERAGE_THRESHOLDS.global.statements}%)`)
  console.log(`  Branches:   ${globalMetrics.branches.toFixed(2)}% (seuil: ${COVERAGE_THRESHOLDS.global.branches}%)`)
  console.log(`  Functions:  ${globalMetrics.functions.toFixed(2)}% (seuil: ${COVERAGE_THRESHOLDS.global.functions}%)`)
  console.log(`  Lines:      ${globalMetrics.lines.toFixed(2)}% (seuil: ${COVERAGE_THRESHOLDS.global.lines}%)`)
  
  // Statut global
  const globalPassed = Object.entries(globalMetrics).every(([metric, value]) => 
    value >= COVERAGE_THRESHOLDS.global[metric]
  )
  
  console.log(`\n📈 Statut global: ${globalPassed ? '✅ RÉUSSI' : '❌ ÉCHEC'}`)
  
  // Modules critiques
  console.log('\n🔴 MODULES CRITIQUES:')
  if (criticalResults.length === 0) {
    console.log('  Aucun module critique trouvé')
  } else {
    criticalResults.forEach(result => {
      const criticalPassed = result.lines >= COVERAGE_THRESHOLDS.critical.lines
      const status = criticalPassed ? '✅' : '❌'
      console.log(`  ${status} ${result.filePath}: ${result.lines.toFixed(1)}%`)
    })
  }
  
  // Fichiers les moins couverts
  console.log('\n⚠️  FICHIERS NÉCESSITANT ATTENTION:')
  if (uncoveredFiles.length === 0) {
    console.log('  Tous les fichiers respectent le seuil minimum ✅')
  } else {
    uncoveredFiles.slice(0, 10).forEach(file => {
      console.log(`  📄 ${file.filePath}: ${file.coverage.toFixed(1)}% (${file.uncoveredLines} lignes non couvertes)`)
    })
    
    if (uncoveredFiles.length > 10) {
      console.log(`  ... et ${uncoveredFiles.length - 10} autres fichiers`)
    }
  }
  
  // Recommandations
  console.log('\n💡 RECOMMANDATIONS:')
  if (!globalPassed) {
    console.log('  • Augmenter la couverture de tests pour atteindre 75%')
  }
  
  const criticalFailures = criticalResults.filter(r => r.lines < COVERAGE_THRESHOLDS.critical.lines)
  if (criticalFailures.length > 0) {
    console.log('  • Prioriser les tests pour les modules critiques')
  }
  
  if (uncoveredFiles.length > 0) {
    console.log('  • Ajouter des tests pour les fichiers les moins couverts')
  }
  
  console.log('\n=' .repeat(60))
  
  return globalPassed && criticalFailures.length === 0
}

/**
 * Génère un badge de couverture
 */
function generateCoverageBadge(globalMetrics) {
  const coverage = Math.round(globalMetrics.lines)
  let color = 'red'
  
  if (coverage >= 90) color = 'brightgreen'
  else if (coverage >= 75) color = 'green'
  else if (coverage >= 60) color = 'yellow'
  else if (coverage >= 40) color = 'orange'
  
  const badgeUrl = `https://img.shields.io/badge/coverage-${coverage}%25-${color}`
  
  // Sauvegarder dans un fichier pour usage ultérieur
  const badgeData = {
    schemaVersion: 1,
    label: 'coverage',
    message: `${coverage}%`,
    color: color,
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'coverage', 'badge.json'),
    JSON.stringify(badgeData, null, 2)
  )
  
  console.log(`\n🏷️  Badge de couverture: ${badgeUrl}`)
}

/**
 * Script principal
 */
function main() {
  console.log('🚀 Analyse de la couverture de tests...')
  
  // Charger les données de couverture
  const coverageData = loadCoverageReport()
  
  // Calculer les métriques
  const globalMetrics = calculateGlobalMetrics(coverageData)
  const criticalResults = checkCriticalModules(coverageData)
  const uncoveredFiles = findUncoveredFiles(coverageData)
  
  // Générer le rapport
  const passed = generateReport(globalMetrics, criticalResults, uncoveredFiles)
  
  // Générer le badge
  generateCoverageBadge(globalMetrics)
  
  // Exit code basé sur le succès
  process.exit(passed ? 0 : 1)
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main()
}

module.exports = {
  loadCoverageReport,
  calculateGlobalMetrics,
  checkCriticalModules,
  findUncoveredFiles,
  generateReport,
  generateCoverageBadge,
}