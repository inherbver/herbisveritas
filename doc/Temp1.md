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