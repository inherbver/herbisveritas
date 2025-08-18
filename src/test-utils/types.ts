/**
 * Types partagés pour les test-utils
 * Évite les références circulaires
 */

import userEvent from "@testing-library/user-event";

export type UserEventInstance = ReturnType<typeof userEvent.setup>;

// Re-export des types nécessaires
export type { RenderOptions, RenderResult } from "@testing-library/react";
