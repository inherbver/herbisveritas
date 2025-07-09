import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "./container";
import { Button } from "@/components/ui/button";
import { Twitter, Instagram, Facebook } from "lucide-react";

const Logo = () => {
  const tGlobal = useTranslations("Global");
  return (
    <Link
      href="/"
      className="font-serif text-xl font-bold text-primary md:text-2xl"
      aria-label={tGlobal("Header.logoAriaLabel")}
    >
      In Herbis Veritas
    </Link>
  );
};

export function Footer() {
  const t = useTranslations("Footer");

  const footerNav = [
    { name: t("links.about"), href: "/about" },
    { name: t("links.contact"), href: "/contact" },
    { name: t("links.terms"), href: "/terms" },
    { name: t("links.privacy"), href: "/privacy-policy" },
  ] as const;

  const socialLinks = [
    { name: "Twitter", href: "#", icon: Twitter },
    { name: "Instagram", href: "#", icon: Instagram },
    { name: "Facebook", href: "#", icon: Facebook },
  ];

  return (
    <footer className="border-border/50 relative overflow-hidden border-t bg-background bg-footer-texture bg-right-bottom bg-no-repeat">
      <Container>
        <div className="py-12">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row md:items-start">
            <div className="max-w-sm text-center md:text-left">
              <Logo />
              <p className="mt-4 text-base text-muted-foreground">{t("description")}</p>
            </div>
            <nav aria-label={t("navLabel")}>
              <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
                {footerNav.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <div className="border-border/50 flex flex-col items-center justify-between gap-4 border-t py-6 md:flex-row">
          <p className="text-center text-sm text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} In Herbis Veritas. {t("copyright")}
          </p>
          <div className="flex items-center gap-2">
            {socialLinks.map((item) => (
              <Button key={item.name} variant="ghost" size="icon" asChild>
                <a
                  href={item.href}
                  aria-label={item.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <item.icon className="size-5" />
                </a>
              </Button>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
