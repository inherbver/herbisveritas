"use client";

import { useState, useEffect } from "react";

/**
 * Un hook personnalisé pour détecter si la page a été défilée au-delà d'un certain seuil.
 * @param {number} [threshold=10] - Le seuil de défilement en pixels.
 * @returns {boolean} - `true` si la page est défilée au-delà du seuil, sinon `false`.
 */
export function useScroll(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Exécute la fonction une fois au montage pour définir l'état initial
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [threshold]);

  return scrolled;
}
