#!/usr/bin/env node

/**
 * Utilities pour la migration architecturale
 * Usage: node migration-scripts/01-migration-utils.cjs [command]
 */

const fs = require('fs');
const path = require('path');

// Configuration des mappings de migration
const MIGRATION_MAPPINGS = {
  // Infrastructure services -> Adapters
  'src/lib/infrastructure/services/': 'src/adapters/services/',
  'src/lib/infrastructure/repositories/': 'src/adapters/repositories/',
  'src/lib/infrastructure/events/': 'src/adapters/events/',
  
  // Services layer -> Application ou Adapters selon le contenu
  'src/lib/services/': 'src/application/services/', // Sera analysé individuellement
  
  // Actions -> Controllers
  'src/actions/': 'src/presentation/controllers/',
  
  // Components restructuration
  'src/components/domain/': 'src/presentation/components/domain/',
  'src/components/shared/': 'src/presentation/components/shared/',
  'src/components/ui/': 'src/presentation/components/ui/',
  
  // Types et utilitaires
  'src/types/': 'src/shared/types/',
  'src/utils/': 'src/shared/utils/'
};

const ROLLBACK_LOG = 'migration-rollback.log';

// Utilitaire pour logger les opérations
function logOperation(operation, source, target, success = true) {
  const timestamp = new Date().toISOString();
  const status = success ? 'SUCCESS' : 'FAILED';
  const logEntry = `${timestamp} [${status}] ${operation}: ${source} -> ${target}\n`;
  
  fs.appendFileSync(ROLLBACK_LOG, logEntry);
  console.log(`[${status}] ${operation}: ${source} -> ${target}`);
}

// Créer la structure de dossiers cible
function createTargetStructure() {
  const directories = [
    'src/domain/entities',
    'src/domain/value-objects',
    'src/domain/repositories',
    'src/domain/services',
    'src/domain/events',
    'src/application/use-cases',
    'src/application/commands',
    'src/application/handlers',
    'src/application/services',
    'src/adapters/repositories',
    'src/adapters/services',
    'src/adapters/events',
    'src/adapters/api',
    'src/presentation/components',
    'src/presentation/pages',
    'src/presentation/controllers',
    'src/presentation/dto',
    'src/shared/types',
    'src/shared/utils',
    'src/shared/config'
  ];

  console.log('🏗️  Création de la structure cible...');
  
  directories.forEach(dir => {
    try {
      fs.mkdirSync(dir, { recursive: true });
      logOperation('CREATE_DIR', '', dir, true);
    } catch (error) {
      logOperation('CREATE_DIR', '', dir, false);
      console.error(`❌ Erreur création ${dir}:`, error.message);
    }
  });
  
  console.log('✅ Structure cible créée');
}

// Analyser un fichier pour déterminer sa destination optimale
function analyzeFileDestination(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Rechercher des patterns spécifiques
    const hasSupabaseClient = content.includes('createSupabaseClient') || content.includes('createSupabaseAdminClient');
    const hasBusinessLogic = content.includes('Business') || content.includes('domain') || content.includes('entity');
    const hasValidation = content.includes('validator') || content.includes('validation');
    const isRepository = content.includes('Repository') || content.includes('repository');
    
    // Logique de classification
    if (isRepository && hasSupabaseClient) {
      return 'src/adapters/repositories/';
    } else if (hasSupabaseClient && !hasBusinessLogic) {
      return 'src/adapters/services/';
    } else if (hasBusinessLogic && !hasSupabaseClient) {
      return 'src/domain/services/';
    } else if (hasValidation) {
      return 'src/application/services/';
    }
    
    return null; // Nécessite analyse manuelle
  } catch (error) {
    console.error(`❌ Erreur analyse ${filePath}:`, error.message);
    return null;
  }
}

// Déplacer un fichier avec mise à jour des imports
function moveFileWithImportUpdate(sourcePath, targetPath) {
  try {
    // Lire le contenu du fichier source
    const content = fs.readFileSync(sourcePath, 'utf8');
    
    // Mettre à jour les imports (sera fait dans une fonction séparée)
    const updatedContent = updateImportsInContent(content, sourcePath, targetPath);
    
    // Créer le dossier cible si nécessaire
    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Écrire le fichier à la nouvelle destination
    fs.writeFileSync(targetPath, updatedContent);
    
    // Supprimer le fichier source (sera fait après confirmation)
    // fs.unlinkSync(sourcePath);
    
    logOperation('MOVE_FILE', sourcePath, targetPath, true);
    return true;
  } catch (error) {
    logOperation('MOVE_FILE', sourcePath, targetPath, false);
    console.error(`❌ Erreur déplacement ${sourcePath}:`, error.message);
    return false;
  }
}

