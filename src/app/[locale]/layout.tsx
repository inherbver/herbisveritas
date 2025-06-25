import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { locales, Locale } from "@/i18n-config";
import ClientLayout from "@/components/layout/client-layout";
import { setRequestLocale, getTimeZone, getMessages } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import "@/app/globals.css";

interface Props {
  children: ReactNode;
  params: { locale: string };
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
    messages = await getMessages({ locale: currentLocale });
  } catch (error) {
    console.error("Failed to load messages via getMessages():", error);
    notFound();
  }

  const timeZone = await getTimeZone({ locale: currentLocale });

  return (
    <ClientLayout locale={currentLocale} messages={messages} timeZone={timeZone}>
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <Header />
        {children}
      </div>
      <Toaster richColors position="bottom-right" />
      {/* <Footer /> */}
    </ClientLayout>
  );
}
