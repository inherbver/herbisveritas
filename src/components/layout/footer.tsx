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

      {/* Filigrane floral léger et bien espacé */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.025] bg-[url('/illustration_footer_nobg.svg')] bg-repeat bg-[length:300px_300px] hidden lg:block"
        aria-hidden="true"
        style={{
          backgroundPosition: "150px 150px",
          maskImage:
            "radial-gradient(ellipse 60% 40% at center, black 20%, transparent 60%)",
        }}
      />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
          {/* Brand & Description Column avec motif floral intégré */}
          <section className="bg-background/60 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-sm lg:col-span-1 relative overflow-hidden">
            {/* Motif floral intégré uniquement au bas de la carte */}
            <div
              className="absolute bottom-4 right-4 h-48 w-48 opacity-75 bg-[url('/illustration_footer_nobg.svg')] bg-no-repeat bg-contain"
              aria-hidden="true"
            />

            <header className="space-y-4 relative z-10">
              <h2 className="font-serif text-lg font-medium text-primary/90">
                In Herbis Veritas
              </h2>
              <div
                className="h-0.5 w-12 bg-gradient-to-r from-primary to-primary/50"
                aria-hidden="true"
              ></div>
              <p className="text-green-700/90 text-sm font-medium leading-relaxed">
                Inspirés par la nature, créés artisanalement dans le sud de la
                France.
              </p>
            </header>
          </section>

          {/* Navigation Column */}
          <nav
            aria-label="{tFooter('navLabel')}"
            className="bg-background/60 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-sm lg:col-span-1"
          >
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

          {/* Support Column */}
          <nav
            aria-label="Support et aide"
            className="bg-background/60 backdrop-blur-sm rounded-2xl p-6 border border-border/30 shadow-sm lg:col-span-1"
          >
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

          {/* Newsletter & Social Column - Bloc différencié */}
          <section className="bg-primary/5 backdrop-blur-sm rounded-2xl p-6 border border-primary/20 shadow-md lg:col-span-1 relative overflow-hidden">
            {/* Accent floral discret dans le bloc newsletter */}
            <div
              className="absolute top-4 right-4 h-16 w-16 opacity-[0.08] bg-[url('/illustration_footer_nobg.svg')] bg-no-repeat bg-contain rotate-12"
              aria-hidden="true"
            />

            <div className="relative z-10 space-y-8">
              <article>
                <header>
                  <h3 className="font-serif text-lg font-medium text-primary/90 mb-2">
                    Restons en contact
                  </h3>
                  <div
                    className="h-0.5 w-12 bg-gradient-to-r from-primary to-primary/50 mb-6"
                    aria-hidden="true"
                  ></div>
                </header>
                <p className="text-foreground/80 text-sm leading-relaxed mb-6">
                  Inscrivez-vous à notre newsletter pour des offres exclusives
                  et nos nouveautés.
                </p>
                <aside className="relative">
                  <div className="bg-background/80 p-5 rounded-xl border border-primary/40 shadow-sm backdrop-blur-sm">
                    <NewsletterSignupForm
                      variant="inline"
                      size="default"
                      className="w-full"
                    />
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
                      className="text-secondary/80 transition-all duration-200 hover:scale-110 hover:text-secondary hover:drop-shadow-md focus-visible:outline-secondary group inline-block mr-6"
                      aria-label={`Suivez-nous sur ${item.name}`}
                    >
                      <span className="rounded-full p-2 transition-colors group-hover:bg-secondary/10 inline-block">
                        <item.icon className="h-5 w-5" />
                      </span>
                    </a>
                  ))}
                </nav>
              </aside>
            </div>
          </section>
        </div>

        {/* Copyright Bar - Bas de page uni avec fond contrasté */}
        <footer className="mt-12 -mx-6 lg:-mx-8">
          <div className="bg-background/80 backdrop-blur-sm border-t border-border/30 px-6 lg:px-8 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <p className="text-foreground/70 text-xs font-medium">
                  © {new Date().getFullYear()} In Herbis Veritas.{" "}
                  {tFooter("copyright")}
                </p>
                <div className="flex items-center gap-2 text-green-700/80">
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
                  <span className="text-xs font-medium">
                    Fait avec ❤️ en Occitanie
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </motion.footer>
  );
}
