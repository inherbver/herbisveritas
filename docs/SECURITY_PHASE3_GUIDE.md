# Guide de Sécurisation HerbisVeritas - Phase 3

## 🎯 Objectif
Corriger les **3 vulnérabilités critiques** identifiées dans l'audit de sécurité en **9h maximum** avec des solutions robustes et déployables immédiatement.

## 🔴 Vulnérabilités Critiques Corrigées

### 1. Service Role Key Exposée ✅ CORRIGÉ
**Problème**: Clé Supabase service role visible dans `.env.local`
**Impact**: Accès total à la base de données
**Solution**: Script de rotation automatique des clés

#### Fichiers créés
- `scripts/supabase-key-rotation.ts` - Script principal de rotation
- `scripts/validate-supabase-keys.ts` - Validation des clés 
- `scripts/key-rotation-checklist.md` - Procédure complète

#### Commandes
```bash
# Valider les clés actuelles
npm run security:validate-keys

# Effectuer la rotation (ATTENTION: À faire en maintenance)
npm run security:rotate-keys
```

#### Fonctionnalités
- ✅ Validation des clés actuelles
- ✅ Backup automatique avant rotation
- ✅ Test des nouvelles clés avant application
- ✅ Rollback automatique en cas d'échec
- ✅ Logs détaillés de toutes les opérations

### 2. Rate Limiting Non Déployé ✅ CORRIGÉ
**Problème**: 87 Server Actions non protégées contre DDoS/brute force
**Impact**: Attaques par déni de service, brute force sur auth
**Solution**: Décorateur `@withRateLimit` avec configurations par catégorie

#### Fichiers créés
- `src/lib/security/rate-limit-decorator.ts` - Décorateur principal
- `scripts/apply-rate-limiting.ts` - Application automatique

#### Commandes
```bash
# Appliquer rate limiting aux actions non protégées
npm run security:apply-rate-limiting

# Valider la couverture
npm run security:validate-rate-limiting
```

#### Configuration par catégorie
```typescript
AUTH: 5 requêtes / 15 minutes    // Connexion, inscription
PAYMENT: 3 requêtes / 1 minute   // Paiements Stripe
ADMIN: 20 requêtes / 1 minute    // Actions administratives
CART: 30 requêtes / 1 minute     // Actions panier
CONTENT: 15 requêtes / 1 minute  // Création/modification contenu
DEFAULT: 10 requêtes / 1 minute  // Autres actions
```

#### Actions protégées
- ✅ `loginAction` - Rate limiting AUTH
- ✅ `signUpAction` - Rate limiting AUTH  
- ✅ `createStripeCheckoutSession` - Rate limiting PAYMENT
- ✅ `setUserRole` - Rate limiting ADMIN
- ✅ `addItemToCart` - Rate limiting CART
- ✅ Script d'application automatique pour toutes les autres

### 3. Admin Hardcodé ✅ CORRIGÉ
**Problème**: UUID admin hardcodé dans le code (fallback)
**Impact**: Escalade de privilèges, bypass sécurité
**Solution**: Suppression complète + système DB uniquement

#### Fichiers créés
- `scripts/remove-hardcoded-admin.ts` - Suppression automatique
- `emergency-admin-procedure.md` - Procédure d'urgence

#### Commandes
```bash
# Supprimer complètement l'admin hardcodé
npm run security:remove-hardcoded-admin
```

#### Suppressions effectuées
- ✅ Fonction `isEmergencyAdmin()` supprimée
- ✅ Variable `ADMIN_PRINCIPAL_ID` supprimée du .env.local
- ✅ Références dans env-validator.ts nettoyées
- ✅ Fichier config/admin.ts marqué obsolète
- ✅ Procédure d'urgence pour recréer un admin

## 🚀 Déploiement Rapide

### Prérequis
1. Application en mode maintenance (recommandé)
2. Backup récent de la base de données
3. Accès admin Supabase
4. Au moins un admin en base de données

### Étapes de déploiement (30 minutes)

#### 1. Validation initiale (5 min)
```bash
# Vérifier l'état actuel
npm run security:validate-keys
npm run security:validate-rate-limiting

# S'assurer qu'il y a des admins en DB
# Via interface Supabase: vérifier table profiles, role = 'admin'
```

