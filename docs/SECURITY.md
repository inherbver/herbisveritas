# Guide de Sécurité HerbisVeritas

Documentation complète des mesures de sécurité et bonnes pratiques  
Date de mise à jour : 19 août 2025

## Vue d'ensemble de la Sécurité

HerbisVeritas implémente une défense en profondeur avec multiple couches de sécurité pour protéger les données clients, les transactions et l'infrastructure.

### Modèle de Menaces

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Externes      │    │   Application   │    │   Données       │
│                 │    │                 │    │                 │
│ • DDoS          │───►│ • CSRF          │───►│ • SQL Injection │
│ • Brute Force   │    │ • XSS           │    │ • Data Leaks    │
│ • Bot Attacks   │    │ • Injection     │    │ • Unauthorized  │
│ • Man-in-Middle │    │ • Auth Bypass   │    │ • Corruption    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Mesures de Sécurité Critique

### 1. Protection CSRF (Cross-Site Request Forgery)

Implementation : `src/lib/security/csrf-protection.ts`

```typescript
export class CSRFProtection {
  // Génération de token cryptographiquement sûr
  static generateToken(): string {
    return crypto.randomUUID().replace(/-/g, "");
  }

  // Validation double token (cookie + header)
  static async validateToken(request: NextRequest): Promise<boolean> {
    const headerToken = request.headers.get("x-csrf-token");
    const cookieToken = cookies().get("csrf-token")?.value;

    return this.secureCompare(headerToken, cookieToken);
  }
}
```

Protection appliquée à :

- Tous les Server Actions
- Routes API sensibles (`/api/auth/*`, `/api/admin/*`)
- Webhooks Stripe
- Actions de modification de données

### 2. Row Level Security (RLS) Policies

Supabase RLS appliqué sur toutes les tables :

```sql
-- Exemple : Isolation stricte des paniers
CREATE POLICY cart_items_strict_isolation ON cart_items
  FOR ALL USING (
    cart_id IN (
      SELECT id FROM carts
      WHERE (
        -- Utilisateur authentifié : ses propres paniers
        (user_id = auth.uid() AND auth.uid() IS NOT NULL)
        OR
        -- Invité : panier de sa session uniquement
        (user_id IS NULL AND session_id = current_setting('app.session_id', true))
      )
    )
  );

-- Exemple : Produits visibles selon le statut utilisateur
CREATE POLICY products_unified_read ON products
  FOR SELECT USING (
    CASE WHEN auth.role() = 'authenticated'
    THEN true
    ELSE is_active = true
    END
  );
```

### 3. Authentification et Autorisation Robuste

#### Authentification Multi-Couches

```typescript
// Middleware avec timeout et retry logic
export async function middleware(request: NextRequest) {
  // 1. Vérification JWT avec timeout
  const { user } = await supabaseCallWithTimeout(supabase.auth.getUser(), 2000);

  // 2. Vérification rôle via base de données
  const adminCheck = await checkAdminRole(user.id);

  // 3. Logging des événements de sécurité
  await logSecurityEvent({
    type: "admin_access_attempt",
    userId: user.id,
    details: { path: pathname },
  });
}
```

#### Gestion des Rôles

- `user` : Accès standard aux fonctionnalités publiques
- `admin` : Accès complet dashboard administration
- `moderator` : Accès limité à la gestion de contenu

### 4. Rate Limiting et Anti-Abuse

Implementation : `src/lib/security/rate-limit-decorator.ts`

```typescript
@RateLimit({
  windowMs: 60 * 1000,     // 1 minute
  maxAttempts: 5,          // 5 tentatives max
  blockDuration: 300000,   // 5 minutes de blocage
})
export async function sensitiveAction() {
  // Action protégée
}
```

Limites appliquées :

- Connexion : 5 tentatives/minute
- API Calls : 100 requêtes/minute par IP
- Server Actions : 50 actions/minute par utilisateur
- Webhooks : 1000 requêtes/heure

### 5. Input Sanitization et Validation

Sanitisation automatique : `src/lib/validators/sanitization.ts`

```typescript
// Schémas Zod avec sanitisation intégrée
export const validationSchemas = {
  // Contenu produit avec HTML limité
  productContent: sanitizedString(["b", "i", "em", "strong", "p", "br"]),

  // Texte pur (supprime tout HTML)
  userInput: sanitizedText(),

  // Email avec validation + normalisation
  email: z
    .string()
    .email()
    .transform((val) => val.toLowerCase().trim()),
};

// Utilisation dans les Server Actions
export async function createProduct(formData: FormData) {
  const data = validationSchemas.productContent.parse(
    formData.get("description"),
  );
  // data est maintenant sécurisé
}
```

## Sécurité des Données

### 1. Chiffrement et Protection

- Transit : TLS 1.3 obligatoire (HTTPS uniquement)
- Base de données : Chiffrement AES-256 au repos
- Tokens JWT : RS256 avec rotation automatique
- Cookies : `Secure`, `HttpOnly`, `SameSite=Strict`

### 2. Gestion des Secrets

```bash
# Variables d'environnement sécurisées
SUPABASE_SERVICE_ROLE_KEY=xxx     # Admin database access
STRIPE_SECRET_KEY=sk_live_xxx     # Payments
CSRF_SECRET=xxx                   # CSRF token generation
ADMIN_PRINCIPAL_ID=xxx            # Super admin identification
```

