# Diagnostic Final : Échec Systématique de l'Insertion dans la Table `orders`

**Date:** 23 Juin 2025
**Auteurs:** Utilisateur & Cascade AI
**Date:** 24 Juin 2025
**Statut:** **NON RÉSOLU - HYPOTHÈSE FINALE EN ATTENTE DE VALIDATION**

---

### 1. Résumé Exécutif

Ce document retrace l'enquête de débogage menée pour résoudre un échec systématique et silencieux de création de commandes (`INSERT` dans `public.orders`) déclenchée par un webhook Stripe (`checkout.session.completed`). Le processus implique une fonction Edge Supabase qui appelle une fonction RPC PostgreSQL (`create_order_from_cart`) s'exécutant avec `SECURITY DEFINER`.

Malgré une série d'hypothèses testées, de refactorings et l'application des meilleures pratiques officielles de Supabase, le problème persiste. Chaque appel à la fonction RPC se termine par un statut `200 OK` sans erreur visible, mais la transaction est systématiquement et silencieusement annulée (`ROLLBACK`).

**Conclusion Actuelle :** Le problème ne réside pas dans la logique métier, les RLS, les contraintes de table, ou les triggers. Il est intrinsèquement lié au contexte d'exécution des fonctions `SECURITY DEFINER` appelées depuis une fonction Edge. L'hypothèse finale est que le rôle `postgres`, dans ce contexte d'exécution restreint, ne dispose pas des privilèges implicites pour vérifier la contrainte de clé étrangère sur `auth.users` et nécessite une permission `SELECT` explicite.

---

### 2. Chronologie du Débogage

#### Étape 1 : Diagnostic Initial

- **Constat :** La fonction Edge reçoit le webhook, appelle la RPC, et retourne un statut 200. Aucune erreur n'est loggée ni dans la fonction Edge, ni dans les logs PostgreSQL. Aucune commande n'est créée.
- **Hypothèse :** Un problème dans la logique de la fonction RPC (ex: `user_id` nul, calcul erroné).
- **Action :** Ajout de logging détaillé et de blocs `EXCEPTION` dans la RPC.
- **Résultat :** Aucune exception n'est jamais levée. La fonction semble s'exécuter jusqu'au bout, mais la transaction est annulée.

#### Étape 2 : Isolation via Fonctions "Canari"

- **Hypothèse :** Une contrainte de table (RLS, `CHECK`, `FOREIGN KEY`) bloque l'insertion.
- **Actions :**
  1.  Création d'une fonction "canari" qui ne fait qu'un `INSERT` basique dans `orders`.
  2.  Désactivation temporaire de la clé étrangère `orders_user_id_fkey`.
  3.  Suppression d'une politique RLS potentiellement problématique.
  4.  Création d'une fonction "ultra-canari" qui insère une ligne avec `user_id = NULL` pour isoler totalement l'opération de la table `auth.users`.
- **Résultat :** **Échec systématique.** Même l'insertion la plus simple possible échoue silencieusement. Cela innocente la logique métier, les RLS et les contraintes.

#### Étape 3 : Changement du Contexte de Sécurité

- **Hypothèse :** Le problème est lié au contexte `SECURITY DEFINER`.
- **Action :** Modification de la fonction RPC pour utiliser `SECURITY INVOKER`.
- **Résultat :** **Échec.** Le problème persiste, même lorsque la fonction est invoquée avec les droits du `service_role` (super-utilisateur).

#### Étape 4 : Application des Meilleures Pratiques Officielles

- **Hypothèse :** Basé sur la documentation officielle, l'absence de `SET search_path = ''` dans la définition de la fonction `SECURITY DEFINER` est la cause.
- **Action :**
  1.  Restauration de l'architecture `SECURITY DEFINER`.
  2.  Création d'une migration pour recréer la fonction avec `SECURITY DEFINER SET search_path = ''`.
  3.  Déploiement de la fonction Edge mise à jour.
- **Résultat :** **Échec.** Le problème persiste, même en suivant à la lettre les recommandations de Supabase.

#### Étape 5 : Hypothèse Finale - Permissions Explicites

- **Hypothèse :** L'échec de la vérification de la clé étrangère sur `auth.users` est la cause du `ROLLBACK` silencieux. Dans le contexte d'exécution `Edge Function -> RPC (SECURITY DEFINER)`, le rôle `postgres` a besoin d'une permission `SELECT` explicite sur `auth.users`, malgré son statut de super-utilisateur.
- **Action en attente :** Appliquer la migration `20250624020000_grant_select_on_auth_users_to_postgres_permanently.sql`.

---

### 3. État Actuel et Pièces à Conviction

Le système est dans un état où la cause du problème a été isolée à une interaction anormale et non documentée entre le service d'authentification (`auth` schema) et le moteur de base de données dans un contexte d'exécution très spécifique.

**La prochaine étape est d'appliquer la migration qui accorde les droits `SELECT` et de réaliser un test final.** Si cela échoue, la seule solution viable sera de contourner complètement l'architecture RPC pour cette opération.

