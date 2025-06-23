"use client";

import React, { useTransition } from "react";
import { useTranslations } from "next-intl";
import { loadStripe } from "@stripe/stripe-js";
import { toast } from "sonner";

import { createStripeCheckoutSession } from "@/actions/stripeActions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/**
 * @description Un bouton client qui gère le processus de paiement Stripe.
 * Il appelle la Server Action pour créer une session, gère l'état de chargement,
 * et redirige l'utilisateur vers la page de paiement Stripe.
 */
export function CheckoutButton() {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("CartDisplay");
  const tGlobal = useTranslations("Global");

  const handleCheckout = () => {
    startTransition(async () => {
      const result = await createStripeCheckoutSession();

      if (!result.success || !result.sessionId) {
        toast.error(result.error || tGlobal("genericError"));
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        toast.error("Erreur de configuration Stripe.");
        return;
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId });

      if (error) {
        toast.error(
          error.message || "Une erreur est survenue lors de la redirection vers le paiement."
        );
      }
    });
  };

  return (
    <Button size="lg" className="w-full" onClick={handleCheckout} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("processing")}
        </>
      ) : (
        t("checkout")
      )}
    </Button>
  );
}
