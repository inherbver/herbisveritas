# Documentation de l'Implémentation Stripe pour HerbisVeritas

Ce document détaille la stratégie et les étapes de développement qui ont été suivies pour intégrer Stripe comme solution de paiement. Le plan a été conçu pour être robuste, sécurisé et maintenable, en tirant parti de l'écosystème Next.js / Supabase.

**Philosophie Clé :** Pour cette première itération, la validation des prix des produits est effectuée côté serveur en se basant sur notre propre base de données (`public.products`) pour assurer la sécurité, sans utiliser le Supabase Stripe Wrapper afin de limiter la complexité initiale.

---

## Phase 1 : Configuration et Schéma de la Base de Données

**Statut :** ✅ **Terminé**

1.  **Installation & Configuration**

    - [x] Installer les SDK `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`.
    - [x] Configurer les variables d'environnement : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_BASE_URL`.

2.  **Tables `orders` et `order_items`**
    - [x] Les tables `orders` et `order_items` existent déjà et leur schéma est adéquat.
    - [x] Les politiques de sécurité RLS ont été auditées et appliquées pour garantir que les utilisateurs ne peuvent accéder qu'à leurs propres commandes.

---

## Phase 2 : Logique Backend (Server Actions & Webhook)

**Statut :** ✅ **Terminé**

1.  **Server Action `createStripeCheckoutSession`**

    - [x] Fichier `src/actions/stripeActions.ts` créé.
    - [x] La fonction récupère le panier côté serveur (`getCart()`).
    - [x] **Sécurité :** Pour chaque article, le prix est validé côté serveur en se basant sur la table `products` de Supabase.
    - [x] La session de paiement est créée via `stripe.checkout.sessions.create()`.
    - [x] Paramètres clés passés : `line_items`, `mode: 'payment'`, `success_url`, `cancel_url`, `client_reference_id: cart.id`, `customer_email`.
    - [x] La fonction retourne le `sessionId` pour la redirection.

2.  **Webhook de Traitement des Commandes**
    - [x] Route Handler Next.js créée : `src/app/api/stripe-webhook/route.ts`.
    - [x] **Vérification :** La signature du webhook est validée.
    - [x] **Idempotence :** Le système vérifie si une commande existe déjà pour la session Stripe avant de la créer.
    - [x] **Création de la commande :** Crée une entrée dans `orders` et les entrées correspondantes dans `order_items`.
    - [x] **Nettoyage :** Le panier est vidé (`cart_items` sont supprimés) après la création réussie de la commande.

---

## Phase 3 : Logique Frontend (UI & Redirection)

**Statut :** ✅ **Terminé**

1.  **Bouton de Paiement**

    - [x] Composant `CheckoutButton` créé dans `src/components/domain/shop/checkout-button.tsx`.
    - [x] Le bouton gère un état de chargement (`useTransition`).

2.  **Déclenchement et Redirection**

    - [x] Le bouton appelle la Server Action `createStripeCheckoutSession`.
    - [x] Les erreurs sont gérées et affichées via des notifications toast (Sonner).
    - [x] En cas de succès, le client est redirigé vers la page de paiement Stripe via `stripe.redirectToCheckout()`.

3.  **Pages de Résultat**
    - [x] Page de succès créée : `src/app/[locale]/(checkout)/checkout/success/page.tsx`.
    - [x] Page d'annulation créée : `src/app/[locale]/(checkout)/checkout/canceled/page.tsx`.
    - [x] L'internationalisation de ces pages est gérée avec `next-intl`.

---

## Phase 4 : Documentation et Finalisation

**Statut :** ⏳ **En cours**

_Objectif : S'assurer que la nouvelle fonctionnalité est bien documentée et testée._

1.  **Tests**

    - [ ] Tester le flux de paiement de bout en bout en environnement de développement (avec la CLI Stripe).
    - [ ] Tester les cas d'erreur (paiement refusé, webhook invalide, etc.).

2.  **Mise à jour de la Documentation**
    - [ ] Mettre à jour `DATABASE.md` avec les schémas finaux de `orders` et `order_items` et leurs politiques RLS.
    - [ ] Mettre à jour `ACTIONS.md` pour inclure `stripeActions.ts`.
    - [ ] Mettre à jour `SECURITY.md` pour décrire le flux de paiement sécurisé.
