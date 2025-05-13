"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, type AppPathname } from "@/i18n/navigation"; 
import { useParams } from 'next/navigation'; 
import { locales, Locale } from "@/i18n-config"; 
import { Button } from "@/components/ui/button";
import { LanguagesIcon } from "lucide-react"; 
import { startTransition } from "react"; 

export default function LocaleSwitcher() {
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
      const paramsForRouter: Record<string, string | number> = {};
      Object.keys(currentParams).forEach(key => {
        const paramValue = currentParams[key]; 
        if (Array.isArray(paramValue)) {
          paramsForRouter[key] = paramValue.join('/');
        } else {
          paramsForRouter[key] = paramValue;
        }
      });

      router.replace(
        {
          pathname: pathname as AppPathname,
          params: paramsForRouter
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
