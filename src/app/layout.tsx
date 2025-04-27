import type { ReactNode } from 'react';
import './globals.css';

// Ce layout racine est nécessaire pour l'App Router.
// Il fournit la structure HTML de base.
// La logique spécifique (polices, providers, i18n) est dans [locale]/layout.tsx

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr"><body>{children}</body></html>
  );
}
