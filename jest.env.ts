/**
 * Variables d'environnement essentielles pour Jest
 * Configuration minimale pour des tests rapides
 */

// Variables Supabase essentielles
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Variables Next.js
// NODE_ENV est déjà défini par Jest à "test"
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

// Variables Stripe pour tests
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key_for_testing_only";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock_secret_for_testing";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_mock_key_for_testing";

// Variables de sécurité et admin
process.env.CSRF_SECRET = "test-csrf-secret-key-for-testing";
process.env.ADMIN_PRINCIPAL_ID = "test-admin-principal-id";
process.env.INTERNAL_FUNCTION_SECRET = "test-internal-function-secret";

// Variables d'email (mocks)
process.env.RESEND_API_KEY = "test-resend-api-key";
process.env.FROM_EMAIL = "test@example.com";

// Variables de base de données
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Désactiver les logs en mode test
process.env.DISABLE_LOGS = "true";
process.env.LOG_LEVEL = "error";

// Variables pour bypasser certaines validations en test
process.env.JEST_TESTING = "true";
process.env.SKIP_ENV_VALIDATION = "false";

export {};
