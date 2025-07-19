"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Types pour l'API BAN (Base Adresse Nationale)
export interface BanFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    label: string;
    score: number;
    housenumber: string;
    id: string;
    name: string;
    postcode: string;
    citycode: string;
    x: number;
    y: number;
    city: string;
    context: string;
    type: string;
    importance: number;
    street: string;
  };
}

export interface BanApiResponse {
  features: BanFeature[];
}

// Type pour la valeur de retour du hook
export interface UseAddressAutocompleteReturn {
  suggestions: BanFeature[];
  isLoading: boolean;
  setSuggestions: React.Dispatch<React.SetStateAction<BanFeature[]>>;
  error: string | null;
}

/**
 * Custom hook to fetch address suggestions from the French Government's API.
 * Optimized with debouncing, caching, and error handling.
 *
 * @param addressQuery The search query string.
 * @param countryCode The country code (currently only supports 'FR').
 * @returns An object with suggestions, loading state, and a setter for suggestions.
 */
export const useAddressAutocomplete = (
  addressQuery: string,
  countryCode: string
): UseAddressAutocompleteReturn => {
  const [suggestions, setSuggestions] = useState<BanFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs pour la gestion du debounce et cache
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<Map<string, BanFeature[]>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fonction de nettoyage des timeouts
  const clearPendingTimeout = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  }, []);

  // Fonction de nettoyage des requêtes en cours
  const abortPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const fetchAddressSuggestions = useCallback(
    async (query: string, country: string) => {
      if (country !== "FR" || !query || query.length < 3) {
        setSuggestions([]);
        setError(null);
        return;
      }

      if (cacheRef.current.has(query)) {
        setSuggestions(cacheRef.current.get(query)!);
        return;
      }

      abortPendingRequest();
      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5&type=housenumber&autocomplete=1&postcode=${countryCode}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch address suggestions.");
        }

        const data: BanApiResponse = await response.json();
        cacheRef.current.set(query, data.features);
        setSuggestions(data.features);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("An error occurred while fetching addresses.");
          console.error(err);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [abortPendingRequest, countryCode]
  );

  useEffect(() => {
    clearPendingTimeout();

    if (addressQuery && addressQuery.length >= 3) {
      timeoutIdRef.current = setTimeout(() => {
        fetchAddressSuggestions(addressQuery, countryCode);
      }, 300); // 300ms debounce delay
    } else {
      setSuggestions([]);
      abortPendingRequest();
    }

    return () => {
      clearPendingTimeout();
      abortPendingRequest();
    };
  }, [
    addressQuery,
    countryCode,
    clearPendingTimeout,
    abortPendingRequest,
    fetchAddressSuggestions,
  ]);

  return { suggestions, isLoading, setSuggestions, error };
};
