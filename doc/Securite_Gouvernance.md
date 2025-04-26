# SECURITY.md

# SECURITY.md

## Défense en profondeur
- Middleware Next.js pour pré-filtrer les accès protégés
- Double vérification côté serveur/page/API (`supabase.auth.getUser()`)
- Rôles et permissions stockés dans Supabase
  - **Rôles : guest, user, admin, (tech à venir)**
  - Les guests et users authentifiés peuvent commander depuis la boutique, selon les bonnes pratiques des sites e-commerce reconnus
  - L’admin est fortement sécurisé (auth + double vérif serveur), possibilité de renforcer (2FA, logs, rôles tech/admin)
  - Le rôle "tech" (futur) aura accès aux autorisations admin sauf fonctionnalités hyper critiques
- Audit log des actions admin
- Validation stricte des entrées (Zod)
- Sessions sécurisées (cookies httpOnly, secure)
- RLS Supabase activé

## Centralisation des composants
- Tous les composants sont dans `src/components/` (sauf exceptions documentées)

## Thème & couleurs
- Centralisation des couleurs dans un fichier tokens unique

## Internationalisation
- Préparation Fr/En dès la structure

## Gestion des environnements
- Trois environnements : dev, test/CI, prod (voir ENVIRONMENTS.md)

## Base de données & migrations
- 100% Supabase pour le MVP (auth, DB, migrations, RLS)
- Structure compatible avec ajout ultérieur de Prisma

## Bonnes pratiques
- Jamais de mot de passe ou secret en dur dans le code
- Revue de sécurité régulière
- Documentation des failles, risques et correctifs (ex : gestion des secrets, accès, rotation)

# windsurfrules.txt

# ------------- in-herbis-veritas .windsurfrules -------------
# 0. Contexte général
0. Site e-commerce Next.js 15 (App Router + Server Components), React 18.2, TypeScript 5, hébergé Supabase.  
0a. MCP actifs : Context7, Supabase, Dart (project manager). Windsurf → Settings → MCP confirme leur disponibilité.  ὑ Context7 docs  ὑ Supabase docs  ὑ Dart MCP

# 1. Structure & conventions
1. Pages sous /app ; Server Components par défaut ; marquer 'use client' si nécessaire.  
2. Alias absolus : '@/components', '@/lib', '@/stores', '@/db', '@/types'.  
3. TS strict : `strict: true`, `noImplicitAny: true`.  
4. Imports relatifs limités à deux niveaux maxi.

# 2. Styling & UI
5. Tailwind 3 avec @import base, components, utilities ; content cible ./app & ./src.  
6. Composants = shadcn/ui ; commande CLI : `npx shadcn-ui@latest add`.  
7. Thèmes via `data-slot` + Tailwind v4 compatibility.

# 3. Animation & accessibilité
8. Animations : Framer Motion (variants, layout).  
9. Respect WCAG 2.2 : aria-* obligatoires sur tout composant interactif.

# 4. State & formulaires
10. State global → Zustand 4 ; découper selectors, utiliser shallow.  
11. Formulaires : React Hook Form + Zod ; validation côté client ET côté serveur (Server Action).

# 5. Données & sécurité
12. Supabase-js 2 : appels DB UNIQUEMENT dans Server Components/Route Handlers.  
13. RLS obligatoire sur chaque table ; politiques distinctes `anon` / `authenticated`.  
14. Interdiction d’exposer la clé `service_role`. Variables dans `.env.local`.

# 6. i18n & routes
15. next-intl pour fr, en, de, es ; fichiers JSON dans /messages.  
16. URLs publiques : /{locale}/… ; locale par défaut = fr.

# 7. Performances
17. Dev : `next dev --turbo` ; analyse bundle `next build --profile`.  
18. `export const dynamic = "force-dynamic"` uniquement si nécessaire.  
19. Favoriser Edge Runtime (revalidateTag) pour fonctions légères.

# 8. Tests & CI
20. Jest unitaires dans __tests__, Cypress e2e dans cypress/.  
21. Workflow GitHub : `npm run lint && npm run test && npm run build`.

# 9. MCP directives spécifiques
22. Context7 : chaque prompt complexe doit inclure le tag `use context7` pour injecter docs live (Next 15, Supabase, shadcn/ui…).  
23. Supabase MCP : activer l’action “rowLevelSecurityCheck” avant tout commit touchant `/supabase/`.  
24. Dart MCP :  
    • `createTask` quand un TODO > 30 mn est détecté dans le diff ;  
    • `updateTask` sur push si commit message contient `#task-<id>`.

# 10. Répertoires protégés
25. Ne JAMAIS éditer `/public`, `/supabase/migrations`, `/node_modules`.

# 11. Commits & documentation
26. Convention commit : `type(scope): description` (ex. feat(cart): optimistic update).  
27. Commentaires « why » requis si > 20 lignes changées.

# 12. AI guidelines
28. Cascade doit proposer : snippet + explication + source Context7.  
29. Si Cascade manque de contexte, déclencher automatiquement `use context7`.

# ------------- end .windsurfrules -------------

