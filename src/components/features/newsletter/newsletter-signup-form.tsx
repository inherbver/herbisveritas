"use client";

import { useState, useTransition } from "react";
import { subscribeToNewsletter } from "@/actions/newsletterActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Loader2, Check } from "lucide-react";

interface NewsletterSignupFormProps {
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "inline";
}

export function NewsletterSignupForm({
  className = "",
  size = "default",
  variant = "default",
}: NewsletterSignupFormProps) {
  const [email, setEmail] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        const result = await subscribeToNewsletter(formData);

        if (result.success) {
          setIsSuccess(true);
          setEmail("");
          toast.success(result.message || "Inscription réussie !");

          // Reset success state after 3 seconds
          setTimeout(() => setIsSuccess(false), 3000);
        } else {
          toast.error(result.error || "Erreur lors de l'inscription");
        }
      } catch (error) {
        toast.error("Erreur inattendue");
        console.error("Newsletter subscription error:", error);
      }
    });
  };

  if (isSuccess) {
    return (
      <div className={`flex items-center justify-center space-x-2 text-green-600 ${className}`}>
        <Check className="h-5 w-5" />
        <span className="text-sm font-medium">Merci ! Inscription confirmée.</span>
      </div>
    );
  }

  const inputSizeClasses = {
    sm: "h-8 text-xs",
    default: "h-10 text-sm",
    lg: "h-12 text-base",
  };

  const buttonSizeClasses = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  const containerClasses =
    variant === "inline" ? "flex flex-col gap-2 sm:flex-row sm:items-center" : "space-y-3";

  return (
    <form action={handleSubmit} className={`${containerClasses} ${className}`}>
      <div className={variant === "inline" ? "flex-1" : ""}>
        <label htmlFor="newsletter-email" className="sr-only">
          Adresse e-mail
        </label>
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre.email@example.com"
          disabled={isPending}
          className={`w-full ${inputSizeClasses[size]} bg-background/50 border-border focus:border-primary`}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending || !email.trim()}
        className={`${buttonSizeClasses[size]} ${
          variant === "inline" ? "shrink-0" : "w-full"
        } font-semibold transition-all hover:shadow-md disabled:opacity-50`}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            S'inscrire
          </>
        )}
      </Button>
    </form>
  );
}