// Mettre à jour les imports dans le contenu d'un fichier
function updateImportsInContent(content, sourcePath, targetPath) {
  // Pattern pour capturer les imports
  const importRegex = /import\s+.*?\s+from\s+['""]([^'""]+)['""]/g;
  
  return content.replace(importRegex, (match, importPath) => {
    // Si c'est un import relatif, le convertir selon la nouvelle structure
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const newImportPath = calculateNewImportPath(importPath, sourcePath, targetPath);
      return match.replace(importPath, newImportPath);
    }
    
    // Si c'est un import absolu avec @/, le mettre à jour si nécessaire
    if (importPath.startsWith('@/')) {
      const newImportPath = updateAbsoluteImportPath(importPath);
      return match.replace(importPath, newImportPath);
    }
    
    return match;
  });
}

// Calculer le nouveau chemin d'import relatif
function calculateNewImportPath(importPath, oldFilePath, newFilePath) {
  // Cette fonction est complexe et nécessite une logique spécifique
  // Pour l'instant, on retourne l'import original
  return importPath;
}

// Mettre à jour les imports absolus
function updateAbsoluteImportPath(importPath) {
  const mappings = {
    '@/lib/infrastructure/services/': '@/adapters/services/',
    '@/lib/infrastructure/repositories/': '@/adapters/repositories/',
    '@/lib/services/': '@/application/services/',
    '@/actions/': '@/presentation/controllers/',
    '@/types/': '@/shared/types/',
    '@/utils/': '@/shared/utils/'
  };
  
  for (const [oldPath, newPath] of Object.entries(mappings)) {
    if (importPath.includes(oldPath)) {
      return importPath.replace(oldPath, newPath);
    }
  }
  
  return importPath;
}

// Fonctions principales
function planMigration() {
  console.log('🎯 PLAN DE MIGRATION ARCHITECTURAL');
  console.log('=====================================\n');
  
  Object.entries(MIGRATION_MAPPINGS).forEach(([source, target]) => {
    if (fs.existsSync(source)) {
      const files = fs.readdirSync(source, { recursive: true })
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
        .slice(0, 5); // Limiter l'affichage
      
      console.log(`📂 ${source} -> ${target}`);
      files.forEach(file => {
        const fullPath = path.join(source, file);
        if (fs.statSync(fullPath).isFile()) {
          const destination = analyzeFileDestination(fullPath);
          const status = destination ? '✅' : '⚠️ ';
          console.log(`  ${status} ${file} -> ${destination || 'À analyser manuellement'}`);
        }
      });
      console.log('');
    }
  });
  
  console.log('⚠️  Attention: Certains fichiers nécessitent une analyse manuelle');
  console.log('📝 Voir migration-rollback.log pour le détail des opérations');
}

function validateMigration() {
  console.log('🧪 VALIDATION DE LA MIGRATION');
  console.log('===============================\n');
  
  // Vérifier que la structure cible existe
  const requiredDirs = [
    'src/domain/entities',
    'src/application/use-cases', 
    'src/adapters/repositories',
    'src/presentation/controllers'
  ];
  
  let valid = true;
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir}`);
    } else {
      console.log(`❌ ${dir} - MANQUANT`);
      valid = false;
    }
  });
  
  console.log(valid ? '\n✅ Structure validée' : '\n❌ Structure incomplète');
  return valid;
}

// Interface CLI
const command = process.argv[2];

switch (command) {
  case 'init':
    createTargetStructure();
    break;
  case 'plan':
    planMigration();
    break;
  case 'validate':
    validateMigration();
    break;
  default:
    console.log(`
🚀 OUTIL DE MIGRATION ARCHITECTURALE HerbisVeritas

Commandes disponibles:
  init     - Créer la structure de dossiers cible
  plan     - Afficher le plan de migration
  validate - Valider la structure après migration

Usage: node migration-scripts/01-migration-utils.cjs [command]
    `);
}