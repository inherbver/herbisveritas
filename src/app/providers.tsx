'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
// Importez ThemeProvider si vous l'utilisez
// import { ThemeProvider } from 'next-themes';

type Props = {
  children: ReactNode;
  locale: string;
  messages: any; // Ou un type plus précis si vous avez généré les types de messages
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
