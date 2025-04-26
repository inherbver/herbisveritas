import React from "react";

// Importez ici les composants que vous souhaitez tester
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TestComponentsPage() {
  return (
    <div className="container mx-auto space-y-8 p-8">
      <h1 className="mb-6 text-2xl font-bold">Page de Test des Composants</h1>

      {/* Section Boutons */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Boutons (Button)</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button>Défaut</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="destructive">Destructif</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="ghost">Fantôme</Button>
          <Button variant="link">Lien</Button>
          <Button disabled>Désactivé</Button>
        </div>
      </section>

      {/* Section Cartes */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Cartes (Card)</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Titre Simple</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Contenu de la carte simple.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Titre Complet</CardTitle>
              <CardDescription>Description de la carte.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Contenu de la carte avec plus de détails et un pied de page.</p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Annuler</Button>
              <Button>Confirmer</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Section Champs de Saisie et Labels */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Champs de Saisie (Input) & Étiquettes (Label)
        </h2>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input type="email" id="email" placeholder="Email" />
        </div>
        <div className="mt-4 grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input type="password" id="password" placeholder="Mot de passe" />
        </div>
        <div className="mt-4 grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="disabled-input">Champ désactivé</Label>
          <Input type="text" id="disabled-input" placeholder="Désactivé" disabled />
        </div>
      </section>

      {/* Section Test des Tokens Directs */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Test des Tokens Directs</h2>
        <div className="flex flex-wrap gap-4">
          <div className="bg-primary text-primary-foreground rounded-md p-4">Primaire</div>
          <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
            Secondaire (lg)
          </div>
          <div className="bg-accent text-accent-foreground rounded-xl p-4">Accent (xl)</div>
          <div className="bg-destructive text-primary-foreground rounded-sm p-4">
            Destructif (sm)
          </div>
          <div className="bg-muted text-muted-foreground border-border rounded-md border p-4">
            Muted + Bordure
          </div>
          <div className="bg-card text-card-foreground rounded-md border p-4 shadow-md">
            Carte + Ombre md
          </div>
          <div className="bg-popover text-popover-foreground rounded-md border p-4 shadow-lg">
            Popover + Ombre lg
          </div>
        </div>
        <div className="mt-4 space-x-4 rounded-md border p-4">
          <span className="text-xs">Texte xs</span>
          <span className="text-sm">Texte sm</span>
          <span className="text-base">Texte base</span>
          <span className="text-lg">Texte lg</span>
          <span className="text-xl">Texte xl</span>
          <span className="text-2xl">Texte 2xl</span>
        </div>
        <div className="mt-4 rounded-md border p-4 font-mono">Texte Mono</div>
        <div className="mt-4 rounded-md border p-4 font-serif">Texte Serif</div>
      </section>
    </div>
  );
}
