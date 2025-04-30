# CONTRIBUTING.md

# CONTRIBUTING.md

## Conventions de nommage (branches & commits)

- Branches : préfixer par `feat/` (fonctionnalité), `fix/` (correction), `chore/` (maintenance), suivi d’un nom explicite en kebab-case. Exemple : `feat/design-system`, `fix/panier-quantite`.
- Commits : débuter par `feat:`, `fix:`, ou `chore:`, puis une description concise en français. Exemple : `feat: ajout du tunnel de commande`.

## Workflow Git
- Fork, branche feature, pull request
- Convention de nommage des branches : `feature/`, `fix/`, `chore/`, `test/`, `refactor/`
- Revue de code obligatoire avant merge

## Conventions de code
- Style AirBnB, Prettier, ESLint
- PascalCase pour les composants
- Exports nommés uniquement
- Privilégier les balises HTML sémantiques
- Tests présents pour toute nouvelle fonctionnalité, **dès la conception**
- Tous les composants sont centralisés dans `src/components/` (sauf exceptions documentées)
- Centralisation des couleurs/thème dans un fichier tokens unique
- Préparation i18n Fr/En dès la structure
- Structure compatible avec ajout ultérieur de Prisma
- Gestion des environnements (dev, test, prod) respectée

## Bonnes pratiques
- Documentation à jour (README, TUTORIAL, PROJECT)
- Respect de l’accessibilité et du SEO

# TESTING.md

# TESTING.md

## Stratégie de Test (Approche Progressive)

L'objectif est d'assurer la qualité et la robustesse de l'application via une approche de test progressive, démarrant par les fondations critiques.

### Phase Initiale : Tests Unitaires Critiques

*   **Focus :** Tests unitaires avec **Jest** et **React Testing Library (RTL)**.
*   **Priorité :** Composants UI complexes (ex: formulaires avec validation, composants interactifs avec état), logique métier critique (ex: calculs du panier, helpers de transformation de données), hooks personnalisés.
*   **Objectif :** Valider le fonctionnement isolé des briques fondamentales et complexes de l'application.

### Phases Ultérieures : Élargissement de la Couverture

*   **Tests d'Intégration (Jest/RTL/MSW) :** Vérifier les interactions entre plusieurs composants ou entre composants et mocks d'API (ex: soumission de formulaire, flux simple dans une page).
*   **Tests End-to-End (Playwright) :** Valider les parcours utilisateurs clés de bout en bout dans un environnement proche de la production (ex: inscription, ajout au panier complet, processus de commande guest/user). Ces tests seront introduits progressivement après stabilisation des fonctionnalités majeures.
*   **Tests d'Accessibilité Automatisés (jest-axe) :** Intégrés aux tests unitaires/intégration pour détecter les problèmes d'accessibilité courants.
*   **Tests SEO Automatisés (Lighthouse CI / équivalent) :** Intégrés à la CI pour surveiller les performances, l'accessibilité et les bonnes pratiques SEO de base.

## Structure Recommandée

*   `src/__tests__/` ou fichiers `.test.tsx` / `.spec.tsx` co-localisés avec les composants/modules pour les tests unitaires et d'intégration.
*   `e2e/` à la racine pour les tests End-to-End (Playwright).

## Bonnes Pratiques (Focus Initial)

*   **Prioriser les tests unitaires pour les nouvelles fonctionnalités complexes ou critiques** dès leur développement.
*   Écrire des tests clairs, lisibles et maintenables.
*   Tester le comportement du point de vue de l'utilisateur, pas les détails d'implémentation.
*   Utiliser des `data-testid` judicieusement pour sélectionner des éléments de manière robuste.
*   **Intégrer les tests unitaires à la CI (GitHub Actions)** pour qu'ils s'exécutent automatiquement à chaque push/PR.

*   Viser une couverture de code *raisonnable* sur les parties critiques, sans chercher le 100% à tout prix initialement.
*   Préparer la structure des tests pour l'internationalisation (i18n) si applicable aux composants testés.

---

*(Les checklists SEO Technique et Éditoriale détaillées se trouvent dans les documents de projet et de conception généraux, pas dans la stratégie de test elle-même)*

