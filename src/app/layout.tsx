import "./globals.css";
import type { ReactNode } from "react";
import { Raleway, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

// Ce layout racine est nécessaire pour l'App Router.
// Il fournit la structure HTML de base.
// Il initialise les polices globales.

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway", // Variable CSS pour Tailwind
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair", // Variable CSS pour Tailwind
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={cn(raleway.variable, playfair.variable)} suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased")}>{children}</body>
    </html>
  );
}
