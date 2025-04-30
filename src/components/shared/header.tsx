import React from "react";
import { Logo, Link, SkipNavLink } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Menu, ShoppingCart, LogIn, UserPlus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/actions/auth";

async function Header({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const t = await getTranslations("Header");
  const authT = await getTranslations("Auth");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur",
        className
      )}
      {...props}
    >
      <SkipNavLink />
      <div className="container flex h-16 items-center justify-between">
        {/* Logo linked to homepage */}
        <div className="flex items-center">
          <Link href={{ pathname: "/" }} aria-label={t("logoAriaLabel")}>
            <Logo className="h-8 w-auto" />
          </Link>
        </div>

        {/* Navigation Principale (Desktop) */}
        <nav className="hidden items-center space-x-6 text-sm font-medium md:flex">
          <Link href={{ pathname: "/" }}>{t("home")}</Link>
          <Link href={{ pathname: "/products" }}>{t("products")}</Link>
          <Link href={{ pathname: "/about" }}>{t("about")}</Link>
        </nav>

        {/* Actions Utilisateur & Menu Mobile */}
        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Actions Desktop (Panier, Compte / Auth) */}
          <div className="hidden items-center space-x-2 md:flex">
            <Button variant="ghost" size="icon" aria-label={t("cartAriaLabel")}>
              <ShoppingCart className="h-5 w-5" />
            </Button>

            {user ? (
              // User is logged in
              <>
                <span className="hidden text-sm font-medium lg:inline">{user.email}</span>
                {/* Logout Form */}
                <form action={logoutAction}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    {authT("logout")}
                  </Button>
                </form>
              </>
            ) : (
              // User is not logged in
              <>
                <Button variant="ghost" asChild size="sm">
                  <Link href={{ pathname: "/login" }}>
                    <LogIn className="mr-2 h-4 w-4" />
                    {authT("loginTitle")}
                  </Link>
                </Button>
                <Button variant="default" asChild size="sm">
                  <Link href={{ pathname: "/register" }}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {authT("registerTitle")}
                  </Link>
                </Button>
              </>
            )}
            {/* Ajouter Sélecteur de Langue ici si besoin */}
          </div>

          {/* Bouton Menu Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("mobileMenuAriaLabel")}
            // onClick={() => setIsMobileMenuOpen(true)} // Client logic needs separate component
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile menu logic needs to be extracted to a Client Component */}
    </header>
  );
}

export { Header };
