"use client";

import * as React from "react";
import { Home, Settings, Search } from "lucide-react"; // Import specific icons

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Import toast from sonner library
import { Text } from "@/components/primitives/text"; // Import Text primitive
import { Breadcrumb } from "@/components/shared/breadcrumb"; // Import Breadcrumb
import { SearchBar } from "@/components/shared/search-bar"; // Import SearchBar
import { Container } from "@/components/layout/container"; // Import Container

export default function TestComponentsPage2() {
  return (
    <Container>
      <div className="mx-auto space-y-12 p-8">
        <h1 className="mb-10 text-3xl font-bold">Page de Test Composants #2</h1>

        {/* --- Popover --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Popover</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Ouvrir Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Dimensions</h4>
                  <p className="text-sm text-muted-foreground">
                    Définissez les dimensions pour le calque.
                  </p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="width">Largeur</Label>
                    <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="maxWidth">Largeur Max</Label>
                    <Input id="maxWidth" defaultValue="300px" className="col-span-2 h-8" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="height">Hauteur</Label>
                    <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label htmlFor="maxHeight">Hauteur Max</Label>
                    <Input id="maxHeight" defaultValue="none" className="col-span-2 h-8" />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </section>

        {/* --- Hover Card --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Hover Card</h2>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">@nextjs</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="flex justify-between space-x-4">
                {/* Placeholder for Avatar if needed */}
                <div className="h-10 w-10 rounded-full bg-muted"></div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">@nextjs</h4>
                  <p className="text-sm">Le framework React pour le Web.</p>
                  <div className="flex items-center pt-2">
                    <span className="text-xs text-muted-foreground">Rejoint en Décembre 2021</span>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </section>

        {/* --- Radio Group --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Radio Group</h2>
          <RadioGroup defaultValue="comfortable">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="default" id="r1" />
              <Label htmlFor="r1">Défaut</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="comfortable" id="r2" />
              <Label htmlFor="r2">Confortable</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="compact" id="r3" />
              <Label htmlFor="r3">Compact</Label>
            </div>
          </RadioGroup>
        </section>

        {/* --- Skeleton --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Skeleton</h2>
          <div className="flex items-center space-x-4">
            {/* Placeholder for Avatar Skeleton */}
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <Skeleton className="mt-4 h-[125px] w-[250px] rounded-xl" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </section>

        {/* --- Toast (Sonner) --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Toast (Sonner)</h2>
          <Button
            onClick={() => {
              toast("Événement Sonner", {
                description: "Ceci est une notification via Sonner.",
                action: {
                  label: "Annuler",
                  onClick: () => console.log("Action Annuler cliquée"),
                },
              });
            }}
          >
            Afficher le Toast Sonner
          </Button>
        </section>

        {/* --- Text Primitive --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Text Primitive</h2>
          <Text className="text-xs">Texte extra petit (xs)</Text>
          <Text className="text-sm">Texte petit (sm)</Text>
          <Text>Texte moyen (md - défaut implicite)</Text>{" "}
          {/* Default likely text-base from globals */}
          <Text className="text-lg font-medium">Texte large (lg), poids medium</Text>
          <Text className="text-xl font-semibold">Texte extra large (xl), poids semibold</Text>
          <Text className="text-2xl font-bold">Texte 2xl, poids bold</Text>
          <Text as="p" className="text-sm text-muted-foreground">
            Texte petit (sm) comme paragraphe avec couleur 'muted'
          </Text>
        </section>

        {/* --- Icon Primitive (lucide-react) --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Icon Primitive (lucide-react)</h2>
          <div className="flex items-center space-x-4">
            <Home aria-label="Accueil" /> {/* Use lucide icon directly */}
            <Settings aria-label="Paramètres" size={24} className="text-blue-500" />{" "}
            {/* Use lucide icon directly with props */}
            <Search aria-label="Recherche" size={16} /> {/* Use lucide icon directly with props */}
            <Text>Icônes avec tailles et couleurs différentes.</Text>
          </div>
        </section>

        {/* --- Breadcrumb --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Breadcrumb</h2>
          <Breadcrumb
            items={[
              { label: "Accueil", href: "/" },
              { label: "Composants", href: "/test-components" },
              { label: "Page Actuelle", href: "/test-components-2" },
            ]}
          />
        </section>

        {/* --- Search Bar --- */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Search Bar</h2>
          <SearchBar placeholder="Rechercher des produits..." />
        </section>

        {/* --- Container Example --- */}
        <section className="space-y-4 rounded bg-muted p-4">
          <h2 className="text-xl font-semibold">Exemple de Container</h2>
          <Text className="text-sm">
            Le contenu de cette page est déjà dans un Container (regardez le code de la page). Cette
            section montre juste un fond pour visualiser la zone délimitée si le Container n'était
            pas pleine largeur.
          </Text>
        </section>
      </div>
    </Container>
  );
}
