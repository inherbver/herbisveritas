"use client";

import { useRef } from "react";
import { Instagram, Facebook } from "lucide-react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { NewsletterSignupForm } from "@/components/features/newsletter/newsletter-signup-form";

const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/in_herbis_veritas/?utm_source=ig_web_button_share_sheet",
    icon: Instagram,
  },
  { name: "Facebook", href: "https://www.facebook.com/in.herbis.veritas", icon: Facebook },
];

const navigationLinks = [
  { name: "À propos", href: "/about" },
  { name: "Contact", href: "/contact" },
  { name: "Conditions d’utilisation", href: "/terms" },
  { name: "Politique de confidentialité", href: "/privacy" },
];

export function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

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
      className="relative isolate mt-24 overflow-hidden bg-background after:absolute after:inset-0 after:-z-20 after:bg-[url('/grain.svg')] after:bg-[length:200px_200px] after:bg-repeat after:opacity-5"
    >
      {/* Accent Bar */}
      <div className="h-[3px] w-full bg-accent" />

      {/* Watermark SVG */}
      <svg
        aria-hidden
        className="text-secondary/10 absolute right-0 top-0 -z-10 hidden h-72 w-72 -translate-y-1/3 translate-x-1/3 sm:block"
      >
        <use href="/leaf.svg#leaf" />
      </svg>

      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-3 md:gap-x-8">
          {/* Brand & Description Column */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-medium text-primary">In Herbis Veritas</h2>
            <p className="text-foreground/80 text-sm">
              Des tisanes biologiques d'exception, cultivées avec passion pour votre bien-être au
              quotidien.
            </p>
          </div>

          {/* Navigation Column */}
          <div className="grid grid-cols-2 gap-8 md:col-span-1">
            <div>
              <h3 className="font-semibold text-foreground">Navigation</h3>
              <ul role="list" className="mt-4 space-y-2">
                {navigationLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-foreground/80 text-sm hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Support</h3>
              <ul role="list" className="mt-4 space-y-2">
                {supportLinks.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-foreground/80 text-sm hover:text-primary"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter & Social Column */}
          <div className="space-y-8 md:col-span-1">
            <div>
              <h3 className="font-semibold text-foreground">Restons en contact</h3>
              <p className="text-foreground/80 mt-2 text-sm">
                Inscrivez-vous à notre newsletter pour des offres exclusives et nos nouveautés.
              </p>
              <NewsletterSignupForm variant="inline" className="mt-4" />
            </div>
            <div className="flex items-center gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent/90 transition-all hover:scale-110 hover:text-accent hover:drop-shadow-md focus-visible:outline-primary"
                  aria-label={item.name}
                >
                  <item.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="border-border/20 mt-16 border-t pt-8">
          <p className="text-foreground/70 text-xs">
            © {new Date().getFullYear()} In Herbis Veritas. Tous droits réservés.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
