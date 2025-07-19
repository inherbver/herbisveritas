"use client"; // Marquer comme Client Component car utilise useTranslations

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

// Vous pourrez décommenter Header/Footer quand ils seront intégrés
// import { Header } from '@/components/shared/header';
// import { Footer } from '@/components/shared/footer';

export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <main className="flex-1">
      <section className="relative h-[calc(100vh-var(--header-height,88px))] w-full overflow-hidden">
        <Image
          src="/images/hero-background.jpg" // IMPORTANT: Remplacez par le chemin de votre image
          alt="Arrière-plan de la section hero"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-transparent dark:from-black/70" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center py-32 text-center text-white md:py-24">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <h1
                className="font-serif text-4xl font-medium tracking-tight text-white md:text-5xl lg:text-6xl"
                style={{ lineHeight: "1.3" }}
              >
                {t("title", { defaultValue: "L'art de la terre, la science des plantes" })}
              </h1>
              <p className="text-primary/90 mt-4 max-w-2xl text-lg md:text-xl">
                {t("description", {
                  defaultValue:
                    "Découvrez nos préparations uniques, issues d'un savoir-faire ancestral et d'une agriculture respectueuse.",
                })}
              </p>
              <Button
                asChild
                size="lg"
                className="focus-visible:ring-secondary/50 mt-8 rounded-2xl bg-secondary font-medium text-secondary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Link href="/shop">{t("cta", { defaultValue: "Voir tous les marchés" })}</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div
            className="absolute bottom-6"
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <button
              aria-label="Faire défiler vers le bas"
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              onClick={() => window.scrollTo({ top: window.innerHeight - 88, behavior: "smooth" })}
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </motion.div>
        </div>
      </section>
      {/* Le reste du contenu de la page pourra être ajouté ici */}
    </main>
  );
}
