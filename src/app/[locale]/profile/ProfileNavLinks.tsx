"use client";

import { useTranslations } from "next-intl";
// Ajustez le chemin d'importation si votre configuration de navigation next-intl est différente
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils"; // Supposant que vous avez cn pour classnames

// Définir un type plus spécifique pour les chemins du profil
type ProfilePathname = "/profile/account" | "/profile/addresses" | "/profile/orders";

interface NavLinkItem {
  href: ProfilePathname;
  labelKey: string;
}

const profileNavLinks: NavLinkItem[] = [
  { href: "/profile/account", labelKey: "account" },
  { href: "/profile/addresses", labelKey: "addresses" },
  { href: "/profile/orders", labelKey: "orders" },
  // Ajoutez d'autres liens ici si nécessaire
];

export default function ProfileNavLinks() {
  const t = useTranslations("ProfileNav"); // Namespace pour les traductions de ces liens
  const pathname = usePathname();

  return (
    <nav aria-label={t("navigationLabel")} className="flex flex-col space-y-1">
      {profileNavLinks.map((link) => {
        const isActive = pathname === link.href;
        // Pour une correspondance plus souple (ex: /profile/account/edit doit activer /profile/account):
        // const isActive = pathname.startsWith(link.href);

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
    </nav>
  );
}

// N'oubliez pas d'ajouter les clés suivantes à vos fichiers de traduction (en.json, fr.json)
// sous le namespace "ProfileNav":
// "navigationLabel": "Profile Navigation" (ou "Navigation du profil")
// "account": "My Account" (ou "Mon Compte")
// "addresses": "My Addresses" (ou "Mes Adresses")
// "orders": "My Orders" (ou "Mes Commandes")
