# Note Technique : Débogage des Scripts Node.js dans un Projet Next.js

## Contexte

Le script d'audit des rôles (`scripts/audit-roles.ts`), conçu pour être exécuté avec `tsx` dans un environnement Node.js, échouait systématiquement sans produire la moindre sortie ou erreur. Ce comportement de "plantage silencieux" a rendu le débogage particulièrement complexe.

## Analyse du Problème

L'enquête a révélé une combinaison de deux problèmes fondamentaux qui, ensemble, provoquaient l'échec précoce du processus Node.js.

### 1. Conflit de Dépendances : L'Intrusion de Next.js

La cause première était l'import par le script de modules initialement conçus pour l'environnement Next.js.

- **Le coupable :** Le script importait une fonction (`createSupabaseAdminClient`) depuis `src/lib/supabase/server.ts`.
- **Le conflit :** Ce fichier, bien que contenant du code serveur, avait lui-même une dépendance directe sur le paquet `next/headers` (pour la gestion des cookies), qui n'est disponible que dans l'environnement d'exécution de Next.js.
- **La conséquence :** En tentant de résoudre cet import, le chargeur de modules de Node.js (`tsx`) rencontrait une dépendance invalide et plantait immédiatement, avant même d'avoir pu exécuter la première ligne de code de notre script.

### 2. Mauvaise Configuration des Variables d'Environnement

Le second problème, qui masquait en partie le premier, était lié au chargement des variables d'environnement.

- **Le fichier `.env` :** Le projet utilisait un fichier `.env.local`, convention de Next.js. Cependant, l'outil `dotenv` (utilisé via le flag `-r dotenv/config`) recherche par défaut un fichier nommé `.env`.
- **Le chargement silencieux :** Le flag `-r dotenv/config` dans `package.json` tentait de pré-charger les variables. En l'absence d'un fichier `.env`, il échouait silencieusement, ce qui signifiait que les clés d'API Supabase n'étaient jamais chargées.

## Stratégie de Résolution

La solution a consisté à traiter ces deux problèmes de front, en se concentrant sur une séparation claire des contextes d'exécution.

1.  **Isolation du Code Backend :**
    - Création d'un module dédié et pur pour Node.js : `src/lib/supabase/admin.ts`. Ce fichier contient une nouvelle version de `createSupabaseAdminClient` qui n'a **aucune dépendance à Next.js**.
    - Refactorisation de tous les scripts backend (`audit-roles.ts`, `monitoring-service-jwt.ts`) pour qu'ils utilisent exclusivement ce nouveau client admin isolé.

2.  **Correction du Chargement de l'Environnement :**
    - Le fichier `.env.local` a été renommé en `.env` pour être compatible avec la configuration par défaut de `dotenv`.
    - Le flag `-r dotenv/config` a été supprimé de la commande `npm` pour éviter les erreurs de pré-chargement masquées.
    - L'initialisation de `dotenv` a été rendue explicite en ajoutant `dotenv.config()` au tout début du script `audit-roles.ts`. Cette approche est plus robuste et plus facile à déboguer.

## Conclusion

Cet incident souligne l'importance capitale de maintenir une séparation stricte entre le code destiné à l'environnement Next.js (composants, pages, API routes) et le code destiné à des environnements Node.js purs (scripts, tâches CRON, etc.).

En isolant les dépendances et en rendant les configurations (comme le chargement des variables d'environnement) explicites, nous avons non seulement résolu le problème, mais aussi rendu la base de code plus robuste, plus maintenable et moins susceptible de rencontrer ce type d'erreurs à l'avenir.
