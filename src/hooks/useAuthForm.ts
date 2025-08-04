"use client";

import { useForm, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useActionState } from 'react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { ZodSchema } from 'zod';
import type { FormActionResult } from '@/lib/core/result';

interface UseAuthFormOptions<T extends Record<string, any>> {
  schema: ZodSchema<T>;
  action: (state: any, formData: FormData) => Promise<FormActionResult<any>>;
  onSuccess?: (data: any) => void;
  defaultValues?: T;
  useFormOptions?: Omit<UseFormProps<T>, 'resolver' | 'defaultValues'>;
}

export function useAuthForm<T extends Record<string, any>>({
  schema,
  action,
  onSuccess,
  defaultValues,
  useFormOptions = {}
}: UseAuthFormOptions<T>) {
  const [state, formAction] = useActionState(action, null);
  
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    criteriaMode: 'all', // Collecter toutes les erreurs
    ...useFormOptions
  });

  // Gérer les erreurs serveur
  useEffect(() => {
    if (!state) return;

    // Si succès
    if (state.success && onSuccess) {
      onSuccess(state.data);
      return;
    }

    // Si erreur générale (pas d'erreurs de champs)
    if (state.error && !state.fieldErrors) {
      toast.error(state.error);
      return;
    }

    // Si erreurs par champ
    if (state.fieldErrors) {
      Object.entries(state.fieldErrors).forEach(([field, messages]) => {
        const message = Array.isArray(messages) ? messages[0] : messages;
        form.setError(field as any, {
          type: 'server',
          message: message as string
        });
      });
    }

    // Si message de succès
    if (state.success && state.message) {
      toast.success(state.message);
    }
  }, [state, form, onSuccess]);

  return {
    form,
    state,
    formAction,
    isLoading: form.formState.isSubmitting,
    // Helpers pour accès rapide
    register: form.register,
    errors: form.formState.errors,
    control: form.control,
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    reset: form.reset,
    clearErrors: form.clearErrors,
    setError: form.setError,
    trigger: form.trigger
  };
}