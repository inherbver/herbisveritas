"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

interface ClientLayoutProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string; // Added timeZone prop
}

export default function ClientLayout({ children, locale, messages, timeZone }: ClientLayoutProps) {
  return (
    // Pass timeZone to the provider
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
      <Toaster />
    </NextIntlClientProvider>
  );
}
