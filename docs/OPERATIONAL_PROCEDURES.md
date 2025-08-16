# Procédures Opérationnelles HerbisVeritas

## 🚀 Déploiement Production

### Checklist Pré-Déploiement (3 minutes)

```bash
#!/bin/bash
# Script: scripts/pre-deploy-check.sh

echo "🔍 Phase 1: Tests et Validation"
npm run lint || exit 1
npm run type-check || exit 1
npm run test:unit || exit 1

echo "🛡️ Phase 2: Sécurité"  
npm run security:audit || exit 1
npm run security:dependencies || exit 1

echo "⚡ Phase 3: Performance"
npm run build || exit 1
npm run performance:lighthouse --threshold=90 || exit 1

echo "✅ Ready for deployment"
```

### Déploiement Standard

```bash
# 1. Pre-deployment checks
npm run pre-deploy-check

# 2. Database migrations (if any)
npm run db:migrate:production

# 3. Build optimized
npm run build

# 4. Deploy to production
npm run deploy:production

# 5. Post-deployment validation
npm run post-deploy-validate
```

### Validation Post-Déploiement (1 minute)

```bash
#!/bin/bash
# Script: scripts/post-deploy-validate.sh

# Health check
curl -f https://herbisveritas.com/api/health || exit 1

# Critical endpoints
curl -f https://herbisveritas.com/shop || exit 1
curl -f https://herbisveritas.com/api/auth/status || exit 1

# Performance validation
npm run performance:validate-production || exit 1

echo "✅ Deployment validated successfully"
```

---

## ⚡ Rollback d'Urgence

### Rollback Automatique (90 secondes)

```bash
#!/bin/bash
# Script: scripts/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# 1. Get last stable commit
LAST_STABLE=$(git log --oneline --grep="stable" -1 --format="%H")

# 2. Revert to stable
git checkout $LAST_STABLE
git push --force origin main

# 3. Trigger immediate redeploy
npm run deploy:emergency

# 4. Validate rollback
sleep 30
curl -f https://herbisveritas.com/api/health || echo "❌ ROLLBACK FAILED"

echo "✅ Emergency rollback completed"
```

### Triggers Rollback Automatique

```typescript
// monitoring/auto-rollback.ts
export const ROLLBACK_TRIGGERS = {
  ERROR_RATE_CRITICAL: {
    threshold: 5, // % error rate
    duration: 120, // seconds
    action: 'AUTO_ROLLBACK'
  },
  
  RESPONSE_TIME_CRITICAL: {
    threshold: 3000, // ms
    duration: 300, // seconds  
    action: 'AUTO_ROLLBACK'
  },
  
  HEALTH_CHECK_FAILURE: {
    consecutiveFailures: 3,
    action: 'AUTO_ROLLBACK'
  },
  
  SECURITY_BREACH: {
    sqlInjectionAttempts: 10,
    action: 'AUTO_ROLLBACK_AND_LOCKDOWN'
  }
};
```

---

## 🔐 Rotation Clés Sécurité

### Rotation Automatique (Cron)

```bash
# Crontab entries
# API Keys rotation (monthly)
0 0 1 * * /app/scripts/rotate-api-keys.sh

# JWT secrets rotation (bi-weekly)  
0 0 1,15 * * /app/scripts/rotate-jwt-secrets.sh

# Database passwords (quarterly)
0 0 1 */3 * /app/scripts/rotate-db-passwords.sh
```

### Script Rotation Clés API

