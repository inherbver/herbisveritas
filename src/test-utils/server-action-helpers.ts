/**
 * Helpers pour tester les Server Actions avec les bonnes signatures
 */

import type { ActionResult } from "@/lib/core/result";

/**
 * Wrapper pour appeler une Server Action avec la bonne signature
 * Les Server Actions Next.js prennent (prevState, formData)
 */
export const callServerAction = async <T>(
  action: (
    prevState: ActionResult<T> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<T>>,
  formData: FormData,
  prevState?: ActionResult<T>,
): Promise<ActionResult<T>> => {
  return action(prevState, formData);
};

/**
 * Helper pour créer un FormData à partir d'un objet
 */
export const createFormData = (
  data: Record<string, string | number | boolean>,
): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  return formData;
};

/**
 * Helper pour tester rapidement une Server Action
 */
export const testServerAction = <T>(
  action: (
    prevState: ActionResult<T> | undefined,
    formData: FormData,
  ) => Promise<ActionResult<T>>,
) => ({
  call: (
    data: Record<string, string | number | boolean>,
    prevState?: ActionResult<T>,
  ) => callServerAction(action, createFormData(data), prevState),

  callWithFormData: (formData: FormData, prevState?: ActionResult<T>) =>
    callServerAction(action, formData, prevState),
});

/**
 * Utilitaires pour créer des états précédents de test
 */
export const createPrevState = <T>(
  success: boolean,
  data?: T,
  error?: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<T> => ({
  success,
  data: data !== undefined ? data : undefined,
  error,
  fieldErrors,
});

/**
 * États précédents courants pour les tests
 */
export const commonPrevStates = {
  initial: undefined,
  success: createPrevState<unknown>(true),
  error: createPrevState<unknown>(false, undefined, "Erreur précédente"),
  validationError: createPrevState<unknown>(false, undefined, undefined, {
    email: ["Email requis"],
  }),
};
