# Bonnes pratiques : Récupération de données Next.js (App Router) & Supabase

## Next.js (App Router - Server Components)

1.  **Utiliser `fetch`** : Méthode recommandée pour les requêtes côté serveur. Next.js étend `fetch` avec des options de cache.
2.  **Mise en cache par défaut (`force-cache`)** : Idéal pour les données statiques ou peu changeantes (comme les détails des produits). Le cache est invalidé manuellement ou par déploiement.
3.  **Revalidation périodique (`next: { revalidate: <secondes> }`)** : Pour les données qui changent occasionnellement. Rafraîchit le cache après le délai spécifié. Bon compromis pour une boutique.
4.  **Pas de cache (`cache: 'no-store'`)** : Pour les données nécessitant une fraîcheur absolue à chaque requête (équivalent `getServerSideProps`). Moins performant.
5.  **`React.cache`** : Principalement utile pour dédupliquer des appels `fetch` identiques *au sein d'une même requête*. Moins pertinent pour le client Supabase qui a sa propre gestion.
6.  **États de chargement/Erreurs** : Utiliser `Suspense` avec `loading.tsx` et `error.tsx` dans le même segment de route pour une gestion native et fluide.

## Supabase (Client JS - Côté Serveur)

1.  **Client Côté Serveur** : Utiliser la fonction `createClient` configurée dans `@/lib/supabase/server.ts` dans les Server Components.
2.  **Syntaxe des Requêtes** : `supabase.from('nom_table').select('colonnes')`. Utiliser `.eq()`, `.filter()`, `.order()`, `.range()`, etc., pour affiner la requête.
3.  **Gestion des Erreurs** : **Toujours** vérifier la propriété `error` retournée par chaque appel Supabase (`const { data, error } = await supabase...`). Si `error` n'est pas `null`, la requête a échoué.
4.  **TypeScript** : Utiliser des interfaces ou, idéalement, générer les types Supabase (`npx supabase gen types typescript ...`) pour typer les `data` retournées et améliorer la sécurité du code.
5.  **Cache** : Le client Supabase JS n'utilise pas directement les options de cache de `fetch` de Next.js. Par défaut, dans un Server Component, la requête est exécutée à chaque rendu, mais le résultat global de la page peut être mis en cache par Next.js selon la stratégie choisie (par défaut `force-cache`). Pour un contrôle fin du cache des données Supabase, envisager des stratégies comme `revalidate` au niveau de la page Next.js ou des abstractions supplémentaires si nécessaire.

## Contexte Développement Page Détails Produit (au 02/05/2025)

**Objectif:** Implémenter les pages de détails produit accessibles via un slug unique par produit, avec support de la localisation (fr/en) pour le contenu textuel.

**Ce qui a été fait:**

*   **Base de données:**
    *   Ajout d'une colonne `slug` à la table `products`.
    *   Création d'une table `product_translations` (colonnes: `product_id`, `locale`, `name`, `short_description`, `description_long`, `usage_instructions`).
*   **Logique Backend/Frontend:**
    *   Création de la fonction `getProductBySlug(slug, locale)` pour récupérer les détails d'un produit et sa traduction associée depuis Supabase.
    *   Mise à jour de `ShopPage` et `ShopClientContent` pour utiliser les slugs dans les liens des `ProductCard`.
    *   Création du fichier de route dynamique `src/app/[locale]/products/[slug]/page.tsx`.
    *   Implémentation du composant `ProductDetailPage` qui utilise `getProductBySlug` pour afficher les données.
    *   Implémentation de `generateMetadata` dans la page produit pour le titre et la description SEO.
    *   Ajout des clés de traduction manquantes (`ProductDetail.productNotFound`, `ProductDetail.defaultDescription`) dans `fr.json` et `en.json`.
*   **Composant UI (structure de base):**
    *   Mise en place de `ProductDetailDisplay.tsx` (actuellement ouvert) pour l'affichage des détails.

**Difficultés résolues:**

*   Erreur de parsing de la requête Supabase (`getProductBySlug`) due à des commentaires dans la chaîne `select()`.
*   Erreurs TypeScript de résolution de modules (`@/lib/...`, `@/components/...`) potentiellement dues au cache (résolues en redémarrant les serveurs TS/Next).
*   Erreur TypeScript dans `generateMetadata`: utilisation de `product.short_description` (snake_case) au lieu de `product.shortDescription` (camelCase) après le mapping.
*   Erreur Supabase `column products.image_urls does not exist`: corrigé en `image_url` dans `getProductBySlug` et ajustement du mapping d'image.
*   Erreur Next.js `params should be awaited`: Résolue en utilisant `await params` avant d'accéder aux propriétés (conformément à Next.js 15+).

**Difficultés persistantes (au 02/05/2025 17:16):**

*   **Erreur Supabase `column products.inci does not exist`:** Nouvelle erreur apparue lors du dernier `npm run dev`, indiquant un problème dans la requête `getProductBySlug` qui tente de sélectionner `inci` de la table `products`. (Note: La colonne `inci` a été temporairement retirée de la requête et du mapping le 02/05 pour débloquer. À réintégrer après vérification du schéma DB).
*   **Erreur Image 404:** Le serveur retourne une erreur 404 pour certaines images produit (ex: `/assets/images/pdct_1.png`). Vérification effectuée : le fichier correspondant manque dans le dossier `public/assets/images/`.

**Prochaines étapes:**

1.  **Vérifier schéma DB pour `inci`:** Confirmer l'existence et le nom exact de la colonne INCI dans la table `products` ou déterminer où elle se trouve, puis réintégrer la sélection dans `getProductBySlug`.
2.  **Corriger erreur Image 404:** Ajouter les fichiers images manquants dans `public/assets/images/` ou corriger les chemins `image_url` dans la table Supabase `products`.
3.  **Tester** le fonctionnement complet de la page détail (navigation, affichage correct des données localisées).
4.  Implémenter la logique **"Ajouter au panier"** dans `ProductDetailDisplay`.