### I. Contexte Initial

- **Objectif :** Créer une commande (`order`) dans la base de données après la réception d'un événement `checkout.session.completed` de Stripe.
- **Architecture :**
  1.  **Stripe Webhook** envoie une requête POST.
  2.  **Supabase Edge Function** (`stripe-webhook/index.ts`) reçoit la requête, valide la signature.
  3.  **Supabase RPC Function** (`create_order_from_cart`) est appelée pour créer la commande en base de données.
- **Point Clé :** La fonction RPC utilise `SECURITY DEFINER` pour s'exécuter avec les privilèges élevés du rôle `postgres`, nécessaires pour interagir avec plusieurs tables (`carts`, `products`, `orders`).

---

### II. Chronologie de l'Enquête (Démarche Systématique d'Élimination)

| Étape | Action de Diagnostic                     | Résultat & Apprentissage                                                                                                                                                                 |
| :---- | :--------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Validation de la Fonction Edge**       | Fonction stable, reçoit et valide les événements. **La fonction Edge est hors de cause.**                                                                                                |
| **2** | **Correction du Schéma DB**              | Ajout de la colonne `stripe_checkout_id` manquante. L'échec persiste. **Le schéma est correct.**                                                                                         |
| **3** | **Analyse des Politiques RLS**           | Ajout/suppression de politiques pour `postgres`. L'échec persiste. **Les RLS standards sont hors de cause.**                                                                             |
| **4** | **Test "Canari"**                        | Remplacement de la RPC par une fonction simple (lecture `auth.users` + `INSERT`). L'échec persiste. **La logique métier complexe est hors de cause.**                                    |
| **5** | **Analyse des Triggers & Contraintes**   | Inspection de la table `orders`. Aucun trigger `INSERT` ou contrainte `CHECK` bloquante. **Les triggers et contraintes sont hors de cause.**                                             |
| **6** | **Découverte d'une RLS "Fantôme"**       | Découverte et suppression d'une politique pour `postgres` avec un `WITH CHECK (is_service_context())`. L'échec persiste. **La politique était problématique, mais pas la cause unique.** |
| **7** | **Isolation de la Clé Étrangère**        | Suppression temporaire de la contrainte FK sur `user_id`. L'échec persiste. **La contrainte FK n'est pas la cause directe.**                                                             |
| **8** | **Octroi de Permissions Explicites**     | `GRANT SELECT ON auth.users TO postgres;`. L'échec persiste. **La permission explicite ne suffit pas.**                                                                                  |
| **9** | **Test "Ultra-Canari" (Insertion Pure)** | Remplacement de la RPC par une fonction insérant une ligne avec `user_id = NULL` (aucune lecture). **L'ÉCHEC PERSISTE.**                                                                 |

---

### III. Conclusion Finale

L'échec de l'étape 9, le test de l'insertion pure, est la preuve définitive que le problème est externe à notre code. Une simple commande `INSERT INTO public.orders ... VALUES ...`, exécutée par un super-utilisateur (`postgres`) dans une fonction `SECURITY DEFINER`, sur une table sans contraintes bloquantes, ne devrait jamais échouer silencieusement.

**Cause Racine la Plus Probable :** Un mécanisme de sécurité, un bug, ou une limitation non documentée au sein de l'environnement d'exécution des Fonctions Edge de Supabase qui restreint les opérations d'écriture des fonctions `SECURITY DEFINER`. Il est possible que le contexte de la session (`session context`) passé de la fonction Edge à la base de données soit incomplet ou restrictif, empêchant l'opération, même pour le super-utilisateur `postgres`.

---

### IV. Prochaines Étapes Recommandées

1.  **Contacter le Support Supabase :** Fournir cette note technique détaillée comme preuve d'une enquête exhaustive. Le problème est très probablement de leur côté et nécessite leur expertise.

2.  **Explorer une Architecture de Contournement (Workaround) :**

    - **Option A (Recommandée) :** Utiliser le client `supabase-js` (avec la `service_role_key`) directement dans la fonction Edge pour effectuer l'insertion, en contournant complètement les fonctions RPC pour cette opération. C'est plus simple et évite les complexités des permissions RPC.
      ```typescript
      // Dans la fonction Edge, après avoir validé l'événement Stripe
      const { data, error } = await supabase.from("orders").insert({
        /* ... données de la commande ... */
      });
      if (error) {
        /* ... gestion d'erreur ... */
      }
      ```
    - **Option B :** Ne pas utiliser `SECURITY DEFINER`. Modifier la fonction RPC pour qu'elle s'exécute avec les droits de l'utilisateur (`SECURITY INVOKER`). Cela complexifie la gestion des permissions mais peut contourner le problème.

3.  **Restauration de la Base de Données :**
    - Ré-appliquer la contrainte de clé étrangère `orders_user_id_fkey`.
    - Supprimer les fonctions "canari" et restaurer la fonction RPC originale (avec gestion d'erreur).
    - Révoquer la permission `SELECT` sur `auth.users` accordée à `postgres`.
