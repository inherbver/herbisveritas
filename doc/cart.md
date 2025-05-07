# Plan d'Implémentation : Gestion du Panier avec Zustand et Next.js

**Phase 1 : Fondations et Types**

- **Tâche 1.1 : Définir les Types TypeScript pour le Panier**

  - **Description :** Créer/mettre à jour le fichier `src/types/cart.ts`.
  - **Détails :** Définir les interfaces `CartItem` (avec `productId`, `name`, `price`, `quantity`, `image?`), `CartState` (avec `items`, `isLoading`, `error`), et `CartActions` (avec les signatures des actions comme `addItem`, `removeItem`, `updateItemQuantity`, `clearCart`, et les actions de synchronisation/internes `_setIsLoading`, `_setError`, `_setItems`).
  - **Objectif :** Avoir une base typée solide pour le store et les composants.

- **Tâche 1.2 : Créer la Structure de Base du Store Zustand**
  - **Description :** Initialiser le fichier `src/stores/cartStore.ts`.
  - **Détails :** Importer `create` de Zustand et les types définis. Préparer la structure de `create<CartState & CartActions>()(...)`.
  - **Objectif :** Avoir le squelette du store prêt pour l'implémentation de la logique.

**Phase 2 : Logique du Store Zustand (Client-Side)**

- **Tâche 2.1 : Implémenter les Actions de Base (Client-Side)**

  - **Description :** Dans `cartStore.ts`, coder la logique pour `addItem`, `removeItem`, `updateItemQuantity`, et `clearCart`.
  - **Détails :** Ces actions modifieront uniquement l'état local du store pour l'instant. Utiliser `set` et `get` de Zustand.
  - **Objectif :** Avoir un panier fonctionnel côté client, sans persistance ni synchro serveur.

- **Tâche 2.2 : Configurer la Persistance du Panier**

  - **Description :** Intégrer le middleware `persist` de Zustand dans `cartStore.ts`.
  - **Détails :**
    - Utiliser `localStorage` pour la persistance.
    - Configurer `name` (ex: `inherbis-cart-storage`).
    - Utiliser `partialize` pour ne persister que `items`.
  - **Objectif :** Le panier invité est sauvegardé et restauré entre les sessions.

