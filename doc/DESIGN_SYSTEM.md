# Documentation du Thème et du Design System

Ce document centralise les décisions et les conventions relatives au design system du projet HerbisVeritas, notamment la gestion des couleurs, de la typographie et des espacements.

## Palette de Couleurs

Le projet utilise un système de couleurs basé sur des variables CSS avec le modèle de couleur `oklch`, ce qui permet une gestion facile des thèmes (clair/sombre) et une grande consistance visuelle.

Les couleurs sont définies dans `src/app/globals.css` et mappées en tant que tokens dans `tailwind.config.cjs`.

### Thème Clair (Défaut)

| Token Name             | Valeur `oklch`               | Description         |
| ---------------------- | ---------------------------- | ------------------- |
| `background`           | `oklch(1 0 0)`               | Blanc               |
| `foreground`           | `oklch(0.147 0.004 49.25)`   | Gris foncé (texte)  |
| `card` / `popover`     | `oklch(0.829 0.041 92.4)`    | Pierre Calcaire     |
| `card-foreground`      | `oklch(0.147 0.004 49.25)`   | Gris foncé (texte)  |
| `primary`              | `oklch(0.714 0.108 298.82)`  | Lavande             |
| `primary-foreground`   | `oklch(0.985 0.001 106.423)` | Blanc cassé (texte) |
| `secondary`            | `oklch(0.543 0.091 121.3)`   | Olive               |
| `secondary-foreground` | `oklch(0.985 0.001 106.423)` | Blanc cassé (texte) |
| `muted`                | `oklch(0.829 0.041 92.4)`    | Pierre Calcaire     |
| `muted-foreground`     | `oklch(0.553 0.013 58.071)`  | Gris moyen (texte)  |
| `accent`               | `oklch(0.831 0.146 91.16)`   | Soleil              |
| `accent-foreground`    | `oklch(0.216 0.006 56.043)`  | Gris foncé (texte)  |
| `destructive`          | `oklch(0.577 0.245 27.325)`  | Rouge (erreur)      |
| `border` / `input`     | `oklch(0.923 0.003 48.717)`  | Gris clair          |
| `ring`                 | `oklch(0.709 0.01 56.259)`   | Gris (focus)        |

### Thème Sombre (`.dark`)

| Token Name             | Valeur `oklch`               |
| ---------------------- | ---------------------------- |
| `background`           | `oklch(0.147 0.004 49.25)`   |
| `foreground`           | `oklch(0.985 0.001 106.423)` |
| `card` / `popover`     | `oklch(0.216 0.006 56.043)`  |
| `card-foreground`      | `oklch(0.985 0.001 106.423)` |
| `primary`              | `oklch(0.923 0.003 48.717)`  |
| `primary-foreground`   | `oklch(0.216 0.006 56.043)`  |
| `secondary`            | `oklch(0.268 0.007 34.298)`  |
| `secondary-foreground` | `oklch(0.985 0.001 106.423)` |
| `muted`                | `oklch(0.268 0.007 34.298)`  |
| `muted-foreground`     | `oklch(0.709 0.01 56.259)`   |
| `accent`               | `oklch(0.268 0.007 34.298)`  |
| `accent-foreground`    | `oklch(0.985 0.001 106.423)` |
| `destructive`          | `oklch(0.704 0.191 22.216)`  |
| `border`               | `oklch(1 0 0 / 10%)`         |
| `input`                | `oklch(1 0 0 / 15%)`         |
| `ring`                 | `oklch(0.553 0.013 58.071)`  |

## Utilisation

Utilisez ces tokens directement dans les classes Tailwind pour assurer la cohérence :

- **Couleur de fond :** `bg-primary`, `bg-card`, etc.
- **Couleur de texte :** `text-foreground`, `text-primary-foreground`, etc.
- **Couleur de bordure :** `border-secondary`, `border-destructive`, etc.
- **Couleur de "ring" (focus) :** `ring-primary`, etc.

## Typographie

Le projet utilise deux polices de caractères principales, chargées via Google Fonts grâce à l'optimisation de Next.js (`next/font/google`). Elles sont définies dans `src/app/layout.tsx`.

### 1. Raleway (Sans-serif)

- **Rôle :** Police principale pour le corps du texte, les paragraphes et les éléments d'interface.
- **Variable CSS :** `--font-raleway`
- **Configuration (`tailwind.config.cjs`) :** `fontFamily: { sans: ["var(--font-raleway)", "sans-serif"] }`
- **Chargement (`src/app/layout.tsx`) :**
  ```javascript
  const raleway = Raleway({
    subsets: ["latin"],
    variable: "--font-raleway",
    display: "swap",
  });
  ```

### 2. Playfair Display (Serif)

- **Rôle :** Police d'affichage pour les titres principaux (`<h1>`, `<h2>`, etc.) et les éléments nécessitant un fort impact visuel.
- **Variable CSS :** `--font-playfair`
- **Configuration (`tailwind.config.cjs`) :** `fontFamily: { serif: ["var(--font-playfair)", "serif"] }`
- **Chargement (`src/app/layout.tsx`) :**
  ```javascript
  const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair",
    display: "swap",
  });
  ```
