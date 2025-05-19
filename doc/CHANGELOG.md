# Journal des Changements

## [Unreleased]

### Corrigé

- Résolu l'erreur `MISSING_MESSAGE` pour `HeroComponent` en français en ajoutant les traductions manquantes à `fr.json` et `en.json`.
- Corrigé l'avertissement React pour la propriété `imageAlt` transmise à un élément DOM dans `HeroComponent` en déstructurant `imageAlt` et en l'utilisant comme `aria-label`.
- Résolu l'avertissement Next.js 15+ `params should be awaited before using its properties` dans `src/app/[locale]/shop/page.tsx` en attendant explicitement `props.params` dans `generateMetadata` et `ShopPage` server component, aligné avec le nouveau comportement de App Router pour les paramètres 'Thenable'.

## [Non Versionné] - 2025-05-16

### Ajouté

- Nouvelle fonctionnalité de changement de mot de passe
- Documentation mise à jour pour refléter la structure actuelle du projet
- Configuration i18n améliorée avec support multilingue

### Modifié

- Refactorisation de la structure des composants
- Mise à jour des dépendances vers leurs dernières versions
- Amélioration des performances de chargement des pages

### Corrigé

- Problème de validation des formulaires
- Erreurs de traduction manquantes
- Problèmes de mise en page sur mobile
- Résolu l'erreur `MISSING_MESSAGE` pour `HeroComponent` en français en ajoutant les traductions manquantes à `fr.json` et `en.json`.
- Corrigé l'avertissement React pour la propriété `imageAlt` transmise à un élément DOM dans `HeroComponent` en déstructurant `imageAlt` et en l'utilisant comme `aria-label`.
- Résolu l'avertissement Next.js 15+ `params should be awaited before using its properties` dans `src/app/[locale]/shop/page.tsx` en attendant explicitement `props.params` dans `generateMetadata` et `ShopPage` server component, aligné avec le nouveau comportement de App Router pour les paramètres 'Thenable'.

## [0.2.0] - 2025-04-30

### Ajouté

- Système d'authentification complet
- Gestion du panier d'achat
- Intégration avec Stripe pour les paiements

### Modifié

- Amélioration des performances de la base de données
- Refonte de l'interface utilisateur

### Corrigé

- Problèmes de chargement des images
- Erreurs de validation des formulaires
- Problèmes de compatibilité navigateur

## [0.1.0] - 2025-03-15

### Ajouté

- Structure initiale du projet
- Configuration de base de Next.js et TypeScript
- Mise en place de l'environnement de développement

### Modifié

- Configuration de base de Supabase
- Structure des dossiers

## Problèmes Connus

### En Cours d'Investigation

- [ ] Problème de chargement des images dans IE11
- [ ] Légère latence sur la page de paiement

### Résolution des Problèmes

- **Problème** : Erreur de validation des formulaires

  - **Cause** : Problème avec la validation côté client
  - **Solution** : Implémentation de Zod pour la validation
  - **Statut** : Résolu

- **Problème** : Problèmes de performances sur mobile
  - **Cause** : Images non optimisées
  - **Solution** : Implémentation du chargement paresseux
  - **Statut** : En cours

## Améliorations à Venir

### Prochaines Fonctionnalités

- [ ] Système de recommandation de produits
- [ ] Intégration des avis clients
- [ ] Tableau de bord administrateur avancé

### Améliorations Techniques

- [ ] Migration vers la dernière version de Next.js
- [ ] Optimisation des requêtes GraphQL
- [ ] Amélioration du temps de chargement initial

## Notes de Version

### Versionnage Sémantique

- **MAJEUR** : Changements incompatibles avec les versions précédentes
- **MINEUR** : Ajout de fonctionnalités rétrocompatibles
- **PATCH** : Corrections de bugs rétrocompatibles

### Politique de Support

- Seule la dernière version majeure est maintenue activement
- Les correctifs de sécurité sont fournis pour la dernière version mineure de chaque version majeure

## Historique des Déploiements

| Version | Date       | Environnement | Statut   |
| ------- | ---------- | ------------- | -------- |
| 0.2.0   | 2025-04-30 | Production    | Stable   |
| 0.1.0   | 2025-03-15 | Production    | Obsolète |
