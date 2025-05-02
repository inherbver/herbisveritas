import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import ClientLayout from "@/components/layout/client-layout";
import { setRequestLocale, getTimeZone } from "next-intl/server";
import { Header } from "@/components/shared/header";

interface Props {
  children: ReactNode;
  params: { locale: string };
}

async function loadMessages(locale: string) {
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound();
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    console.warn(
      `Invalid locale "${locale}" requested, falling back to default or triggering notFound.`
    );
    notFound();
  }

  setRequestLocale(locale);

  const messages = await loadMessages(locale);
  const timeZone = await getTimeZone({ locale });

  return (
    // NE PAS inclure <html> ou <body> ici.
    // ClientLayout enveloppe la structure interne.
    <ClientLayout locale={locale} messages={messages} timeZone={timeZone}>
      <Header />
      {children} {/* Main tag removed, handled by page-specific layouts like MainLayout */}
      {/* <Footer /> */}
    </ClientLayout>
    // NE PAS inclure <html> ou <body> ici.
  );
}
