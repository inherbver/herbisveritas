// src/components/domain/auth/change-password-form.tsx
"use client";

import { useState, useEffect, useActionState, startTransition } from "react";
import { useFormStatus } from "react-dom";
import { updatePasswordAction } from "@/app/[locale]/profile/actions"; // Assurez-vous que ce chemin est correct
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import useCartStore from "@/stores/cartStore"; // <--- AJOUTÉ

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("ChangePasswordForm.SubmitButton");
  return (
    <Button type="submit" aria-disabled={pending} disabled={pending}>
      {pending ? t("pending") : t("idle")}
    </Button>
  );
}

export default function ChangePasswordForm() {
  const t = useTranslations("ChangePasswordForm");

  const initialState = { success: false, message: "" };
  // Le type de state est inféré de UpdatePasswordResult | null, mais pour être explicite :
  // const [state, formAction] = useActionState<UpdatePasswordResult | null, FormData>(
  //   updatePasswordAction,
  //   initialState
  // );
  // Simplifié si initialState correspond bien à la structure attendue par updatePasswordAction pour prevState
  const [state, formAction] = useActionState(updatePasswordAction, initialState);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  // Pour éviter les toasts répétés si le message d'état ne change pas
  const [prevServerMessage, setPrevServerMessage] = useState<string | undefined>(undefined);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientError(null);

    if (newPassword.length < 8) {
      setClientError(t("validation.minLength"));
      toast.error(t("validation.minLength")); // Ajout d'un toast pour l'erreur client aussi
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError(t("validation.passwordsMustMatch"));
      toast.error(t("validation.passwordsMustMatch")); // Ajout d'un toast
      return;
    }

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    // Vérifier si 'state' et 'state.message' existent et si le message a changé
    if (state && typeof state.message === "string" && state.message !== prevServerMessage) {
      if (state.success) {
        toast.success(state.message || t("notifications.success")); // Utilise le message du serveur s'il existe
        setNewPassword("");
        setConfirmPassword("");
        // L'utilisateur est déconnecté par la Server Action,
        // donc on vide le panier côté client.
        useCartStore.getState().clearCart(); // <--- VIDER LE PANIER ICI
        // Idéalement, rediriger vers la page de connexion après un court délai
        // pour que l'utilisateur voie le toast de succès.
        // setTimeout(() => {
        //   // router.push(`/${currentLocale}/login`); // Assurez-vous d'avoir accès au router et locale
        // }, 2000);
      } else {
        // Gérer les différents types d'erreurs venant du serveur
        let errorMessage = state.message || t("notifications.errorUnknown");
        if (state.error?.type === "validation" && state.error.details) {
          // Pourrait formater les erreurs de validation spécifiques si nécessaire
          const fieldErrors = Object.values(state.error.details).flat().join(", ");
          errorMessage = `${t("notifications.validationErrorPrefix")}: ${fieldErrors}`;
        } else if (state.error?.type === "supabase") {
          errorMessage = `${t("notifications.supabaseErrorPrefix")}: ${state.error.details}`;
        }
        toast.error(errorMessage);
      }
      setPrevServerMessage(state.message);
    } else if (state && state.success && state.message === prevServerMessage) {
      // Cas où l'action a réussi mais le message n'a pas changé (peut arriver si on resubmit sans changer de form)
      // On s'assure que le panier est vidé si ce n'est pas déjà fait
      useCartStore.getState().clearCart();
    }
  }, [state, t, prevServerMessage]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="newPassword">{t("newPasswordLabel")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="mt-1"
        />
      </div>

      {clientError && <p className="text-sm text-destructive">{clientError}</p>}

      {/* Affichage amélioré des erreurs serveur */}
      {state &&
        !state.success &&
        state.message &&
        state.message !== prevServerMessage &&
        !clientError && (
          <p className="text-sm text-destructive">
            {/* Affiche le message d'erreur brut du serveur s'il est pertinent, sinon un générique */}
            {state.message || t("notifications.errorUnknown")}
          </p>
        )}
      <SubmitButton />
    </form>
  );
}
