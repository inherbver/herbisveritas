import type { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import { Toaster } from "@/components/ui/sonner";

interface Props {
  children: ReactNode;
  params: { locale: string }; // The type definition remains the same
}

export default async function LocaleLayout(props: Props) {
  // Providing all messages to the client
  // Optional: Validate that the incoming `locale` parameter is valid

  // Await the params object *before* accessing its properties
  const { locale } = await Promise.resolve(props.params); // Use await on props.params

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* ThemeProvider can be potentially re-added here later */}
      {/* <ThemeProvider
             attribute="class"
             defaultTheme="system"
             enableSystem
             disableTransitionOnChange
          > */}
             {props.children}
             <Toaster />
          {/* </ThemeProvider> */}
    </NextIntlClientProvider>
  );
}