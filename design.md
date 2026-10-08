# Atelier Plan — Design

> Starter design brief. Replace this content with the app you're building before writing any UI.
> Keep it short and concrete — it's the single source of truth for palette, typography, pages,
> screens, and flows across web, mobile, and desktop.

Éditeur architectural web en français : plan 2D et maquette 3D modifiables. Interface de CAO sobre inspirée des vidéos : barre supérieure, palette verticale, projet à gauche, scène dominante et inspecteur à droite.

## Brand & Colors

One token set, consumed per platform:

- **Web & desktop**: CSS variables in `packages/web/src/web/styles.css` (desktop loads the web UI).
- **Mobile**: `Colors.light` / `Colors.dark` in `packages/mobile/constants/theme.ts`, read via `useColors()`; `userInterfaceStyle: "automatic"` follows the system light/dark setting.

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| primary | #236455 | #A5C9BA | Buttons, active tab, accents |
| background | #F4F5F2 | #0A0A0A | Page/screen background |
| card | #FFFFFF | #1A1A1A | Cards, surfaces |
| foreground | #171717 | #FAFAFA | Primary text |
| mutedForeground | #737373 | #A3A3A3 | Secondary text |
| border | #E5E5E5 | #262626 | Hairlines |
| destructive | #DC2626 | #EF4444 | Delete / errors |

## Typography

Poppins pour les titres, Arial pour les propriétés denses. Texte ardoise, traits fins, angles de 6–10 px. Maquette ivoire, parquet beige, fond gris chaud et grille métrique. Couleurs d’axe rouge/vert/bleu.

## Pages & Screens

List each page/screen, its route file, and what it shows. Example:

- **Web — Home** (`packages/web/src/web/pages/index.tsx`) — what the user sees first.
- **Mobile — Home** (`packages/mobile/app/(tabs)/index.tsx`) — main tab.
- Add web pages under `src/web/pages/` (+ route in `app.tsx`); mobile tabs under `app/(tabs)/`, stack/modal screens under `app/`.

## Key User Flows

1. Modifier l’appartement de démonstration : sélectionner un mur, régler dimensions, ajouter des ouvertures.
2. Importer un plan image : aperçu, largeur réelle et seuil réglables, détection de lignes orthogonales, puis corrections en 2D. Aucune garantie d’exactitude ni service externe.
3. Sauvegarder localement, rouvrir ou exporter en JSON. Historique annuler/rétablir. Matériaux et éclairage simples, non photoréalistes.

## Architecture

- **API**: typed oRPC client (`lib/api.ts` in each package) → the backend in `@template/web`. Query/mutation hooks live in `queries/` (one file per feature); pages/screens call them with `@tanstack/react-query`.
- **State/sync**: TanStack Query with optimistic updates for instant-feel interactions.
- **Auth / payments / uploads**: see `skills/app/references/` when those features are needed.
