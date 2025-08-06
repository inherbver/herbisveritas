#!/usr/bin/env node

/**
 * Scripts pour les phases de migration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Phase 1: Consolidation Domain Layer
function executePhase1() {
  console.log('🎯 PHASE 1: CONSOLIDATION DOMAIN LAYER');
  console.log('=====================================\n');
  
  const phase1Tasks = [
    {
      name: 'Déplacement des entités existantes',
      action: () => {
        const entityFiles = [
          'src/lib/domain/entities/cart.entity.ts'
        ];
        
        entityFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const targetPath = file.replace('/lib/domain/', '/domain/');
            const targetDir = path.dirname(targetPath);
            fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Consolidation des value objects',
      action: () => {
        const voFiles = [
          'src/lib/domain/value-objects/money.ts',
          'src/lib/domain/value-objects/product-reference.ts',
          'src/lib/domain/value-objects/quantity.ts'
        ];
        
        voFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const targetPath = file.replace('/lib/domain/', '/domain/');
            const targetDir = path.dirname(targetPath);
            fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Migration des interfaces de repository',
      action: () => {
        const interfaceFiles = [
          'src/lib/domain/interfaces/address.repository.interface.ts',
          'src/lib/domain/interfaces/article.repository.interface.ts',
          'src/lib/domain/interfaces/order.repository.interface.ts',
          'src/lib/domain/interfaces/product.repository.interface.ts',
          'src/lib/domain/interfaces/repository.interface.ts',
          'src/lib/domain/interfaces/user.repository.interface.ts'
        ];
        
        fs.mkdirSync('src/domain/repositories', { recursive: true });
        
        interfaceFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const fileName = path.basename(file);
            const targetPath = `src/domain/repositories/${fileName}`;
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Validation des services domain',
      action: () => {
        const domainServices = [
          'src/lib/domain/services/address-validation.service.ts',
          'src/lib/domain/services/cart.service.ts',
          'src/lib/domain/services/checkout.service.ts',
          'src/lib/domain/services/product-validation.service.ts'
        ];
        
        domainServices.forEach(file => {
          if (fs.existsSync(file)) {
            const targetPath = file.replace('/lib/domain/', '/domain/');
            const targetDir = path.dirname(targetPath);
            fs.mkdirSync(targetDir, { recursive: true });
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    }
  ];
  
  let hasErrors = false;
  
  phase1Tasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.name}...`);
    try {
      task.action();
      console.log(`✅ ${task.name} - COMPLÉTÉ`);
    } catch (error) {
      console.log(`❌ ${task.name} - ERREUR: ${error.message}`);
      console.log(`   Stack trace: ${error.stack}`);
      hasErrors = true;
    }
  });
  
  if (hasErrors) {
    console.log('\n⚠️  ATTENTION: Des erreurs ont été détectées en Phase 1');
    console.log('Veuillez les corriger avant de continuer à la Phase 2');
    process.exit(1);
  }
  
  // Validation phase 1
  console.log('\n🧪 VALIDATION PHASE 1...');
  validatePhase1();
}

function validatePhase1() {
  const requiredFiles = [
    'src/domain/entities/cart.entity.ts',
    'src/domain/repositories/repository.interface.ts',
    'src/domain/services/cart.service.ts'
  ];
  
  let allValid = true;
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - MANQUANT`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n✅ PHASE 1 VALIDÉE - Prêt pour Phase 2');
  } else {
    console.log('\n❌ PHASE 1 INCOMPLÈTE - Corriger avant de continuer');
  }
}

// Phase 2: Restructuration Infrastructure -> Adapters
function executePhase2() {
  console.log('🎯 PHASE 2: RESTRUCTURATION INFRASTRUCTURE -> ADAPTERS');
  console.log('=====================================================\n');
  
  const phase2Tasks = [
    {
      name: 'Migration repositories Supabase',
      action: () => {
        const repoFiles = [
          'src/lib/infrastructure/repositories/address.supabase.repository.ts',
          'src/lib/infrastructure/repositories/base-supabase.repository.ts',
          'src/lib/infrastructure/repositories/cart.repository.ts',
          'src/lib/infrastructure/repositories/order.supabase.repository.ts',
          'src/lib/infrastructure/repositories/product.repository.ts',
          'src/lib/infrastructure/repositories/product.supabase.repository.ts',
          'src/lib/infrastructure/repositories/user.supabase.repository.ts'
        ];
        
        fs.mkdirSync('src/adapters/repositories', { recursive: true });
        
        repoFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const fileName = path.basename(file);
            const targetPath = `src/adapters/repositories/${fileName}`;
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Migration services infrastructure',
      action: () => {
        const serviceFiles = [
          'src/lib/infrastructure/services/article-analytics.service.ts',
          'src/lib/infrastructure/services/article-content.service.ts',
          'src/lib/infrastructure/services/article-crud.service.ts',
          'src/lib/infrastructure/services/article-scheduling.service.ts',
          'src/lib/infrastructure/services/article-search.service.ts',
          'src/lib/infrastructure/services/article-seo.service.ts',
          'src/lib/infrastructure/services/article-taxonomy.service.ts',
          'src/lib/infrastructure/services/article-validation.service.ts'
        ];
        
        fs.mkdirSync('src/adapters/services', { recursive: true });
        
        serviceFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const fileName = path.basename(file);
            const targetPath = `src/adapters/services/${fileName}`;
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Migration système d\'événements',
      action: () => {
        const eventFiles = [
          'src/lib/infrastructure/events/event-bus.ts',
          'src/lib/infrastructure/events/event-store.ts',
          'src/lib/infrastructure/events/simple-event-bus.ts',
          'src/lib/infrastructure/events/supabase-event-store.ts'
        ];
        
        fs.mkdirSync('src/adapters/events', { recursive: true });
        
        eventFiles.forEach(file => {
          if (fs.existsSync(file)) {
            const fileName = path.basename(file);
            const targetPath = `src/adapters/events/${fileName}`;
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
        
        // Migration des handlers et listeners
        const handlersDir = 'src/lib/infrastructure/events/handlers';
        const listenersDir = 'src/lib/infrastructure/events/listeners';
        
        if (fs.existsSync(handlersDir)) {
          fs.mkdirSync('src/adapters/events/handlers', { recursive: true });
          const handlers = fs.readdirSync(handlersDir);
          handlers.forEach(handler => {
            const sourcePath = path.join(handlersDir, handler);
            const targetPath = `src/adapters/events/handlers/${handler}`;
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copié: ${sourcePath} -> ${targetPath}`);
          });
        }
        
        if (fs.existsSync(listenersDir)) {
          fs.mkdirSync('src/adapters/events/listeners', { recursive: true });
          const listeners = fs.readdirSync(listenersDir);
          listeners.forEach(listener => {
            const sourcePath = path.join(listenersDir, listener);
            const targetPath = `src/adapters/events/listeners/${listener}`;
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copié: ${sourcePath} -> ${targetPath}`);
          });
        }
      }
    }
  ];
  
  phase2Tasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.name}...`);
    try {
      task.action();
      console.log(`✅ ${task.name} - COMPLÉTÉ`);
    } catch (error) {
      console.log(`❌ ${task.name} - ERREUR: ${error.message}`);
    }
  });
  
  console.log('\n🧪 VALIDATION PHASE 2...');
  validatePhase2();
}

function validatePhase2() {
  const requiredDirs = [
    'src/adapters/repositories',
    'src/adapters/services',
    'src/adapters/events'
  ];
  
  let allValid = true;
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`✅ ${dir} (${files.length} fichiers)`);
    } else {
      console.log(`❌ ${dir} - MANQUANT`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n✅ PHASE 2 VALIDÉE - Prêt pour Phase 3');
  } else {
    console.log('\n❌ PHASE 2 INCOMPLÈTE - Corriger avant de continuer');
  }
}

// Phase 3: Migration Application Layer
function executePhase3() {
  console.log('🎯 PHASE 3: MIGRATION APPLICATION LAYER');
  console.log('=======================================\n');
  
  const phase3Tasks = [
    {
      name: 'Migration services applicatifs',
      action: () => {
        const appServices = [
          'src/lib/services/address.service.ts',
          'src/lib/services/order.service.ts',
          'src/lib/services/product.service.ts',
          'src/lib/services/user.service.ts'
        ];
        
        fs.mkdirSync('src/application/services', { recursive: true });
        
        appServices.forEach(file => {
          if (fs.existsSync(file)) {
            const fileName = path.basename(file);
            const targetPath = `src/application/services/${fileName}`;
            fs.copyFileSync(file, targetPath);
            console.log(`✅ Copié: ${file} -> ${targetPath}`);
          }
        });
      }
    },
    {
      name: 'Création structure Use Cases',
      action: () => {
        const useCaseDirs = [
          'src/application/use-cases/auth',
          'src/application/use-cases/cart',
          'src/application/use-cases/product',
          'src/application/use-cases/order'
        ];
        
        useCaseDirs.forEach(dir => {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`✅ Créé: ${dir}`);
        });
      }
    }
  ];
  
  phase3Tasks.forEach((task, index) => {
    console.log(`\n${index + 1}. ${task.name}...`);
    try {
      task.action();
      console.log(`✅ ${task.name} - COMPLÉTÉ`);
    } catch (error) {
      console.log(`❌ ${task.name} - ERREUR: ${error.message}`);
    }
  });
  
  console.log('\n🧪 VALIDATION PHASE 3...');
  validatePhase3();
}

function validatePhase3() {
  const requiredDirs = [
    'src/application/services',
    'src/application/use-cases'
  ];
  
  let allValid = true;
  requiredDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir}`);
    } else {
      console.log(`❌ ${dir} - MANQUANT`);
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n✅ PHASE 3 VALIDÉE - Prêt pour Phase 4');
  } else {
    console.log('\n❌ PHASE 3 INCOMPLÈTE - Corriger avant de continuer');
  }
}

// Interface CLI
const command = process.argv[2];

switch (command) {
  case 'phase1':
    executePhase1();
    break;
  case 'phase2':
    executePhase2();
    break;
  case 'phase3':
    executePhase3();
    break;
  case 'validate1':
    validatePhase1();
    break;
  case 'validate2':
    validatePhase2();
    break;
  case 'validate3':
    validatePhase3();
    break;
  default:
    console.log(`
🚀 SCRIPTS DE MIGRATION PAR PHASES

Commandes disponibles:
  phase1     - Exécuter Phase 1 (Domain Layer)
  phase2     - Exécuter Phase 2 (Infrastructure -> Adapters)
  phase3     - Exécuter Phase 3 (Application Layer)
  validate1  - Valider Phase 1
  validate2  - Valider Phase 2
  validate3  - Valider Phase 3

Usage: node migration-scripts/02-phase-scripts.cjs [command]
    `);
}