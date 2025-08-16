# Plan de Durcissement Sécuritaire - HerbisVeritas

**Document :** Plan d'Implémentation des Mesures de Sécurité  
**Version :** 1.0  
**Date :** 15 août 2025  
**Responsable :** Équipe Développement HerbisVeritas  

---

## Vue d'Ensemble

Ce plan détaille l'implémentation concrète des 8 mesures de sécurité prioritaires identifiées lors de l'audit. Chaque mesure est accompagnée du code d'implémentation, des tests requis et des procédures de déploiement.

**Objectif :** Passer de **85/100** à **95/100** en sécurité applicative

---

## 🔴 PHASE 1 - CRITIQUE (0-7 jours)

### 1. Rotation des Clés de Service Supabase

#### Implémentation

**Étape 1 : Génération des nouvelles clés**
```bash
# 1. Accéder au dashboard Supabase
# 2. Project Settings > API > Generate new service_role key
# 3. Sauvegarder l'ancienne clé pour rollback
```

**Étape 2 : Mise à jour sécurisée des variables**
```bash
# .env.local - NOUVELLE CLÉ
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NOUVELLE_CLE..."

# .env.backup - ANCIENNE CLÉ (pour rollback rapide)
SUPABASE_SERVICE_ROLE_KEY_BACKUP="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ANCIENNE_CLE..."
```

**Étape 3 : Script de rotation automatique**
```typescript
// scripts/rotate-supabase-keys.ts
import { createClient } from '@supabase/supabase-js';

export async function rotateSupabaseServiceKey() {
  console.log('🔄 Début rotation clé service Supabase...');
  
  // 1. Vérifier connectivité avec ancienne clé
  const oldClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_BACKUP!
  );
  
  try {
    await oldClient.from('profiles').select('count').limit(1);
    console.log('✅ Ancienne clé encore valide');
  } catch (error) {
    console.error('🔴 Ancienne clé invalide:', error);
    return false;
  }
  
  // 2. Tester nouvelle clé
  const newClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    await newClient.from('profiles').select('count').limit(1);
    console.log('✅ Nouvelle clé fonctionnelle');
  } catch (error) {
    console.error('🔴 Nouvelle clé invalide:', error);
    return false;
  }
  
  // 3. Tests complets
  await runKeyRotationTests(newClient);
  
  console.log('✅ Rotation réussie - Ancienne clé à supprimer manuellement');
  return true;
}

async function runKeyRotationTests(client: any) {
  // Test des opérations critiques
  const tests = [
    { name: 'Lecture profiles', fn: () => client.from('profiles').select('id').limit(1) },
    { name: 'Écriture audit_logs', fn: () => client.from('audit_logs').insert({
      user_id: null, event_type: 'key_rotation_test', details: { test: true }
    }) },
    { name: 'RLS bypass orders', fn: () => client.from('orders').select('id').limit(1) }
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✅ Test ${test.name} réussi`);
    } catch (error) {
      console.error(`🔴 Test ${test.name} échoué:`, error);
      throw new Error(`Rotation échouée sur test: ${test.name}`);
    }
  }
}
```

**Tests de validation :**
```bash
# Test rotation
npm run test:security:key-rotation

# Test fonctionnel complet  
npm run test:e2e:admin
npm run test:e2e:stripe-webhook
```

**Checklist de déploiement :**
- [ ] Backup de l'ancienne clé effectué
- [ ] Tests rotation en staging réussis
- [ ] Déploiement production planifié (maintenance courte)
- [ ] Rollback préparé en cas d'échec
- [ ] Monitoring post-déploiement activé

---

### 2. Activation du Rate Limiting Production

#### Implémentation

**Étape 1 : Wrapper Server Actions avec sécurité**
```typescript
// src/actions/cartActions.ts - AVANT/APRÈS

// 🔴 AVANT - Pas de protection
export async function addToCartAction(formData: FormData) {
  // Logic directe sans rate limiting
}

// ✅ APRÈS - Protection rate limiting 
import { withSecurity } from '@/lib/security/security-middleware';

