"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from "next-intl";
import { ReactNode } from "react";
// Importez ThemeProvider si vous l'utilisez
// import { ThemeProvider } from 'next-themes';

type Props = {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages; // Utiliser le type fourni par next-intl
  // themeProps?: React.ComponentProps<typeof ThemeProvider>; // Si ThemeProvider est utilisé
};

export function Providers({ children, locale, messages /*, themeProps */ }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {/* Décommentez ThemeProvider si nécessaire */}
      {/* <ThemeProvider {...themeProps}> */}
      {children}
      {/* </ThemeProvider> */}
    </NextIntlClientProvider>
  );
}
