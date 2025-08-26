import { AdminLoginForm } from "@/components/auth/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Connexion Admin</CardTitle>
          <CardDescription>
            Connectez-vous avec vos identifiants administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
          <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-semibold">Note de test :</p>
            <ul className="space-y-1">
              <li>• Email : inherbver@gmail.com</li>
              <li>• Mot de passe : Admin123!</li>
            </ul>
            <p className="mt-3">
              Après connexion, vous serez redirigé vers /shop avec les liens
              admin visibles dans le header.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