- **Tâche 2.3 : Implémenter les Sélecteurs de Panier**
  - **Description :** Définir des fonctions pour calculer les valeurs dérivées du panier.
  - **Détails :** Créer des sélecteurs pour `selectCartItems`, `selectCartTotalItems` (nombre total d'unités), `selectCartSubtotal` (montant total). Ces fonctions peuvent être exportées depuis `cartStore.ts` ou utilisées directement dans les composants.
  - **Objectif :** Faciliter l'accès aux informations calculées du panier dans les composants.

**Phase 3 : Composants UI de Base pour le Panier**

- **Tâche 3.1 : Mettre à Jour `ProductCard.tsx`**

  - **Description :** Permettre l'ajout de produits au panier depuis les cartes produits.
  - **Détails :** Utiliser `useCartStore` pour accéder à l'action `addItem`. Marquer le composant comme `"use client"`.
  - **Objectif :** L'utilisateur peut ajouter des articles au panier.

- **Tâche 3.2 : Créer `CartDisplay.tsx`**

  - **Description :** Développer un composant pour afficher le contenu détaillé du panier.
  - **Détails :**
    - Afficher chaque `CartItem` avec nom, prix, quantité (modifiable), image.
    - Permettre la suppression d'articles et la modification des quantités via les actions du `cartStore`.
    - Afficher le `selectCartTotalItems` et `selectCartSubtotal`.
    - Bouton pour vider le panier (`clearCart`).
    - Marquer le composant comme `"use client"`.
  - **Objectif :** L'utilisateur peut voir et gérer son panier sur une page dédiée.

- **Tâche 3.3 : Intégrer `CartDisplay` dans une Page Panier**

  - **Description :** Créer la page `/cart` qui utilise `CartDisplay.tsx`.
  - **Détails :** `src/app/[locale]/cart/page.tsx`.
  - **Objectif :** Avoir une URL dédiée pour l'affichage du panier.

- **Tâche 3.4 : Créer `CartIcon.tsx` (Optionnel, pour le Header)**
  - **Description :** Un petit indicateur du nombre d'articles dans le panier, souvent dans la barre de navigation.
  - **Détails :** Utiliser `useCartStore` et `selectCartTotalItems`. Marquer comme `"use client"`.
  - **Objectif :** Feedback visuel constant sur l'état du panier.

**Phase 4 : Server Actions pour la Synchronisation Backend**

- **Tâche 4.1 : Développer les Server Actions**

  - **Description :** Dans `src/actions/cartActions.ts`, créer ou adapter les fonctions Server Action.
  - **Détails :**
    - `getOrCreateUserCart_SA`: Récupère ou crée un panier pour un utilisateur connecté.
    - `syncGuestCart_SA`: Potentiellement pour enregistrer/mettre à jour un panier invité côté serveur si désiré (peut aussi être géré purement client pour les invités jusqu'à la connexion/checkout).
    - `addItemToDbCart_SA`, `removeItemFromDbCart_SA`, `updateDbCartItemQuantity_SA`, `clearDbCart_SA`.
    - `mergeGuestWithUserCart_SA`: Gère la fusion lors de la connexion.
  - **Objectif :** Fonctions serveur prêtes à interagir avec la base de données.

- **Tâche 4.2 : Interaction Supabase des Server Actions**

  - **Description :** S'assurer que chaque Server Action effectue les opérations CRUD correctes sur les tables `carts` et `cart_items` de Supabase.
  - **Détails :** Utiliser le client Supabase (côté serveur) pour les requêtes. Gérer les `user_id` et `guest_id` (ou `session_id`) de manière appropriée.
  - **Objectif :** Persistance et récupération fiables des données du panier en base.

- **Tâche 4.3 : Validation Zod pour les Server Actions**
  - **Description :** Ajouter la validation des entrées pour toutes les Server Actions.
  - **Détails :** Utiliser Zod pour valider les `productId`, `quantity`, etc.
  - **Objectif :** Sécuriser les actions serveur contre les données invalides.

**Phase 5 : Intégration Store Zustand <-> Server Actions**

- **Tâche 5.1 : Connecter les Actions Zustand aux Server Actions**

  - **Description :** Modifier les actions dans `cartStore.ts` (`addItem`, `removeItem`, etc.) pour qu'elles appellent les Server Actions correspondantes après la mise à jour optimiste de l'état local.
  - **Détails :** Utiliser `await` pour les appels aux Server Actions.
  - **Objectif :** Le panier client est synchronisé avec le serveur.

- **Tâche 5.2 : Gérer les États de Chargement et d'Erreur**

  - **Description :** Dans `cartStore.ts`, utiliser `_setIsLoading` et `_setError` autour des appels aux Server Actions.
  - **Détails :** `set({ isLoading: true })` avant l'appel, `set({ isLoading: false, error: ... })` dans les blocs `try/catch`.
  - **Objectif :** Fournir un feedback UI sur les opérations en cours ou échouées.

- **Tâche 5.3 : Réconciliation de l'État (si nécessaire)**
  - **Description :** Si la Server Action retourne un état de panier qui diffère de la mise à jour optimiste, mettre à jour le store Zustand avec la version du serveur.
  - **Détails :** `set({ items: serverResponse.items })`.
  - **Objectif :** Assurer la cohérence des données entre client et serveur.

**Phase 6 : Hydratation et Gestion des Scénarios Utilisateur**

- **Tâche 6.1 : Hydratation Initiale du Panier pour Utilisateurs Connectés**

  - **Description :** Au chargement de l'application, si un utilisateur est connecté, récupérer son panier depuis le serveur et initialiser le `cartStore`.
  - **Détails :**
    - Peut se faire via un Server Component racine qui récupère les données et les passe à un Client Component (`CartInitializer.tsx` par exemple).
    - Ce `CartInitializer` appelle une action du store (ex: `_setItems` ou une action `hydrateCartFromServer`) pour remplir le store.
    - Attention à ne pas écraser un panier local plus récent sans logique de fusion.
  - **Objectif :** L'utilisateur connecté retrouve son panier précédent.

- **Tâche 6.2 : Fusion des Paniers (Invité -> Utilisateur)**

  - **Description :** Lors de la connexion d'un utilisateur, si un panier invité existe dans `localStorage`, le fusionner avec le panier serveur de l'utilisateur.
  - **Détails :** Appeler `mergeGuestWithUserCart_SA` et mettre à jour le store Zustand avec le résultat. Vider ensuite le panier `localStorage` ou le marquer comme fusionné.
  - **Objectif :** Expérience utilisateur fluide lors de la connexion.

- **Tâche 6.3 : Gestion de la Déconnexion**
  - **Description :** Lorsqu'un utilisateur se déconnecte, le store Zustand doit refléter un état de panier "invité".
  - **Détails :** Le plus simple est souvent de `clearCart()` l'état en mémoire et de laisser `persist` recharger le panier invité depuis `localStorage` s'il existe (ou repartir d'un panier vide).
  - **Objectif :** Séparation claire des paniers après déconnexion.

**Phase 7 : Finalisation et Tests**

- **Tâche 7.1 : Tests Manuels Complets des Flux**

  - **Description :** Parcourir tous les scénarios utilisateurs.
  - **Détails :** Ajout/modification/suppression d'articles (invité et connecté), persistance du panier invité, connexion et fusion, déconnexion, chargement initial du panier connecté.
  - **Objectif :** Valider le fonctionnement de bout en bout.

- **Tâche 7.2 : (Optionnel - Évolutif) Tests Automatisés**

  - **Description :** Écrire des tests unitaires pour les fonctions critiques du store Zustand et des Server Actions.
  - **Objectif :** Assurer la non-régression lors des évolutions futures.

- **Tâche 7.3 : Revue de Code et Documentation Interne**
  - **Description :** Relire le code, ajouter des commentaires TSDoc/JSDoc si nécessaire.
  - **Objectif :** Maintenabilité et compréhension du code.
