"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/utils/cn";
import { ArrowLeft } from "lucide-react";

// Définir un type plus spécifique pour les chemins du profil
type ProfilePathname =
  | "/profile/account"
  | "/profile/addresses"
  | "/profile/orders"
  | "/profile/password";

interface NavLinkItem {
  href: ProfilePathname;
  labelKey: string;
}

const mainLink: NavLinkItem = { href: "/profile/account", labelKey: "account" };
const subLinks: NavLinkItem[] = [
  { href: "/profile/addresses", labelKey: "addresses" },
  { href: "/profile/orders", labelKey: "orders" },
  { href: "/profile/password", labelKey: "password" },
];

export default function ProfileNavLinks() {
  const t = useTranslations("ProfileNav");
  const pathname = usePathname();

  const isSubPage = pathname !== mainLink.href;

  return (
    <nav aria-label={t("navigationLabel")} className="flex flex-col space-y-4">
      {isSubPage && (
        <Link
          href={mainLink.href}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-accent-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToAccount")}
        </Link>
      )}

      <div>
        <Link
          href={mainLink.href}
          className={cn(
            "block rounded-md px-3 py-2 text-base font-semibold text-foreground",
            !isSubPage && "bg-accent"
          )}
        >
          {t(mainLink.labelKey)}
        </Link>

        <div className="mt-2 space-y-1 pl-4">
          {subLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent font-semibold text-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// N'oubliez pas d'ajouter les clés suivantes à vos fichiers de traduction (en.json, fr.json)
// sous le namespace "ProfileNav":
// "navigationLabel": "Profile Navigation" (ou "Navigation du profil")
// "account": "My Account" (ou "Mon Compte")
// "addresses": "My Addresses" (ou "Mes Adresses")
// "orders": "My Orders" (ou "Mes Commandes")
// "password": "My Password" (ou "Mon Mot de Passe")
