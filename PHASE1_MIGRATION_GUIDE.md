# 🚨 PHASE 1 - Guide de Migration Sécurisée

## ⚠️ ACTIONS URGENTES À EFFECTUER IMMÉDIATEMENT

### 1. Révoquer les Secrets Exposés

**CRITIQUE** - Ces actions doivent être effectuées maintenant :

#### Supabase

1. Aller sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet `esgirafriwoildqcwtjm`
3. Aller dans `Settings` → `API`
4. Cliquer sur `Regenerate` pour :
   - `anon public` key
   - `service_role secret` key
5. Noter les nouvelles clés

#### Stripe

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Aller dans `Developers` → `API Keys`
3. Supprimer les anciennes clés de test
4. Créer de nouvelles clés
5. Aller dans `Developers` → `Webhooks`
6. Reconfigurer le webhook avec la nouvelle signing secret

### 2. Configuration Locale Sécurisée

```bash
# 1. Supprimer l'ancien fichier exposé
rm .env.local

# 2. Copier le nouveau template
cp .env.example .env.local

# 3. Éditer .env.local avec les NOUVELLES clés
# ATTENTION: Utiliser uniquement les clés régénérées
```

**Contenu de votre nouveau `.env.local`** :

```bash
# Supabase (NOUVELLES clés)
NEXT_PUBLIC_SUPABASE_URL=https://esgirafriwoildqcwtjm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=nouvelle_anon_key_ici
SUPABASE_SERVICE_ROLE_KEY=nouvelle_service_role_key_ici

# Stripe (NOUVELLES clés)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_nouvelle_cle
STRIPE_SECRET_KEY=sk_test_nouvelle_cle
STRIPE_WEBHOOK_SECRET=whsec_nouveau_secret

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Admin (temporaire - sera déplacé en base)
ADMIN_PRINCIPAL_ID=245eba22-0041-44d1-94ee-9ca71d3d561d
INTERNAL_FUNCTION_SECRET=votre_nouveau_secret_32_caracteres
```

### 3. Exécuter les Migrations

```bash
# Appliquer la nouvelle migration de sécurité
npx supabase migration up

# Ou si vous utilisez Supabase directement
# Exécuter le fichier: supabase/migrations/20250119120000_add_role_based_admin_system.sql
```

### 4. Tester la Configuration

```bash
# Démarrer l'application
npm run dev

# L'app doit démarrer sans erreur
# Si erreur, vérifier la configuration des variables
```

### 5. Vérifier la Sécurité

1. Aller sur `http://localhost:3000/fr/admin/security-test`
2. Se connecter avec votre compte admin
3. Vérifier que tous les tests passent
4. Corriger les erreurs si nécessaire

## 📋 Checklist de Validation

- [ ] ✅ Secrets Supabase régénérés
- [ ] ✅ Secrets Stripe régénérés
- [ ] ✅ Fichier `.env.local` reconfiguré avec nouvelles clés
- [ ] ✅ Migration database exécutée
- [ ] ✅ Application démarre sans erreur
- [ ] ✅ Page de test sécurité accessible (`/admin/security-test`)
- [ ] ✅ Tous les tests de sécurité passent
- [ ] ✅ Logs de sécurité fonctionnels

## 🔧 Résolution des Problèmes Courants

### Erreur: "Configuration d'environnement invalide"

- Vérifier que toutes les variables sont définies dans `.env.local`
- Vérifier que les clés Stripe commencent par `pk_test_` et `sk_test_`
- Vérifier que l'URL Supabase est bien formée

### Erreur: "Database access error"

- Vérifier que la migration a été appliquée
- Vérifier les permissions RLS
- Consulter les logs Supabase

### Erreur: "Admin access denied"

- Vérifier que votre utilisateur a le rôle 'admin' en base
- Exécuter cette requête SQL dans Supabase :

```sql
UPDATE profiles
SET role = 'admin', permissions = '["*"]'::JSONB
WHERE id = 'votre-user-id';
```

### Page `/admin/security-test` inaccessible

- Vérifier que vous êtes connecté
- Vérifier votre rôle admin en base
- Consulter les logs du middleware

## 🚀 Après la Migration

### Configuration Production

- Configurer les variables d'environnement sur Vercel/Netlify
- Activer les alertes Stripe et Supabase
- Configurer la rotation automatique des secrets (90 jours)

### Monitoring

- Consulter régulièrement `/admin/security-test`
- Surveiller les logs `audit_logs` en base
- Configurer des alertes sur les tentatives d'accès non autorisées

### Documentation Équipe

- Partager ce guide avec l'équipe
- Former sur la nouvelle gestion des secrets
- Documenter les procédures d'urgence

## 📞 Support

En cas de problème :

1. Consulter les logs de l'application
2. Vérifier la configuration via `/admin/security-test`
3. Consulter la documentation mise à jour dans `doc/SECURITY.md`

---

**✅ Phase 1 terminée avec succès ?**
Vous pouvez passer à la Phase 2 : Optimisation des performances (Semaine 2)
