"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

interface ClientLayoutProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string; // Added timeZone prop
}

export default function ClientLayout({ children, locale, messages, timeZone }: ClientLayoutProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Pass timeZone to the provider */}
      <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
        {children}
        <Toaster />
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
