import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import ClientLayout from "@/components/layout/client-layout";
import { setRequestLocale, getTimeZone } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

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

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: currentLocale } = await params;

  if (!locales.includes(currentLocale as Locale)) {
    console.warn(
      `LocaleLayout: Invalid locale '${currentLocale}' received. Available locales are: ${locales.join(", ")}. Falling back to default locale '${locales[0]}'.`
    );
    notFound();
  }

  await setRequestLocale(currentLocale);

  let messages;
  try {
    messages = await loadMessages(currentLocale);
  } catch (error) {
    console.error("Failed to load messages:", error);
    notFound();
  }

  const timeZone = await getTimeZone({ locale: currentLocale });

  return (
    <ClientLayout locale={currentLocale} messages={messages} timeZone={timeZone}>
      <Header />
      <Toaster richColors position="bottom-right" />
      {children}
      {/* <Footer /> */}
    </ClientLayout>
  );
}