@withSecurity({ 
  rateLimit: "cart:add",
  sanitization: [
    { field: "productId", rules: [{ type: "trim" }, { type: "escape" }] },
    { field: "quantity", rules: [{ type: "trim" }] }
  ]
})
export async function addToCartAction(formData: FormData) {
  // Logic protégée avec rate limiting automatique
}
```

**Étape 2 : Configuration rate limits par endpoint**
```typescript
// src/lib/security/rate-limit-config.ts
export const RATE_LIMIT_CONFIGS = {
  // Actions utilisateur standard
  'cart:add': { windowMs: 60_000, maxRequests: 30 },      // 30/min
  'cart:update': { windowMs: 60_000, maxRequests: 60 },   // 60/min  
  'cart:remove': { windowMs: 60_000, maxRequests: 45 },   // 45/min
  
  // Actions authentification (plus restrictif)
  'auth:login': { windowMs: 15 * 60_000, maxRequests: 5 },     // 5/15min
  'auth:register': { windowMs: 60 * 60_000, maxRequests: 3 },  // 3/heure
  'auth:password_reset': { windowMs: 60 * 60_000, maxRequests: 2 }, // 2/heure
  
  // Actions admin (modéré)
  'admin:product_create': { windowMs: 60_000, maxRequests: 10 },  // 10/min
  'admin:user_update': { windowMs: 60_000, maxRequests: 20 },     // 20/min
  
  // Actions publiques (permissif)
  'newsletter:subscribe': { windowMs: 5 * 60_000, maxRequests: 2 }, // 2/5min
  'contact:send': { windowMs: 15 * 60_000, maxRequests: 3 },        // 3/15min
} as const;

// Application automatique à toutes les actions
for (const [endpoint, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
  securityMiddleware.addRateLimit(endpoint, {
    ...config,
    keyGenerator: (context) => `${endpoint}:${context.userId || context.ip}`,
  });
}
```

**Étape 3 : Décorateur automatique pour toutes les Server Actions**
```typescript
// src/actions/authActions.ts
import { withSecurity } from '@/lib/security/security-middleware';

@withSecurity({ rateLimit: "auth:login" })
export async function loginAction(formData: FormData) { /* ... */ }

@withSecurity({ rateLimit: "auth:register" })  
export async function registerAction(formData: FormData) { /* ... */ }

// src/actions/cartActions.ts
@withSecurity({ rateLimit: "cart:add" })
export async function addToCartAction(formData: FormData) { /* ... */ }

@withSecurity({ rateLimit: "cart:update" })
export async function updateCartQuantityAction(formData: FormData) { /* ... */ }

// src/actions/adminActions.ts
@withSecurity({ 
  rateLimit: "admin:product_create",
  resource: "admin", 
  action: "create" 
})
export async function createProductAction(formData: FormData) { /* ... */ }
```

**Tests de validation :**
```typescript
// __tests__/security/rate-limiting.test.ts
describe('Rate Limiting', () => {
  it('should block after exceeding cart:add limit', async () => {
    const formData = new FormData();
    formData.append('productId', 'test-id');
    formData.append('quantity', '1');
    
    // Simuler 31 requêtes (limite = 30)
    for (let i = 0; i < 30; i++) {
      const result = await addToCartAction(formData);
      expect(result.success).toBe(true);
    }
    
    // 31ème requête doit être bloquée
    const blockedResult = await addToCartAction(formData);
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.message).toContain('Trop de requêtes');
  });
  
  it('should reset limits after window expires', async () => {
    // Test avec limite courte pour simulation
    // Implementation avec Jest fake timers
  });
});
```

---

### 3. Suppression Admin Hardcodé

#### Implémentation

**Étape 1 : Suppression de la fonction d'urgence**
```typescript
// src/lib/auth/admin-service.ts - SUPPRESSION

// 🔴 À SUPPRIMER COMPLÈTEMENT
export function isEmergencyAdmin(userId: string): boolean {
  try {
    const env = getPrivateEnv("admin-service.isEmergencyAdmin");
    return userId === env.ADMIN_PRINCIPAL_ID; // DANGEREUX
  } catch (error) {
    console.error("Cannot access emergency admin config:", error);
    return false;
  }
}
```

**Étape 2 : Procédure de récupération admin via base de données**
```sql
-- scripts/emergency-admin-recovery.sql
-- À utiliser uniquement depuis l'interface Supabase en cas d'urgence

-- 1. Vérifier l'état actuel des admins
SELECT id, role, permissions, created_at 
FROM profiles 
WHERE role = 'admin';

