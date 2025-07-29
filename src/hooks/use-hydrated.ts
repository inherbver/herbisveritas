/**
 * Hook to safely handle hydration in Next.js
 * 
 * This hook returns false during server-side rendering and initial hydration,
 * then true once the component has been hydrated on the client.
 * This prevents hydration mismatches for client-only values.
 */

import { useEffect, useState } from 'react';

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}

// Export par défaut pour améliorer la compatibilité
export default useHydrated;