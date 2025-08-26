"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { loginAction } from "@/actions/authActions";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";

const loginSchema = z.object({
  email: z.string().email("L'adresse email n'est pas valide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function AdminLoginForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(loginAction, undefined);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Marquer qu'on va se connecter pour forcer le refresh du header
  const handleSubmit = async (data: LoginFormValues) => {
    // Marquer dans sessionStorage qu'on initie une connexion
    if (typeof window !== "undefined") {
      sessionStorage.setItem("just_logged_in", "true");
    }

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);

    formAction(formData);
  };

  // Si la connexion réussit, l'action redirigera vers /shop
  useEffect(() => {
    if (state?.success) {
      // S'assurer que le flag est bien défini
      if (typeof window !== "undefined") {
        sessionStorage.setItem("just_logged_in", "true");
      }
      // Forcer un refresh de la page pour actualiser le header
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter en tant qu'admin"
          )}
        </Button>
      </form>
    </Form>
  );
}
