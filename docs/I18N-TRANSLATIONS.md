# Système de Traductions (i18n) - HerbisVeritas

## Vue d'Ensemble

Le projet HerbisVeritas utilise `next-intl` pour l'internationalisation avec une architecture basée sur des **namespaces** pour organiser les traductions par fonctionnalité.

## Configuration Générale

### Langues Supportées

- **Français (fr)** : Langue par défaut
- **Anglais (en)** : Langue secondaire

### Fichiers de Configuration

- `src/i18n-config.ts` : Configuration des locales
- `src/i18n.ts` : Configuration principale et chargement des namespaces
- `src/middleware.ts` : Gestion des routes localisées

## Architecture des Traductions

### Structure des Fichiers

```
src/i18n/messages/
├── fr/
│   ├── Global.json
│   ├── ProfileNav.json
│   ├── ProfileSettings.json
│   └── [AutreNamespace].json
└── en/
    ├── Global.json
    ├── ProfileNav.json
    ├── ProfileSettings.json
    └── [AutreNamespace].json
```

### Système de Namespaces

#### 1. Déclaration des Namespaces

Tous les namespaces doivent être déclarés dans `src/i18n.ts` :

```typescript
const namespaces = [
  "Global", // Traductions globales (header, footer, etc.)
  "ProfileNav", // Navigation du profil
  "ProfileSettings", // Page paramètres du profil
  "ShopPage", // Page boutique
  // ... autres namespaces
] as const;
```

#### 2. Chargement Automatique

Le système charge automatiquement tous les namespaces déclarés pour chaque locale.

## Utilisation des Traductions

### Dans les Server Components

```typescript
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("ProfileSettings");

  return (
    <h1>{t("title")}</h1>
  );
}
```

### Dans les Client Components

```typescript
"use client";
import { useTranslations } from "next-intl";

export function MyComponent() {
  const t = useTranslations("ProfileSettings");

  return (
    <button>{t("saveChanges")}</button>
  );
}
```

### Traductions Imbriquées

```json
{
  "newsletter": {
    "title": "Newsletter",
    "subscribe": "S'abonner",
    "unsubscribe": "Se désabonner"
  }
}
```

```typescript
const t = useTranslations("ProfileSettings");
// Utilisation : t("newsletter.title")
```

## Ajout de Nouvelles Traductions

### Étape 1 : Créer les Fichiers JSON

```bash
# Créer pour chaque langue
src/i18n/messages/fr/MonNamespace.json
src/i18n/messages/en/MonNamespace.json
```

### Étape 2 : Ajouter le Namespace

Dans `src/i18n.ts`, ajouter le namespace au tableau :

```typescript
const namespaces = [
  // ... namespaces existants
  "MonNamespace", // ← Ajouter ici
] as const;
```

### Étape 3 : Créer le Contenu

```json
// fr/MonNamespace.json
{
  "title": "Mon Titre",
  "description": "Ma description",
  "actions": {
    "save": "Enregistrer",
    "cancel": "Annuler"
  }
}
```

```json
// en/MonNamespace.json
{
  "title": "My Title",
  "description": "My description",
  "actions": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

## Conventions de Nommage

### Namespaces

- **PascalCase** : `ProfileSettings`, `AdminDashboard`
- **Descriptif** : Nom de la page ou fonctionnalité

### Clés de Traduction

- **camelCase** : `title`, `saveChanges`, `updateSuccess`
- **Hiérarchique** : Utiliser des objets pour grouper les traductions liées

### Exemples de Structure

```json
{
  "title": "Titre principal",
  "description": "Description",
  "form": {
    "labels": {
      "email": "Adresse e-mail",
      "password": "Mot de passe"
    },
    "placeholders": {
      "email": "Saisissez votre e-mail",
      "password": "Saisissez votre mot de passe"
    },
    "errors": {
      "required": "Ce champ est requis",
      "invalid": "Format invalide"
    }
  },
  "actions": {
    "submit": "Valider",
    "cancel": "Annuler",
    "reset": "Réinitialiser"
  }
}
```

## Gestion des Erreurs

### Messages Manquants

En développement, les clés manquantes affichent :

```
⚠️ MISSING: ProfileSettings.newsletter.title
```

### Fallbacks

Le système utilise des fallbacks automatiques :

1. Clé manquante → Message d'erreur en dev
2. Namespace manquant → Erreur dans les logs
3. Locale manquante → Retour à la locale par défaut (fr)

## Debugging

### Logs de Chargement

```
[i18n] Loaded 42/43 namespaces for locale 'fr' (1 errors)
[i18n] Failed namespaces for fr:
- MonNamespaceManquant
```

### Vérification des Traductions

```typescript
// Dans la console du navigateur
console.log(messages.ProfileSettings);
```

## Bonnes Pratiques

### 1. Organisation par Fonctionnalité

- Un namespace par page/section majeure
- Regrouper les traductions liées

### 2. Cohérence des Clés

- Utiliser des noms descriptifs
- Maintenir la même structure entre langues

### 3. Traductions Contextuelles

```json
{
  "status": {
    "loading": "Chargement...",
    "success": "Succès !",
    "error": "Erreur survenue"
  }
}
```

### 4. Éviter les Traductions Trop Génériques

❌ Mauvais :

```json
{
  "button": "Cliquer"
}
```

✅ Bon :

```json
{
  "actions": {
    "saveProfile": "Enregistrer le profil",
    "deleteAccount": "Supprimer le compte"
  }
}
```

## Exemple Complet

### Création d'une nouvelle page "Contact"

1. **Créer les fichiers de traduction :**

```json
// src/i18n/messages/fr/ContactPage.json
{
  "title": "Nous Contacter",
  "description": "Envoyez-nous un message",
  "form": {
    "name": "Nom",
    "email": "E-mail",
    "message": "Message",
    "send": "Envoyer"
  },
  "success": "Message envoyé avec succès !",
  "error": "Erreur lors de l'envoi"
}
```

2. **Ajouter le namespace :**

```typescript
// src/i18n.ts
const namespaces = [
  // ...
  "ContactPage", // ← Ajouter
] as const;
```

3. **Utiliser dans le composant :**

```typescript
// src/app/[locale]/contact/page.tsx
import { getTranslations } from "next-intl/server";

export default async function ContactPage() {
  const t = await getTranslations("ContactPage");

  return (
    <div>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      {/* Formulaire avec t("form.name"), etc. */}
    </div>
  );
}
```

## Maintenance

### Mise à Jour des Traductions

1. Modifier les fichiers JSON existants
2. Pas besoin de redémarrer le serveur en développement
3. Vérifier que toutes les langues sont mises à jour

### Suppression de Traductions

1. Supprimer les clés des fichiers JSON
2. Retirer le namespace de `src/i18n.ts` si plus utilisé
3. Vérifier qu'aucun composant n'utilise les clés supprimées

---

**Note :** Ce système garantit une organisation claire des traductions et un chargement performant grâce au système de namespaces automatique.