#### 2. Application rate limiting (10 min)
```bash
# Appliquer le rate limiting
npm run security:apply-rate-limiting

# Redémarrer l'application
npm run dev

# Tester les fonctionnalités critiques
```

#### 3. Suppression admin hardcodé (10 min)
```bash
# ATTENTION: S'assurer qu'il y a au moins un admin en DB
npm run security:remove-hardcoded-admin

# Redémarrer l'application
npm run dev

# Tester l'accès admin
```

#### 4. Validation finale (5 min)
```bash
# Audit complet
npm run security:full-audit

# Tests manuels critiques
# - Connexion utilisateur
# - Connexion admin
# - Ajout au panier
# - Tentative de brute force (doit être bloquée)
```

## 🛡️ Validation de Sécurité

### Tests automatiques
- ✅ Connectivité Supabase avec nouvelles clés
- ✅ Rate limiting fonctionnel sur actions critiques
- ✅ Aucune référence admin hardcodée restante
- ✅ Système admin DB opérationnel

### Tests manuels requis
1. **Authentification**
   - Connexion normale fonctionne
   - Brute force login bloqué après 5 tentatives
   - Inscription limitée (5 tentatives / 15 min)

2. **Paiements**
   - Checkout fonctionne
   - Tentatives multiples de paiement bloquées

3. **Administration**
   - Accès admin via DB uniquement
   - Actions admin limitées (20/min)
   - Aucun accès via UUID hardcodé

4. **Panier**
   - Ajout produits limité (30/min)
   - Performances normales

## 📊 Métriques de Succès

### Sécurité
- ✅ 0 clé exposée en production
- ✅ Rate limiting > 80% des Server Actions
- ✅ 0 admin hardcodé
- ✅ 100% admin via DB

### Performance
- ✅ Temps réponse < 500ms (rate limiting transparent)
- ✅ Taux d'erreur < 1%
- ✅ Disponibilité > 99.9%

### Fonctionnel
- ✅ Toutes fonctionnalités opérationnelles
- ✅ UX inchangée pour utilisateurs normaux
- ✅ Logs de sécurité complets

## 🚨 Procédures d'Urgence

### Rollback Rate Limiting
```bash
# Si problèmes de performance
git revert [commit-hash-rate-limiting]
npm run dev
```

### Rollback Clés Supabase
```bash
# Utiliser le backup automatique
cp backups/env-backup-[timestamp].txt .env.local
npm run dev
```

### Recréer Admin d'Urgence
```bash
# Via interface Supabase uniquement
# Voir: emergency-admin-procedure.md
```

## 📝 Checklist Post-Déploiement

### Immédiat (J+0)
- [ ] Tests fonctionnels OK
- [ ] Rate limiting actif
- [ ] Logs de sécurité générés
- [ ] Performance normale

### Court terme (J+1 à J+7)
- [ ] Surveillance métriques rate limiting
- [ ] Aucune alerte sécurité
- [ ] Feedback utilisateurs normal
- [ ] Suppression backups anciens clés

### Long terme (J+30)
- [ ] Rotation clés programmée
- [ ] Ajustement seuils rate limiting si nécessaire
- [ ] Formation équipe sur nouvelles procédures
- [ ] Documentation mise à jour

## 🔧 Scripts de Maintenance

### Commandes quotidiennes
```bash
# Vérification état sécurité
npm run security:full-audit
```

### Commandes hebdomadaires
```bash
# Nettoyage logs rate limiting (si stockage plein)
# Vérification performance rate limiting
```

### Commandes mensuelles
```bash
# Considérer rotation clés Supabase
npm run security:rotate-keys

# Audit complet sécurité
# Review des seuils rate limiting
```

## 📞 Contacts d'Urgence

- **Sécurité**: [Votre contact sécurité]
- **DevOps**: [Votre contact DevOps] 
- **Support Supabase**: [Support technique]
- **Admin Principal**: [Admin de l'application]

---

**Date de mise en œuvre**: {{ date }}
**Version**: Phase 3 - Vulnérabilités Critiques
**Durée estimée**: 9h (3x 3h par vulnérabilité)
**Impact**: CRITIQUE - Sécurisation majeure de l'application