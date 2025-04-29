"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

interface ClientLayoutProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export default function ClientLayout({ children, locale, messages }: ClientLayoutProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <Toaster />
    </NextIntlClientProvider>
  );
}
