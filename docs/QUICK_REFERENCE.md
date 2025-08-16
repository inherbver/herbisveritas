# Quick Reference Guide - HerbisVeritas

## 🚀 Commandes Essentielles (1 minute)

### Développement Local
```bash
# Setup complet nouveau projet
git clone [repo] && cd herbisveritas
npm install && cp .env.example .env.local
npm run dev

# Validation pré-commit (obligatoire)
npm run lint && npm run type-check && npm run test

# Debug performance locale
npm run dev:profile
npm run analyze
```

### Production Operations
```bash
# Health check rapide
curl https://herbisveritas.com/api/health

# Emergency rollback
npm run rollback:emergency

# Performance status
npm run status:performance

# Security status
npm run status:security
```

---

## 🛡️ Sécurité Express

### Rate Limiting Quick Check
```typescript
// Vérifier si une action est protégée
@withRateLimit('AUTH') // ✅ Protégé
export async function loginAction() {}

export async function unprotectedAction() {} // ❌ À protéger
```

### Security Validation
```bash
# Scan sécurité rapide
npm run security:quick-scan

# Bloquer une IP suspecte
npm run security:block-ip --ip=1.2.3.4

# Check rate limiting stats
npm run security:rate-limit-stats
```

---

## ⚡ Performance Quick Fixes

### Cache Troubleshooting
```bash
# Cache status
npm run cache:status

# Clear all cache
npm run cache:clear

# Warm up cache
npm run cache:warm-critical-paths
```

### Database Performance
```bash
# Slow queries detection
npm run db:slow-queries --last=1h

# Index usage analysis
npm run db:index-analysis

# Quick optimization
npm run db:optimize-critical
```

---

## 🎯 Patterns de Code Critique

### Server Actions (Pattern obligatoire)
```typescript
// ✅ CORRECT - Result Pattern
export async function createAction(data: Data): Promise<Result<Item, Error>> {
  try {
    const validated = schema.parse(data);
    const result = await service.create(validated);
    return ok(result);
  } catch (error) {
    logger.error('Creation failed', { error, data });
    return err(new ActionError('CREATION_FAILED'));
  }
}

// ❌ INCORRECT - Pas de validation/error handling
export async function badAction(data: any) {
  return await db.insert(data); // Pas sécurisé
}
```

### Cache Strategy
```typescript
// ✅ CORRECT - Cache avec tags
const products = await cache.get(
  'products:active',
  () => getActiveProducts(),
  { ttl: 300, tags: ['products'] }
);

// Invalidation propre
await cache.invalidate(['products']);
```

### Error Handling UI
```typescript
// ✅ CORRECT - Gestion d'erreur typée
const result = await updateAction(data);
if (result.isError) {
  switch (result.error.code) {
    case 'VALIDATION_ERROR':
      setError('Données invalides');
      break;
    case 'UNAUTHORIZED':
      redirect('/login');
      break;
    default:
      setError('Erreur inattendue');
  }
  return;
}
```

---

## 📊 Métriques Critiques

### Performance Targets
- **Response Time** : < 500ms
- **Error Rate** : < 1%
- **Cache Hit Rate** : > 90%
- **Core Web Vitals** : Excellent

### Security Metrics
- **Rate Limiting** : 100% coverage
- **Failed Logins** : < 20/min per IP
- **Security Incidents** : 0 critical

### Business KPIs
- **Conversion Rate** : > 2.5%
- **Cart Abandonment** : < 70%
- **Payment Success** : > 98%

---

## 🚨 Troubleshooting Express

### Page Lente (> 2s)
```bash
# 1. Check cache
npm run cache:status --page=/slow-page

# 2. Database queries
npm run db:explain --page=/slow-page

# 3. Bundle analysis
npm run analyze:page --page=/slow-page

# 4. Quick fix
npm run performance:optimize --page=/slow-page
```

### Erreurs 500
```bash
# 1. Logs immédiat
npm run logs:tail --error --last=5m

# 2. Rollback si critique
npm run rollback:last-stable

# 3. Monitoring
npm run monitoring:error-spike-analysis
```

### Rate Limiting Issues
```bash
# User bloqué légitimement
npm run security:whitelist-add --user=user_id --duration=1h

# Ajuster les seuils
npm run security:adjust-thresholds --category=CART --increase=50%

# Stats blocages
npm run security:blocking-stats --last=24h
```

---

## 📞 Contacts Urgents

### Escalation Niveaux
1. **Docs + Scripts** (ce guide)
2. **Team Slack** `#dev-herbisveritas`
3. **Tech Lead** `@tech-lead`
4. **Emergency** `+33 X XX XX XX XX`

### Urgences par Type
- **Performance** : @devops-team
- **Sécurité** : @security-officer  
- **Payments** : @business-owner
- **Infrastructure** : @platform-team

---

## 🔗 Liens Rapides

### Dashboards Production
- [Performance](https://herbisveritas.com/admin/performance)
- [Security](https://herbisveritas.com/admin/security)
- [Analytics](https://herbisveritas.com/admin/analytics)
- [Health Status](https://herbisveritas.com/api/health)

### Documentation
- [Phase 4 Doc Essentielle](./PHASE_4_DOCUMENTATION_ESSENTIELLE.md)
- [Guide Développeur](./DEVELOPER_GUIDE.md)
- [ADR Cart](./ADR/ADR-001-cart-architecture-consolidation.md)
- [ADR Sécurité](./ADR/ADR-004-security-rate-limiting.md)
- [ADR Performance](./ADR/ADR-003-database-performance-strategy.md)

### External Tools
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Vercel Dashboard](https://vercel.com/dashboard)

---

## ⚡ One-Liners Essentiels

```bash
# Status global en 10 secondes
npm run status:all

# Performance check complet
npm run health-check:production

# Emergency mode (si tout va mal)
npm run emergency:assess-and-fix

# Post-incident cleanup
npm run incident:cleanup --id=$INCIDENT_ID

# Weekly health report
npm run report:weekly-health

# Security daily check
npm run security:daily-audit

# Performance optimization
npm run optimize:critical-paths

# Cache health
npm run cache:health-report
```

---

**🎯 Quick Reference - HerbisVeritas**  
*Version 1.0 - 16 août 2025*  
*Usage : Daily operations*