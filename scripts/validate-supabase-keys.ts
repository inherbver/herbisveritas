#!/usr/bin/env tsx

/**
 * Script de Validation des Clés Supabase
 * 
 * OBJECTIF: Valider que les clés Supabase fonctionnent correctement
 * UTILISATION: npm run security:validate-keys
 * 
 * Tests effectués:
 * - Connectivité avec clé service role
 * - Connectivité avec clé anonyme  
 * - Permissions RLS
 * - Fonctionnalités critiques
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ValidationTest {
  name: string;
  description: string;
  critical: boolean;
  passed: boolean;
  error?: string;
  duration: number;
}

interface ValidationResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  criticalTests: number;
  criticalPassed: number;
  tests: ValidationTest[];
  summary: string;
}

class SupabaseValidator {
  private supabaseUrl: string;
  private serviceKey: string;
  private anonKey: string;
  private tests: ValidationTest[] = [];

  constructor(supabaseUrl: string, serviceKey: string, anonKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.serviceKey = serviceKey;
    this.anonKey = anonKey;
  }

  /**
   * Exécute tous les tests de validation
   */
  async runAllTests(): Promise<ValidationResult> {
    console.log('🔍 Début de la validation des clés Supabase...');
    console.log(`📅 ${new Date().toISOString()}\n`);

    await this.testServiceRoleConnection();
    await this.testAnonConnection();
    await this.testDatabaseAccess();
    await this.testRLSPolicies();
    await this.testCriticalTables();
    await this.testAuthOperations();

    return this.generateReport();
  }

  /**
   * Test de connexion avec clé service role
   */
  private async testServiceRoleConnection(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'service-role-connection',
      description: 'Connexion avec clé service role',
      critical: true,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);
      
      // Test simple de connexion
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        test.error = error.message;
      } else {
        test.passed = true;
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Test de connexion avec clé anonyme
   */
  private async testAnonConnection(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'anon-connection',
      description: 'Connexion avec clé anonyme',
      critical: true,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.anonKey);
      
      // Test de connexion anonyme (doit échouer pour tables protégées)
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      // Pour une table protégée par RLS, on s'attend à une erreur d'auth
      if (error && error.message.includes('RLS') || error?.code === 'PGRST301') {
        test.passed = true; // C'est le comportement attendu
      } else if (!error) {
        test.error = 'ATTENTION: Accès anonyme autorisé sur table profiles (RLS manquant?)';
      } else {
        test.error = error.message;
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Test d'accès aux données
   */
  private async testDatabaseAccess(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'database-access',
      description: 'Accès aux données avec service role',
      critical: true,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);
      
      // Tester plusieurs tables critiques
      const tables = ['profiles', 'products', 'orders', 'cart_items'];
      const results = await Promise.all(
        tables.map(table => 
          supabase.from(table).select('*').limit(1)
        )
      );

      const errors = results.filter(r => r.error).map(r => r.error?.message);
      
      if (errors.length > 0) {
        test.error = `Erreurs sur tables: ${errors.join(', ')}`;
      } else {
        test.passed = true;
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Test des politiques RLS
   */
  private async testRLSPolicies(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'rls-policies',
      description: 'Vérification des politiques RLS',
      critical: true,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);
      
      // Vérifier que RLS est activé sur les tables critiques
      const { data, error } = await supabase
        .rpc('check_rls_enabled')
        .or('table_name.in.(profiles,products,orders,cart_items)')
        .limit(10);

      if (error) {
        // RPC n'existe peut-être pas, test alternatif
        console.log('⚠️  RPC check_rls_enabled non trouvé, test manuel RLS...');
        
        // Test manuel: essayer d'accéder aux données avec clé anon
        const anonSupabase = createClient(this.supabaseUrl, this.anonKey);
        const { error: anonError } = await anonSupabase
          .from('profiles')
          .select('*')
          .limit(1);

        if (anonError && (anonError.code === 'PGRST301' || anonError.message.includes('RLS'))) {
          test.passed = true;
        } else {
          test.error = 'RLS semble désactivé sur table profiles';
        }
      } else {
        test.passed = data && data.length > 0;
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Test des tables critiques HerbisVeritas
   */
  private async testCriticalTables(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'critical-tables',
      description: 'Vérification tables critiques HerbisVeritas',
      critical: false,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.serviceKey);
      
      const criticalTables = [
        'profiles',
        'products', 
        'orders',
        'order_items',
        'cart_items',
        'addresses',
        'markets',
        'partners',
        'audit_logs'
      ];

      const results = await Promise.all(
        criticalTables.map(async table => {
          try {
            const { error } = await supabase.from(table).select('*').limit(1);
            return { table, exists: !error };
          } catch {
            return { table, exists: false };
          }
        })
      );

      const missingTables = results.filter(r => !r.exists).map(r => r.table);
      
      if (missingTables.length > 0) {
        test.error = `Tables manquantes: ${missingTables.join(', ')}`;
      } else {
        test.passed = true;
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Test des opérations d'authentification
   */
  private async testAuthOperations(): Promise<void> {
    const start = Date.now();
    const test: ValidationTest = {
      name: 'auth-operations',
      description: 'Test des opérations d\'authentification',
      critical: false,
      passed: false,
      duration: 0
    };

    try {
      const supabase = createClient(this.supabaseUrl, this.anonKey);
      
      // Test de la fonction d'auth (sans vraiment créer d'utilisateur)
      const { error } = await supabase.auth.signInWithPassword({
        email: 'test-validation@example.com',
        password: 'invalid-password'
      });

      // On s'attend à une erreur "Invalid login credentials"
      if (error && error.message.includes('Invalid login credentials')) {
        test.passed = true; // Auth fonctionne (refuse les mauvais identifiants)
      } else if (error && error.message.includes('Email not confirmed')) {
        test.passed = true; // Auth fonctionne aussi
      } else {
        test.error = error?.message || 'Réponse inattendue du système d\'auth';
      }

    } catch (error) {
      test.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    test.duration = Date.now() - start;
    this.tests.push(test);
    this.logTest(test);
  }

  /**
   * Génère le rapport final
   */
  private generateReport(): ValidationResult {
    const totalTests = this.tests.length;
    const passedTests = this.tests.filter(t => t.passed).length;
    const criticalTests = this.tests.filter(t => t.critical).length;
    const criticalPassed = this.tests.filter(t => t.critical && t.passed).length;
    
    const success = criticalPassed === criticalTests;
    const totalDuration = this.tests.reduce((sum, t) => sum + t.duration, 0);

    let summary = `🎯 Validation ${success ? 'RÉUSSIE' : 'ÉCHOUÉE'}\n`;
    summary += `📊 Tests: ${passedTests}/${totalTests} réussis\n`;
    summary += `🔥 Critiques: ${criticalPassed}/${criticalTests} réussis\n`;
    summary += `⏱️  Durée totale: ${totalDuration}ms`;

    console.log('\n' + '='.repeat(50));
    console.log('📋 RAPPORT DE VALIDATION');
    console.log('='.repeat(50));
    console.log(summary);
    
    if (!success) {
      console.log('\n❌ Tests critiques échoués:');
      this.tests
        .filter(t => t.critical && !t.passed)
        .forEach(t => console.log(`  - ${t.description}: ${t.error}`));
    }

    return {
      success,
      totalTests,
      passedTests,
      criticalTests,
      criticalPassed,
      tests: this.tests,
      summary
    };
  }

  /**
   * Log un test individuel
   */
  private logTest(test: ValidationTest): void {
    const status = test.passed ? '✅' : '❌';
    const critical = test.critical ? '🔥' : '  ';
    console.log(`${status} ${critical} ${test.description} (${test.duration}ms)`);
    if (!test.passed && test.error) {
      console.log(`     └─ ${test.error}`);
    }
  }
}

/**
 * Extrait les clés du fichier .env.local
 */
function extractKeysFromEnv(): { url: string; serviceKey: string; anonKey: string } | null {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const content = readFileSync(envPath, 'utf8');
    
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=([^\n\r]*)/);
    const anonMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="([^"]*)"/);
    const serviceMatch = content.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]*)"/);

    if (!urlMatch || !anonMatch || !serviceMatch) {
      return null;
    }

    return {
      url: urlMatch[1].trim(),
      serviceKey: serviceMatch[1],
      anonKey: anonMatch[1]
    };

  } catch (error) {
    console.error('❌ Erreur lecture .env.local:', error);
    return null;
  }
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🔍 Validation des clés Supabase HerbisVeritas');
    console.log('='.repeat(50));

    // Extraire les clés
    const keys = extractKeysFromEnv();
    if (!keys) {
      console.error('❌ Impossible d\'extraire les clés du fichier .env.local');
      process.exit(1);
    }

    console.log(`📍 URL Supabase: ${keys.url}`);
    console.log(`🔑 Clé Service: ${keys.serviceKey.substring(0, 20)}...`);
    console.log(`🔑 Clé Anon: ${keys.anonKey.substring(0, 20)}...\n`);

    // Exécuter la validation
    const validator = new SupabaseValidator(keys.url, keys.serviceKey, keys.anonKey);
    const result = await validator.runAllTests();

    // Code de sortie
    if (result.success) {
      console.log('\n✅ Toutes les validations critiques sont passées!');
      process.exit(0);
    } else {
      console.log('\n❌ Échec de validation - intervention requise');
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

export { SupabaseValidator };