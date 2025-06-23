# HerbisVeritas - Plateforme E-commerce Moderne

HerbisVeritas est une application e-commerce full-stack construite avec une architecture moderne, tirant parti de Next.js pour le frontend et de Supabase pour le backend. Le projet met l'accent sur la sécurité, la performance et une expérience de développement robuste.

---

## Stack Technique Principale

- **Framework :** [Next.js](https://nextjs.org/) 15+ (App Router, Server Actions, Middleware)
- **Backend & Base de données :** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Storage, RLS)
- **Styling :** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Gestion d'état :** [Zustand](https://github.com/pmndrs/zustand)
- **Validation :** [Zod](https://zod.dev/)
- **Internationalisation (i18n) :** [next-intl](https://next-intl.dev/)

---

## Démarrage Rapide (Getting Started)

Pour lancer le projet en local, suivez ces étapes :

1.  **Cloner le dépôt :**

    ```bash
    git clone <URL_DU_REPO>
    cd herbisveritas
    ```

2.  **Installer les dépendances :**

    ```bash
    npm install
    ```

3.  **Configurer les variables d'environnement :**

    - Copiez le fichier d'exemple : `cp .env.example .env.local`
    - Remplissez les variables dans `.env.local` avec vos clés Supabase (URL du projet et clé `anon`).

4.  **Lancer le serveur de développement :**
    ```bash
    npm run dev
    ```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir le résultat.

---

## Documentation du Projet

Ce projet est accompagné d'une documentation technique détaillée pour faciliter la compréhension de son architecture et de ses fonctionnalités. **Il est fortement recommandé de la consulter.**

- **[ARCHITECTURE DE LA BASE DE DONNÉES](./doc/DATABASE.md)**
  _Détaille le schéma, les tables, les fonctions SQL et les politiques de sécurité (RLS)._

- **[FLUX D'AUTHENTIFICATION](./doc/AUTHFLOW.md)**
  _Explique les processus d'inscription, de connexion, de gestion de session et le rôle du middleware._

- **[SERVER ACTIONS (API)](./doc/ACTIONS.md)**
  _Documente les points d'entrée de l'API backend construits avec les Server Actions de Next.js._

- **[ARCHITECTURE DE SÉCURITÉ](./doc/SECURITY.md)**
  _Décrit les différentes couches de sécurité, de la base de données au client._

- **[GESTION DU PANIER](./doc/CART.md)**
  _Présente la logique de gestion du panier pour les utilisateurs invités et authentifiés._

- **[INTERNATIONALISATION (i18n)](./doc/i18n.md)**
  _Guide pour ajouter et gérer les traductions dans l'application._

---

## Comment Contribuer

- **[GUIDE DE CONTRIBUTION](./CONTRIBUTING.md)**