-- 2. Promouvoir un utilisateur existant (URGENCE UNIQUEMENT)
UPDATE profiles 
SET role = 'admin', permissions = '["*"]'::jsonb
WHERE id = '<UUID_UTILISATEUR_DE_CONFIANCE>'
  AND role IN ('user', 'editor'); -- Sécurité : pas de modification si déjà admin

-- 3. Logger l'action d'urgence
INSERT INTO audit_logs (user_id, event_type, details)
VALUES (
  '<UUID_UTILISATEUR_DE_CONFIANCE>',
  'emergency_admin_promotion',
  jsonb_build_object(
    'promoted_by', 'manual_database_access',
    'reason', 'emergency_recovery',
    'timestamp', now()
  )
);
```

**Étape 3 : Interface de gestion admin via dashboard**
```typescript
// src/app/[locale]/admin/users/promote/page.tsx
import { promoteUserToAdmin } from '@/actions/adminActions';

export default function AdminPromotionPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🚨 Promotion Admin d'Urgence</CardTitle>
        <CardDescription>
          Utiliser uniquement en cas de perte d'accès admin critique
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={promoteUserToAdmin}>
          <Label htmlFor="userId">UUID Utilisateur à Promouvoir</Label>
          <Input name="userId" pattern="[0-9a-f-]{36}" required />
          
          <Label htmlFor="justification">Justification (Obligatoire)</Label>
          <Textarea name="justification" minLength={50} required />
          
          <Button type="submit" variant="destructive">
            🚨 PROMOUVOIR EN ADMIN (IRRÉVERSIBLE)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

```typescript
// src/actions/adminActions.ts - Nouvelle action sécurisée
@withSecurity({
  resource: "admin",
  action: "promote_user",
  rateLimit: "admin:user_promote"
})
export async function promoteUserToAdmin(formData: FormData) {
  const context = LogUtils.createUserActionContext(
    getAuthenticatedUserId(), 
    "promote_user", 
    "admin"
  );
  
  try {
    // Double vérification admin
    const adminCheck = await checkAdminRole(context.userId);
    if (!adminCheck.isAdmin) {
      throw new AuthorizationError("Seuls les admins peuvent promouvoir d'autres utilisateurs");
    }
    
    const userId = formData.get('userId') as string;
    const justification = formData.get('justification') as string;
    
    // Validation UUID
    if (!z.string().uuid().safeParse(userId).success) {
      throw new ValidationError("UUID utilisateur invalide");
    }
    
    // Justification obligatoire
    if (!justification || justification.length < 50) {
      throw new ValidationError("Justification de 50 caractères minimum requise");
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Promotion avec audit
    const { error } = await supabase
      .from('profiles')
      .update({ 
        role: 'admin',
        permissions: '["*"]'::any
      })
      .eq('id', userId)
      .eq('role', 'user'); // Sécurité : ne promouvoir que des users normaux
    
    if (error) throw error;
    
    // Log audit critique
    await logSecurityEvent({
      type: 'admin_promotion',
      userId: context.userId,
      details: {
        promoted_user_id: userId,
        justification,
        timestamp: new Date().toISOString(),
        promoted_by: context.userId
      }
    });
    
    return ActionResult.success(null, `Utilisateur ${userId} promu en admin`);
    
  } catch (error) {
    LogUtils.logOperationError("promote_user", error, context);
    return ActionResult.error(ErrorUtils.getErrorMessage(error));
  }
}
```

---

## 🟡 PHASE 2 - IMPORTANT (7-30 jours)

### 4. Multi-Factor Authentication (MFA) Administrateurs

#### Implémentation

**Étape 1 : Configuration Supabase Auth avec TOTP**
```typescript
// src/lib/auth/mfa-service.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';

export class MFAService {
  static async enrollMFA(userId: string) {
    const supabase = await createSupabaseServerClient();
    
    // Générer facteur TOTP
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Admin TOTP'
    });
    
    if (error) throw error;
    
    // Logger l'enrollment  
    await logSecurityEvent({
      type: 'mfa_enrollment',
      userId,
      details: {
        factor_id: data.id,
        factor_type: 'totp',
        timestamp: new Date().toISOString()
      }
    });
    
    return data;
  }
  
  static async verifyMFA(factorId: string, challengeId: string, code: string) {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
    
    if (error) throw error;
    return data;
  }
  
  static async challengeMFA(factorId: string) {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId
    });
    
    if (error) throw error;
    return data;
  }
}
```

