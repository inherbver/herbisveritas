"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, type AppPathname } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import { Button } from "@/components/ui/button";
import { LanguagesIcon } from "lucide-react";
import { startTransition } from "react";

export default function LocaleSwitcher() {
  return null; // Masquer le sélecteur de langue
  const t = useTranslations("Global.LocaleSwitcher");
  const currentLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const currentParams = useParams();

  const otherLocale = locales.find((l) => l !== currentLocale);

  if (!otherLocale) {
    return null;
  }

  const handleChangeLocale = () => {
    startTransition(() => {
      // currentParams is Readonly<Record<string, string | string[] | undefined>>
      // We need to construct params compatible with next-intl's router, typically Record<string, string | number>
      // and ensure it matches the expected structure for the given pathname.
      const newParams: Record<string, string | string[] | undefined> = {};
      for (const key in currentParams) {
        if (Object.prototype.hasOwnProperty.call(currentParams, key)) {
          const value = currentParams[key];
          if (typeof value === "string") {
            newParams[key] = value;
          } else if (Array.isArray(value)) {
            // For catch-all routes, next-intl/navigation expects the array directly
            // or a string if the path definition uses a string for the catch-all.
            // However, router.replace's `params` object usually expects string/number values for keys.
            // Let's join, assuming simple catch-all segments. This might need adjustment
            // based on how AppPathname and specific route params are defined in navigation.ts
            newParams[key] = value.join("/");
          }
          // undefined values are skipped
        }
      }

      router.replace(
        {
          pathname: pathname as AppPathname, // pathname is already AppPathname
          // TODO: Refactor params construction for stricter type compatibility with next-intl
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params: newParams as any,
        },
        { locale: otherLocale }
      );
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleChangeLocale}
      aria-label={t("switchLocale", { locale: otherLocale })}
      title={t("switchLocale", { locale: otherLocale })}
    >
      <LanguagesIcon className="h-5 w-5" />
      <span className="sr-only">{t("switchLocale", { locale: otherLocale })}</span>
    </Button>
  );
}
