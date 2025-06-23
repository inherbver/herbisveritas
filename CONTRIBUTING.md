# Guide de Contribution

## Installation

1. **Prérequis**

   - Node.js 18+
   - npm 9+
   - Compte Supabase

2. **Configuration**

   ```bash
   # Cloner le dépôt
   git clone [URL_DU_REPO]
   cd herbisveritas

   # Installer les dépendances
   npm install

   # Copier les variables d'environnement
   cp .env.example .env.local
   ```

3. **Variables d'Environnement**
   - Configurer les variables dans `.env.local`
   - Ne jamais commiter le fichier `.env.local`

## Workflow Git

### Branches

- `main` : Branche de production
- `staging` : Branche de préproduction
- `feature/*` : Nouvelles fonctionnalités
- `fix/*` : Corrections de bugs
- `docs/*` : Mises à jour de documentation

### Commits

Format : `type(scope): description`

**Types :**

- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `style` : Formatage, point-virgule manquant...
- `refactor` : Refactoring de code
- `perf` : Amélioration des performances
- `test` : Ajout ou modification de tests
- `chore` : Mise à jour des tâches de construction, gestionnaire de paquets...

**Exemple :**

```
feat(auth): ajout de la connexion avec Google
fix(panier): correction du calcul du total
docs: mise à jour du README
```

## Standards de Code

### TypeScript

- Activer `strict: true`
- Éviter `any`
- Utiliser les types générés par Supabase

### Composants

- Un composant par fichier
- Noms en PascalCase
- Props typées avec TypeScript
- Documentation des props avec JSDoc

### Styles

- Utiliser Tailwind CSS
- Éviter les styles inline
- Utiliser les variables CSS pour les couleurs/thèmes

## Tests

### Linting

```bash
# Vérifier le code
npm run lint

# Corriger automatiquement
npm run lint:fix
```

### Tests Unitaires

```bash
# Lancer les tests
npm test

# Lancer en mode watch
npm test -- --watch
```

### Tests E2E

```bash
# Lancer les tests E2E
npm run test:e2e
```

## Revue de Code

### Avant de Soumettre une PR

1. Exécuter les tests
2. Vérifier le linter
3. Mettre à jour la documentation si nécessaire
4. Vérifier les conflits

### Processus de Revue

1. Créer une Pull Request
2. Assigner des relecteurs
3. Résoudre les commentaires
4. Fusionner après approbation

## Déploiement

### Branche `main`

- Déploiement automatique en production
- Tests automatisés requis
- Revue d'au moins un développeur senior

### Branche `staging`

- Environnement de test
- Tests d'intégration
- Vérification manuelle recommandée

## Support

### Problèmes Connus

- [ ] Problème avec le chargement des images dans IE11
- [ ] Problème de performance sur la page de paiement

### Demande d'Aide

1. Vérifier les issues existantes
2. Créer une nouvelle issue si nécessaire
3. Décrire le problème en détail
4. Inclure les étapes pour reproduire
