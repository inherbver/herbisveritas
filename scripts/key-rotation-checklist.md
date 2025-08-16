# Checklist de Rotation des Clés Supabase

## ⚠️ AVANT LA ROTATION

### Pré-requis
- [ ] Application en mode maintenance ou hors heures de pointe
- [ ] Backup récent de la base de données
- [ ] Accès à l'interface d'administration Supabase
- [ ] Droits d'administration sur le projet Supabase
- [ ] Variables d'environnement actuelles documentées

### Validation de l'état actuel
- [ ] `.env.local` contient toutes les clés requises
- [ ] Application fonctionne correctement avec les clés actuelles
- [ ] Tests de connectivité passent
- [ ] Aucune opération critique en cours

## 🔄 PENDANT LA ROTATION

### Étapes automatisées (script)
- [ ] Validation des clés actuelles
- [ ] Création du backup automatique
- [ ] Génération des nouvelles clés (via API Supabase)
- [ ] Tests de connectivité avec nouvelles clés
- [ ] Mise à jour du fichier `.env.local`
- [ ] Validation post-rotation

### Commandes à exécuter
```bash
# 1. Lancer le script de rotation
npm run tsx scripts/supabase-key-rotation.ts

# 2. Redémarrer l'application
npm run dev

# 3. Valider le fonctionnement
npm run test
```

## ✅ APRÈS LA ROTATION

### Tests de validation
- [ ] Connexion utilisateur fonctionne
- [ ] Opérations CRUD sur les données
- [ ] Upload de fichiers
- [ ] Paiements Stripe (si applicable)
- [ ] Interface d'administration
- [ ] Logs d'audit générés correctement

### Monitoring post-rotation
- [ ] Surveiller les logs d'erreurs (30 min)
- [ ] Vérifier les métriques de performance
- [ ] Tester les fonctionnalités critiques
- [ ] Vérifier l'intégrité des données

## 🚨 PROCÉDURE D'URGENCE (ROLLBACK)

### Si problème détecté
1. **Arrêt immédiat de l'application**
   ```bash
   # Arrêter le serveur de développement
   Ctrl+C
   ```

2. **Restauration automatique**
   ```bash
   # Le script inclut un rollback automatique
   # Ou restauration manuelle :
   cp backups/env-backup-[timestamp].txt .env.local
   ```

3. **Redémarrage et validation**
   ```bash
   npm run dev
   npm run test
   ```

### Contacts d'urgence
- **Admin Supabase**: [Votre contact]
- **DevOps**: [Votre contact]
- **Support technique**: [Votre contact]

## 📋 CHECKLIST SPÉCIFIQUE HERBISVERITAS

### Tests fonctionnels critiques
- [ ] Connexion administrateur
- [ ] Gestion des produits (CRUD)
- [ ] Système de panier
- [ ] Processus de commande
- [ ] Upload d'images produits
- [ ] Système de newsletter
- [ ] Gestion des marchés

### Variables d'environnement à vérifier
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ADMIN_PRINCIPAL_ID` (à supprimer après Phase 3)
- [ ] Clés Stripe (non affectées)

### Fichiers de log à surveiller
- [ ] Console du navigateur (erreurs JS)
- [ ] Logs serveur Next.js
- [ ] Logs Supabase (interface admin)
- [ ] Table `audit_logs` en base

## 📊 MÉTRIQUES DE SUCCÈS

### Performance
- [ ] Temps de réponse API < 500ms
- [ ] Taux d'erreur < 1%
- [ ] Disponibilité > 99.9%

### Sécurité
- [ ] Nouvelles clés fonctionnelles
- [ ] Anciennes clés révoquées
- [ ] Logs de sécurité normaux
- [ ] Aucune alerte de sécurité

### Fonctionnel
- [ ] Toutes les fonctionnalités testées
- [ ] Données intègres
- [ ] Utilisateurs peuvent se connecter
- [ ] Admin peut gérer le contenu

## 🔒 SÉCURITÉ POST-ROTATION

### Validation de sécurité
- [ ] Anciennes clés supprimées des backups après 7 jours
- [ ] Nouvelles clés stockées de façon sécurisée
- [ ] Accès aux backups restreint
- [ ] Documentation mise à jour

### Bonnes pratiques
- [ ] Rotation programmée (tous les 90 jours)
- [ ] Monitoring automatique des clés
- [ ] Alertes en cas d'usage suspect
- [ ] Formation équipe sur procédures

---

**Date de dernière rotation**: [À compléter]
**Prochaine rotation programmée**: [À compléter]
**Responsable**: [À compléter]