import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import ClientLayout from "@/components/layout/client-layout";

interface Props {
  children: ReactNode;
  params: { locale: string };
}

async function getMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound();
  }
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) {
    console.warn(
      `Invalid locale "${locale}" requested, falling back to default or triggering notFound.`
    );
    notFound();
  }

  const messages = await getMessages(locale);

  return (
    <ClientLayout locale={locale} messages={messages}>
      {children}
    </ClientLayout>
  );
}