Bonnes pratiques :

- Secrets stockés dans Vercel Environment Variables
- Rotation automatique des clés (90 jours)
- Pas de secrets hardcodés dans le code
- Différents secrets par environnement

### 3. Audit et Logging

Table d'audit : `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,           -- 'auth_failure', 'admin_access', etc.
  user_id UUID REFERENCES profiles(id),
  details JSONB,                      -- Contexte de l'événement
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Événements loggés :

- Tentatives de connexion (succès/échec)
- Accès admin non autorisé
- Violations de rate limiting
- Tentatives de bypass CSRF
- Transactions Stripe importantes

## Sécurité Performance

### 1. Anti-DDoS et Load Balancing

- Vercel Edge Network : Protection DDoS automatique
- Rate Limiting : Limitation par IP et utilisateur
- Connection Pooling : Optimisé pour éviter exhaustion

### 2. Monitoring Sécuritaire

Alertes configurées :

- Plus de 10 tentatives de connexion échouées/minute
- Accès admin hors heures ouvrables
- Patterns d'attaque SQL injection
- Pics de traffic anormaux

## Protection XSS et Injections

### 1. Content Security Policy (CSP)

```typescript
// next.config.js
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https://*.supabase.co;
      connect-src 'self' https://*.supabase.co https://api.stripe.com;
      frame-src https://js.stripe.com;
    `,
  },
];
```

### 2. SQL Injection Prevention

- Parameterized Queries exclusivement
- Supabase Client avec échappement automatique
- Input Validation avec Zod avant DB
- RLS Policies comme couche supplémentaire

## Sécurité Payments (Stripe)

### 1. Webhook Security

```typescript
// Vérification signature Stripe
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    // Traitement sécurisé de l'événement
  } catch (error) {
    console.error("❌ Webhook signature verification failed");
    return new Response("Unauthorized", { status: 401 });
  }
}
```

### 2. PCI Compliance

- Tokenisation Stripe : Pas de stockage de cartes
- HTTPS Obligatoire pour toutes transactions
- 3D Secure activé par défaut
- Webhook Idempotency pour éviter doublons

## Tests de Sécurité

### 1. Tests Automatisés

```typescript
describe("Security Tests", () => {
  test("CSRF protection blocks unauthorized requests", async () => {
    const response = await fetch("/api/admin/action", {
      method: "POST",
      // Sans token CSRF
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "CSRF token invalid",
    });
  });

  test("RLS policies prevent unauthorized data access", async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", "other-user-id");

    expect(data).toHaveLength(0); // Aucun accès
  });
});
```

### 2. Penetration Testing

Tests périodiques :

- OWASP Top 10 coverage
- Injection vulnerabilities
- Authentication bypasses
- Authorization flaws

## Checklist Sécurité

### Infrastructure

- [x] HTTPS/TLS 1.3 obligatoire
- [x] CSP headers configurés
- [x] CORS policy restrictive
- [x] Rate limiting en place
- [x] DDoS protection (Vercel)

### Authentication/Authorization

- [x] JWT avec expiration courte
- [x] Refresh tokens sécurisés
- [x] MFA disponible (Supabase)
- [x] Session timeout configuré
- [x] Role-based access control

### Data Protection

- [x] RLS policies sur toutes tables
- [x] Input sanitization automatique
- [x] SQL injection prevention
- [x] XSS protection intégrée
- [x] Data encryption (transit + repos)

### Application Security

- [x] CSRF protection active
- [x] Security headers complets
- [x] Error handling sécurisé
- [x] Logging et monitoring
- [x] Secrets management

### Payment Security

- [x] Stripe PCI compliance
- [x] Webhook signature verification
- [x] 3D Secure enabled
- [x] Transaction idempotency
- [x] Fraud detection active

## Incident Response

### 1. Procédure d'Urgence

1. Détection : Alertes automatiques
2. Isolement : Blocage IP/Utilisateur
3. Investigation : Analyse logs audit
4. Mitigation : Correctifs urgents
5. Recovery : Retour à la normale
6. Post-Mortem : Documentation et amélioration

### 2. Contacts d'Urgence

- Technical Lead : Escalation technique
- Supabase Support : Infrastructure issues
- Stripe Support : Payment incidents
- Vercel Support : Hosting issues

## Roadmap Sécurité

### Court Terme (Q1 2025)

- [ ] Implémentation WAF (Web Application Firewall)
- [ ] Tests de pénétration automatisés
- [ ] Monitoring avancé avec alertes Slack

### Moyen Terme (Q2 2025)

- [ ] Certificate Transparency monitoring
- [ ] Advanced Threat Protection
- [ ] Security headers automation

### Long Terme (Q3-Q4 2025)

- [ ] Zero Trust Architecture
- [ ] Advanced Analytics & AI threat detection
- [ ] SOC 2 Type II Compliance

---

## Conclusion

La sécurité HerbisVeritas suit les standards enterprise avec :

- Defense in Depth : Multiple couches de protection
- Zero Trust : Vérification à chaque étape
- Automated Security : Tests et monitoring continus
- Compliance Ready : PCI DSS, GDPR compatible
- Incident Prepared : Procédures d'urgence définies

La plateforme est prête pour un environnement production critique avec des données sensibles de clients et transactions financières.

---

_Document maintenu par l'équipe sécurité HerbisVeritas_