**Étape 2 : Middleware MFA obligatoire pour admins**
```typescript
// src/middleware.ts - AJOUT après vérification admin

// Vérification MFA pour les routes admin sensibles
if (pathToCheck.startsWith("/admin") && user) {
  const adminCheck = await checkAdminRole(user.id);
  
  if (adminCheck.isAdmin) {
    // Vérifier MFA obligatoire pour admin
    const mfaRequired = await checkMFARequired(user.id, pathToCheck);
    
    if (mfaRequired && !await isMFAVerified(user.id)) {
      const mfaChallengeUrl = new URL(`/${currentLocale}/admin/mfa-challenge`, request.url);
      mfaChallengeUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(mfaChallengeUrl);
    }
  }
}
```

**Étape 3 : Interface utilisateur MFA**
```typescript
// src/app/[locale]/admin/mfa-setup/page.tsx
export default function MFASetupPage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  
  const enrollMFA = async () => {
    try {
      const enrollment = await MFAService.enrollMFA(userId);
      setQrCode(enrollment.totp.qr_code);
      setSecret(enrollment.totp.secret);
    } catch (error) {
      toast.error('Erreur lors de la configuration MFA');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>🔐 Configuration MFA Obligatoire</CardTitle>
        <CardDescription>
          L'authentification multi-facteurs est obligatoire pour les administrateurs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!qrCode ? (
          <Button onClick={enrollMFA}>Configurer MFA</Button>
        ) : (
          <div className="space-y-4">
            <div>
              <h3>1. Scanner le QR Code</h3>
              <QRCodeDisplay value={qrCode} />
            </div>
            
            <div>
              <h3>2. Ou saisir manuellement</h3>
              <Code>{secret}</Code>
            </div>
            
            <MFAVerificationForm factorId={enrollment.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### 5. Monitoring et Alertes de Sécurité

#### Implémentation

**Étape 1 : Dashboard temps réel Supabase**
```sql
-- Vue dashboard sécurité pour Supabase Analytics
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  jsonb_agg(DISTINCT details->>'ip') as source_ips
FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, event_type
ORDER BY hour DESC;
```

**Étape 2 : Service d'alertes**
```typescript
// src/lib/security/alert-service.ts
export class SecurityAlertService {
  private static ALERT_THRESHOLDS = {
    failed_login_attempts: { count: 10, window: '15 minutes' },
    unauthorized_admin_access: { count: 3, window: '5 minutes' },
    rate_limit_exceeded: { count: 50, window: '1 hour' }
  };
  
  static async checkSecurityThresholds() {
    const supabase = await createSupabaseServerClient();
    
    for (const [eventType, threshold] of Object.entries(this.ALERT_THRESHOLDS)) {
      const { data } = await supabase
        .from('audit_logs')
        .select('count')
        .eq('event_type', eventType)
        .gte('created_at', new Date(Date.now() - this.parseWindow(threshold.window)));
      
      if (data && data.length > threshold.count) {
        await this.sendSecurityAlert(eventType, data.length, threshold);
      }
    }
  }
  
