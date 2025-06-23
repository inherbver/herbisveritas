# Plan d'Implémentation de Stripe pour HerbisVeritas

Ce document détaille la stratégie et les étapes de développement pour intégrer Stripe comme solution de paiement. Le plan est conçu pour être robuste, sécurisé et maintenable, en tirant parti de l'écosystème Next.js / Supabase.

**Philosophie Clé :** Utiliser le **Supabase Stripe Wrapper** pour synchroniser les données produits/prix entre Stripe et Supabase, garantissant une source de vérité unique et réduisant la complexité du code manuel.

---

## Phase 1 : Configuration et Schéma de la Base de Données

_Objectif : Préparer l'infrastructure backend pour accepter les paiements._

1.  **Installation & Configuration (Déjà réalisé)**

    - [x] Installer les SDK `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`.
    - [x] Configurer les variables d'environnement (`.env.example` et `.env.local`) : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL`.

2.  **Activer et Configurer le Supabase Stripe Wrapper**

    - Dans le dashboard Supabase, activer les extensions `supabase-wrappers` et `stripe`.
    - Configurer le wrapper en lui fournissant la clé secrète Stripe (`STRIPE_SECRET_KEY`).
    - Créer les tables étrangères (Foreign Data Tables) pour synchroniser les données de Stripe : `stripe.products`, `stripe.prices`.
    - **Avantage :** Permet d'interroger les données Stripe directement via SQL, comme si elles étaient des tables locales.

3.  **Créer le Webhook de Synchronisation (pour le Wrapper)**

    - Créer une Edge Function Supabase dédiée (`stripe-sync`).
    - Cette fonction aura pour unique rôle de recevoir les webhooks de Stripe et de les transmettre au Wrapper pour qu'il mette à jour les tables étrangères.
    - Dans le dashboard Stripe, configurer un webhook pointant vers cette Edge Function, écoutant les événements `product.*`, `price.*`.

4.  **Créer les Tables Locales `orders` et `order_items`**
    - Créer un nouveau fichier de migration Supabase.
    - **Table `orders` :**
      - `id` (uuid, pk), `user_id` (fk > auth.users), `cart_id` (fk > carts), `stripe_checkout_session_id` (text, unique), `status` (text), `total_amount` (integer, en centimes), `currency` (text), `customer_email` (text), `created_at`, `updated_at`.
    - **Table `order_items` :**
      - `id` (uuid, pk), `order_id` (fk > orders), `product_id` (text, fk > products), `quantity` (integer), `price_at_purchase` (integer, en centimes), `product_name` (text), `product_image_url` (text).
      - **Note :** La dénormalisation (stocker le prix, le nom, l'image) est cruciale pour l'historique des commandes.
    - Appliquer des politiques de sécurité RLS strictes sur ces deux tables.

---

## Phase 2 : Logique Backend (Server Actions & Webhook)

_Objectif : Construire le flux de paiement côté serveur._

1.  **Server Action `createStripeCheckoutSession`**

    - Créer le fichier `src/actions/stripeActions.ts`.
    - La fonction appellera `getCart()` pour récupérer le panier actuel.
    - **Point de Sécurité :** Pour chaque article du panier, elle vérifiera le prix en interrogeant la table étrangère `stripe.prices` (via une fonction RPC Supabase) pour obtenir le prix réel de Stripe, évitant toute manipulation côté client.
    - Elle construira le tableau `line_items` pour l'API Stripe Checkout.
    - Elle créera la session de paiement via `stripe.checkout.sessions.create()`.
    - Paramètres clés : `line_items`, `mode: 'payment'`, `success_url`, `cancel_url`, `client_reference_id: cart.id`, `customer_email`.
    - Retournera `{ sessionId: session.id }` en cas de succès, ou un objet d'erreur.

2.  **Webhook de Traitement des Commandes**
    - Créer une Route Handler Next.js : `src/app/api/stripe-webhook/route.ts`.
    - Cette route écoutera les requêtes `POST` et sera dédiée à la logique métier (différente du webhook de synchronisation).
    - **Étape 1 : Vérification.** Valider la signature du webhook Stripe en utilisant `STRIPE_WEBHOOK_SECRET` et le corps brut de la requête.
    - **Étape 2 : Idempotence.** Écouter l'événement `checkout.session.completed`. Avant tout traitement, vérifier si une commande avec le `stripe_checkout_session_id` existe déjà dans la table `orders`. Si oui, arrêter le processus.
    - **Étape 3 : Création de la commande.**
      - Extraire les données de la session Stripe (montant, email, `client_reference_id`).
      - Créer l'entrée dans la table `orders`.
      - Récupérer les articles du panier (via le `cart_id`) et les insérer dans `order_items`.
    - **Étape 4 : Nettoyage.** Appeler la Server Action `clearCartAction` pour vider le panier de l'utilisateur.
    - **Étape 5 : Notification (Optionnel).** Envoyer un email de confirmation de commande.

---

## Phase 3 : Logique Frontend (UI & Redirection)

_Objectif : Intégrer le processus de paiement dans l'interface utilisateur._

1.  **Bouton de Paiement**

    - Dans le composant du panier, ajouter un bouton "Procéder au paiement".
    - Le bouton sera géré par un composant client qui utilisera `useTransition` pour gérer l'état de chargement.

2.  **Déclenchement de l'Action**

    - Au clic, le composant appellera la Server Action `createStripeCheckoutSession`.
    - Les erreurs retournées par l'action seront affichées via des notifications toast (Sonner).

3.  **Redirection vers Stripe**

    - En cas de succès, le composant client recevra le `sessionId`.
    - Il utilisera `loadStripe` et `stripe.redirectToCheckout({ sessionId })` pour rediriger l'utilisateur vers la page de paiement hébergée par Stripe.

4.  **Pages de Résultat**
    - Créer la page de succès : `src/app/[locale]/checkout/success/page.tsx`. Elle affichera un message de confirmation. Elle pourra utiliser le `session_id` de l'URL pour récupérer et afficher les détails de la commande.
    - Créer la page d'annulation : `src/app/[locale]/checkout/canceled/page.tsx`. Elle informera l'utilisateur de l'annulation et proposera un lien pour retourner au panier.
    - Assurer l'internationalisation de ces pages avec `next-intl`.

---

## Phase 4 : Documentation et Finalisation

_Objectif : S'assurer que la nouvelle fonctionnalité est bien documentée._

1.  Mettre à jour `DATABASE.md` avec les schémas de `orders` et `order_items`.
2.  Mettre à jour `ACTIONS.md` pour inclure `stripeActions.ts`.
3.  Mettre à jour `SECURITY.md` pour décrire le flux de paiement sécurisé, le rôle des webhooks et la validation des prix côté serveur.
