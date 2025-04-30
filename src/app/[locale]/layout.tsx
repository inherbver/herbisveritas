import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import ClientLayout from "@/components/layout/client-layout";
import { setRequestLocale, getTimeZone } from "next-intl/server";

interface Props {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

async function getMessages(locale: string) {
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return messages;
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound();
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    console.warn(
      `Invalid locale "${locale}" requested, falling back to default or triggering notFound.`
    );
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages(locale);
  const timeZone = await getTimeZone({ locale });

  return (
    <ClientLayout locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </ClientLayout>
  );
}