  private static async sendSecurityAlert(
    eventType: string, 
    currentCount: number, 
    threshold: any
  ) {
    // Webhook vers service externe (Slack, Email, etc.)
    const alertPayload = {
      severity: 'HIGH',
      event: eventType,
      message: `Seuil de sécurité dépassé: ${currentCount} événements ${eventType} en ${threshold.window}`,
      timestamp: new Date().toISOString(),
      dashboard_url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/security-dashboard`
    };
    
    // Appel webhook ou service d'alerte
    await fetch(process.env.SECURITY_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    });
  }
}

// Cron job pour vérification périodique
setInterval(SecurityAlertService.checkSecurityThresholds, 5 * 60 * 1000); // 5 min
```

---

### 6. Configuration CSP Stricte en Développement

#### Implémentation

**Étape 1 : CSP développement permissive mais active**
```javascript
// next.config.js - MODIFICATION
const isDev = process.env.NODE_ENV === "development";

const devCSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Permissif en dev
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' ws://localhost:* https://*.supabase.co wss://*.supabase.co",
  "report-uri /api/csp-violation" // Logging des violations
].join("; ");

const prodCSP = [
  // CSP strict existant
].join("; ");

// Toujours activer CSP, même en développement
{
  key: "Content-Security-Policy",
  value: isDev ? devCSP : prodCSP,
}
```

**Étape 2 : Endpoint de reporting CSP**
```typescript
// src/app/api/csp-violation/route.ts
export async function POST(request: Request) {
  try {
    const violation = await request.json();
    
    // Logger uniquement en développement
    if (process.env.NODE_ENV === 'development') {
      console.warn('🚨 CSP Violation en développement:', {
        violatedDirective: violation['violated-directive'],
        blockedURI: violation['blocked-uri'],
        sourceFile: violation['source-file'],
        lineNumber: violation['line-number']
      });
    }
    
    // En production, logger vers audit système
    if (process.env.NODE_ENV === 'production') {
      await logSecurityEvent({
        type: 'csp_violation',
        userId: null,
        details: violation
      });
    }
    
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 400 });
  }
}
```

---

## 🟢 PHASE 3 - OPTIMISATION (30+ jours)

### 7. Rate Limiting Distribué avec Redis

#### Implémentation

**Configuration Upstash Redis pour production**
```typescript
// src/lib/security/distributed-rate-limit.ts
import { Redis } from '@upstash/redis';

export class DistributedRateLimitStore {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  
  async checkRateLimit(
    key: string, 
    windowMs: number, 
    maxRequests: number
  ): Promise<{ allowed: boolean; resetTime: number; remaining: number }> {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `ratelimit:${key}:${window}`;
    
    // Atomic increment with expiry
    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[0] as number;
    
    return {
      allowed: currentCount <= maxRequests,
      resetTime: (window + 1) * windowMs,
      remaining: Math.max(0, maxRequests - currentCount)
    };
  }
}
```

### 8. Tests de Sécurité Automatisés

#### Pipeline CI/CD avec tests sécurisés
```yaml
# .github/workflows/security-tests.yml
name: Security Tests
on: [push, pull_request]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Security Dependency Scan
        run: |
          npm audit --audit-level=moderate
          npm run audit:licenses
      
      - name: SAST Code Analysis  
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript
          
      - name: Rate Limiting Tests
        run: npm run test:security:rate-limiting
        
      - name: Authentication Tests
        run: npm run test:security:auth-flow
        
      - name: CSP Validation
        run: npm run test:security:csp-validation
```

---

## Métriques de Suivi Post-Implémentation

### Tableaux de Bord Requis

**1. Dashboard Sécurité Temps Réel** (`/admin/security-dashboard`)
- Graphiques des tentatives d'authentification (succès/échec)
- Monitoring rate limiting en temps réel
- Alertes de sécurité actives
- Géolocalisation des connexions admin

**2. Rapports Hebdomadaires Automatisés**
- Synthèse des événements de sécurité
- Performance des mesures de protection
- Recommandations d'ajustement des seuils

### Tests de Validation Continue

```bash
# Tests sécuritaires à intégrer en CI/CD
npm run test:security                    # Suite complète 
npm run test:security:rate-limiting      # Tests rate limiting
npm run test:security:auth-mfa          # Tests MFA admin
npm run test:security:csrf              # Tests protection CSRF
npm run test:security:rls-policies      # Tests politiques RLS
```

---

## Planning de Déploiement

| Phase | Durée | Effort | Impact Sécurité | Risque Déploiement |
|-------|-------|--------|-----------------|-------------------|
| **Phase 1 - Critique** | 7 jours | 9h | +8 points | Faible |
| **Phase 2 - Important** | 23 jours | 32h | +5 points | Moyen |
| **Phase 3 - Optimisation** | 30+ jours | 44h | +2 points | Faible |

**Score Final Attendu :** **95/100** en sécurité applicative

---

## Validation et Sign-off

**Responsabilités :**
- **Développeur Principal :** Implémentation et tests
- **DevOps :** Configuration infrastructure et monitoring
- **Product Owner :** Validation fonctionnelle et planning
- **Security Officer :** Audit final et validation

**Critères de Succès :**
- [ ] Toutes les vulnérabilités critiques corrigées
- [ ] Tests sécuritaires passant à 100%
- [ ] Monitoring de sécurité opérationnel
- [ ] Documentation procédures d'urgence à jour
- [ ] Formation équipe sur nouvelles procédures

---

**Document validé par :** [À compléter lors du sign-off]  
**Date de validation :** [À compléter]  
**Prochaine révision :** [À planifier dans 6 mois]