// src/app/not-found.tsx
'use client';

import Error from 'next/error';
// Retrait de useLocale car le provider n'est pas disponible à ce niveau racine
// import { useLocale } from 'next-intl';

// Ce composant est rendu lorsque notFound() est appelé,
// ou si une URL ne correspond à aucune route après le middleware.
// Important: Il nécessite un src/app/layout.tsx minimal.

export default function NotFound() {
  // Le composant Error de Next.js est un bon point de départ
  // pour une page 404 racine simple.
 
  return (
    <Error statusCode={404} title="Page non trouvée / Page Not Found" />
  );
}
