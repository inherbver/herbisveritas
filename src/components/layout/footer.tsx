"use client";

import { useRef } from "react";
import { Instagram, Facebook } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { motion, useInView } from "framer-motion";
import { NewsletterSignupForm } from "@/components/features/newsletter/newsletter-signup-form";
import { useTranslations } from "next-intl";

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/in_herbis_veritas/?utm_source=ig_web_button_share_sheet",
    icon: Instagram,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/in.herbis.veritas",
    icon: Facebook,
  },
];

const navigationLinks = [
  { name: "À propos", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Conditions d’utilisation", href: "/terms" },
  { name: "Politique de confidentialité", href: "/privacy-policy" },
];

export function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const tFooter = useTranslations("Footer");

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const supportLinks = [
    { name: "FAQ", href: "/faq" },
    { name: "Livraison", href: "/shipping" },
    { name: "Retours", href: "/returns" },
  ];

  return (
    <motion.footer
      ref={ref}
      variants={footerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="relative isolate mt-32 overflow-hidden bg-gradient-to-b from-background to-muted/20"
    >
      {/* Subtle botanical pattern bar */}
      <hr className="h-[2px] w-full bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 border-0" />

      {/* Botanical watermarks in corners - Hidden on mobile */}
      <div
        className="absolute left-0 top-0 -z-10 h-80 w-80 -translate-x-1/4 -translate-y-1/6 opacity-40 bg-[url('/illustration_footer_nobg.svg')] bg-no-repeat bg-contain hidden md:block"
        aria-hidden="true"
      />

      <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-y-16 md:grid-cols-3 md:gap-x-16">
          {/* Brand & Description Column */}
          <section className="space-y-6 relative">
            <div className="h-20"></div>
            <header className="space-y-2">
              <h2 className="font-serif text-2xl font-semibold text-primary/90">
                In Herbis Veritas
              </h2>
              <p className="text-green-600/80 text-xs font-medium italic leading-relaxed">
                Inspirés par la nature, créés artisanalement dans le sud de la
                France.
              </p>
            </header>
          </section>

          {/* Navigation Column */}
          <section className="grid grid-cols-2 gap-12 md:col-span-1">
            <nav aria-label="{tFooter('navLabel')}">
              <h3 className="font-serif text-lg font-medium text-primary/90 mb-2">
                Navigation
              </h3>
              <div
                className="h-0.5 w-10 bg-gradient-to-r from-primary to-transparent mb-6"
                aria-hidden="true"
              ></div>
              <ul role="list" className="space-y-3">
                {navigationLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-foreground/75 text-sm transition-all duration-200 hover:text-primary hover:translate-x-1 hover:underline underline-offset-4 decoration-primary/40"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Support et aide">
              <h3 className="font-serif text-lg font-medium text-primary/90 mb-2">
                Support
              </h3>
              <div
                className="h-0.5 w-10 bg-gradient-to-r from-primary to-transparent mb-6"
                aria-hidden="true"
              ></div>
              <ul role="list" className="space-y-3">
                {supportLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-foreground/75 text-sm transition-all duration-200 hover:text-primary hover:translate-x-1 hover:underline underline-offset-4 decoration-primary/40"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </section>

          {/* Newsletter & Social Column */}
          <section className="space-y-10 md:col-span-1">
            <article>
              <header>
                <h3 className="font-serif text-lg font-medium text-primary/90 mb-2">
                  Restons en contact
                </h3>
                <div
                  className="h-0.5 w-10 bg-gradient-to-r from-primary to-transparent mb-6"
                  aria-hidden="true"
                ></div>
              </header>
              <p className="text-foreground/75 text-sm leading-relaxed mb-6">
                Inscrivez-vous à notre newsletter pour des offres exclusives et
                nos nouveautés.
              </p>
              <aside className="relative">
                <div className="flex gap-2">
                  <NewsletterSignupForm variant="inline" className="flex-1" />
                </div>
              </aside>
            </article>
            <aside>
              <h4 className="font-serif text-sm font-medium text-primary/90 mb-4">
                Suivez notre aventure
              </h4>
              <nav aria-label="Réseaux sociaux">
                {socialLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/80 transition-all duration-200 hover:scale-110 hover:text-primary hover:drop-shadow-md focus-visible:outline-primary group inline-block mr-6"
                    aria-label={`Suivez-nous sur ${item.name}`}
                  >
                    <span className="rounded-full p-2 transition-colors group-hover:bg-primary/10 inline-block">
                      <item.icon className="h-5 w-5" />
                    </span>
                  </a>
                ))}
              </nav>
            </aside>
          </section>
        </div>

        {/* Copyright Bar */}
        <footer className="border-border/30 mt-16 border-t pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-foreground/60 text-xs">
              © {new Date().getFullYear()} In Herbis Veritas.{" "}
              {tFooter("copyright")}
            </p>
            <aside className="flex items-center gap-2 text-green-600/50">
              <svg
                aria-hidden="true"
                className="h-3 w-3"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="8" cy="8" r="1" />
                <circle cx="4" cy="8" r="1" />
                <circle cx="12" cy="8" r="1" />
              </svg>
              <span className="text-xs font-light italic">
                Fait avec ❤️ en Occitanie
              </span>
            </aside>
          </div>
        </footer>
      </section>
    </motion.footer>
  );
}