```bash
#!/bin/bash
# Script: scripts/rotate-api-keys.sh

echo "🔐 Starting API keys rotation"

# 1. Generate new keys
NEW_SUPABASE_KEY=$(openssl rand -hex 32)
NEW_STRIPE_KEY=$(stripe keys create --name "production-$(date +%Y%m%d)")

# 2. Update environment variables
kubectl patch secret app-secrets \
  -p='{"data":{"SUPABASE_SERVICE_ROLE_KEY":"'$(echo $NEW_SUPABASE_KEY | base64)'"}}'

kubectl patch secret app-secrets \
  -p='{"data":{"STRIPE_SECRET_KEY":"'$(echo $NEW_STRIPE_KEY | base64)'"}}'

# 3. Rolling restart
kubectl rollout restart deployment/herbisveritas

# 4. Validate new keys
sleep 60
npm run validate:api-keys || echo "❌ Key rotation failed"

echo "✅ API keys rotation completed"
```

### Rotation d'Urgence (Manuelle)

```bash
# In case of security breach
npm run security:emergency-rotation

# This will:
# 1. Revoke all current keys
# 2. Generate new keys
# 3. Update all services
# 4. Force logout all users
# 5. Send security alert
```

---

## 📊 Monitoring & Alertes

### Health Checks Automatiques

```typescript
// api/health/route.ts
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkPayments(),
    checkCache(),
    checkExternalAPIs()
  ]);
  
  const isHealthy = checks.every(c => c.status === 'ok');
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
    version: process.env.VERCEL_GIT_COMMIT_SHA
  }, { 
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
```

### Alertes Critiques (Slack)

```typescript
// monitoring/alerts.ts
export const CRITICAL_ALERTS = {
  HEALTH_CHECK_FAILURE: {
    webhook: process.env.SLACK_WEBHOOK_CRITICAL,
    message: "🚨 Health check failure detected",
    escalation: ["@tech-lead", "@devops"]
  },
  
  HIGH_ERROR_RATE: {
    webhook: process.env.SLACK_WEBHOOK_ALERTS,
    message: "⚠️ Error rate above threshold",
    threshold: 2 // %
  },
  
  SECURITY_INCIDENT: {
    webhook: process.env.SLACK_WEBHOOK_SECURITY,
    message: "🔒 Security incident detected",
    escalation: ["@security-team", "@tech-lead"]
  },
  
  PAYMENT_FAILURES: {
    webhook: process.env.SLACK_WEBHOOK_BUSINESS,
    message: "💳 Payment failure spike detected",
    threshold: 5 // %
  }
};
```

---

## 🛠️ Maintenance Préventive

### Daily Tasks (Automatisées 6h00)

```bash
#!/bin/bash
# Script: scripts/daily-maintenance.sh

echo "🔧 Daily maintenance starting"

# 1. Clean old logs
find /var/log/app -name "*.log" -mtime +7 -delete

# 2. Cache optimization
npm run cache:optimize

# 3. Database maintenance
npm run db:analyze
npm run db:vacuum-analyze

# 4. Security scan
npm run security:daily-scan

# 5. Performance metrics collection
npm run metrics:collect-daily

echo "✅ Daily maintenance completed"
```

### Weekly Tasks (Dimanche 3h00)

```bash
#!/bin/bash
# Script: scripts/weekly-maintenance.sh

echo "🔧 Weekly maintenance starting"

# 1. Database optimization
npm run db:reindex
npm run db:update-statistics

# 2. Security updates
npm run security:update-dependencies
npm run security:vulnerability-scan

# 3. Performance analysis
npm run performance:weekly-report

# 4. Backup verification
npm run backup:verify-integrity

# 5. Cleanup unused resources
npm run cleanup:unused-images
npm run cleanup:old-logs

echo "✅ Weekly maintenance completed"
```

### Monthly Tasks (1er du mois)

```bash
#!/bin/bash
# Script: scripts/monthly-maintenance.sh

echo "🔧 Monthly maintenance starting"

# 1. Full security audit
npm run security:full-audit

# 2. Performance benchmarking
npm run performance:benchmark

# 3. Dependencies update
npm run dependencies:update-non-breaking

# 4. Database optimization
npm run db:full-optimization

# 5. Documentation review
npm run docs:link-check
npm run docs:outdated-check

echo "✅ Monthly maintenance completed"
```

---

## 🚨 Incident Response

### Procédure d'Incident (Niveau 1-4)

#### Niveau 1: Critique (Production Down)
```bash
# 1. Alert team immediately
npm run incident:alert-critical

# 2. Start incident response
npm run incident:start --level=1

# 3. Execute emergency procedures
npm run emergency:assess-damage
npm run emergency:restore-service

# 4. Communication
npm run incident:status-page-update "Investigating critical issue"
```

#### Niveau 2: Majeur (Feature Impact)
```bash
# 1. Assess impact
npm run incident:assess --level=2

# 2. Implement workaround
npm run incident:workaround

# 3. Schedule fix
npm run incident:schedule-fix

# 4. Monitor closely
npm run monitoring:enhanced-mode
```

### Post-Mortem Automatique

```typescript
// After any Level 1 or 2 incident
export async function generatePostMortem(incidentId: string) {
  const incident = await getIncident(incidentId);
  
  const postMortem = {
    title: `Incident ${incidentId} - ${incident.title}`,
    timeline: incident.timeline,
    rootCause: incident.rootCause,
    impact: {
      duration: incident.duration,
      usersAffected: incident.usersAffected,
      revenueImpact: incident.revenueImpact
    },
    resolution: incident.resolution,
    actionItems: incident.actionItems.map(item => ({
      ...item,
      owner: item.assignee,
      dueDate: addDays(new Date(), 14)
    }))
  };
  
  await savePostMortem(postMortem);
  await notifyTeam(postMortem);
  
  return postMortem;
}
```

---

## 📈 Performance Monitoring

### Performance Budgets

```typescript
// performance/budgets.ts
export const PERFORMANCE_BUDGETS = {
  '/': {
    lcp: 1500, // ms
    fid: 100,  // ms
    cls: 0.1,  // score
    bundleSize: 150 // KB
  },
  '/shop': {
    lcp: 2000,
    fid: 100,
    cls: 0.1,
    bundleSize: 200
  },
  '/admin/*': {
    lcp: 3000,
    fid: 150,
    cls: 0.15,
    bundleSize: 300
  }
};
```

### Continuous Performance Monitoring

```bash
# Hourly performance checks
*/10 * * * * /app/scripts/performance-check.sh

# Performance check script
#!/bin/bash
PERFORMANCE_SCORE=$(lighthouse --chrome-flags="--headless" --output=json https://herbisveritas.com | jq '.categories.performance.score * 100')

if [ $PERFORMANCE_SCORE -lt 90 ]; then
  echo "⚠️ Performance degradation detected: $PERFORMANCE_SCORE/100"
  curl -X POST $SLACK_WEBHOOK_PERFORMANCE \
    -H 'Content-type: application/json' \
    --data '{"text":"⚠️ Performance alert: Score dropped to '$PERFORMANCE_SCORE'/100"}'
fi
```

---

## 🔧 Quick Reference Commands

### Emergency Commands
```bash
# Complete system restart
npm run system:restart

# Emergency maintenance mode
npm run maintenance:enable
npm run maintenance:disable

# Security lockdown
npm run security:lockdown
npm run security:unlock

# Performance emergency
npm run performance:emergency-cache-clear
npm run performance:emergency-optimization
```

### Debugging Commands
```bash
# Real-time logs
npm run logs:tail --level=error
npm run logs:search --query="payment_failed"

# Performance debugging
npm run debug:performance --url=/shop
npm run debug:database --slow-queries

# Security debugging
npm run debug:security --suspicious-activity
npm run debug:rate-limiting --user=user_id
```

### Status Commands
```bash
# System status
npm run status:health
npm run status:performance
npm run status:security

# Business metrics
npm run metrics:business --last=24h
npm run metrics:conversion --last=7d
npm run metrics:revenue --last=30d
```

---

**🎯 Procédures Opérationnelles Critiques - HerbisVeritas**  
*Version 1.0 - 16 août 2025*  
*Usage : Équipe DevOps et développeurs*