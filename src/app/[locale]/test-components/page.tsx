"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod"; // Import resolver
import { useForm } from "react-hook-form"; // Import useForm
import { z } from "zod"; // Import zod

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner"; // Importer toast depuis la bibliothèque sonner
import { Separator } from "@/components/ui/separator";
import { Terminal } from "lucide-react"; // For Alert example

// Nouveaux imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Définir un schéma simple pour le formulaire d'exemple
const formSchema = z.object({
  username: z.string().min(2, {
    message: "Le nom d'utilisateur doit contenir au moins 2 caractères.",
  }),
});

export default function TestComponentsPage() {
  // Initialiser le formulaire
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  // Fonction de soumission (exemple simple)
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    toast("Formulaire soumis!", {
      description: `Nom d'utilisateur: ${values.username}`,
    });
  }

  const handleToast = () => {
    toast("Événement déclenché!", {
      description: "Ceci est une notification toast.",
      action: {
        label: "Annuler",
        onClick: () => {},
      },
    });
  };

  return (
    <div className="container mx-auto space-y-8 p-8">
      <h1 className="mb-6 font-serif text-2xl font-bold">Page de Test des Composants</h1>

      {/* Section Boutons */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Boutons (Button)</h2>
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
        <h2 className="mb-4 font-serif text-xl font-semibold">Cartes (Card)</h2>
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
        <h2 className="mb-4 font-serif text-xl font-semibold">
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
        <h2 className="mb-4 font-serif text-xl font-semibold">Test des Tokens Directs</h2>
        <div className="flex flex-wrap gap-4">
          <div className="rounded-md bg-primary p-4 text-primary-foreground">Primaire</div>
          <div className="rounded-lg bg-secondary p-4 text-secondary-foreground">
            Secondaire (lg)
          </div>
          <div className="rounded-xl bg-accent p-4 text-accent-foreground">Accent (xl)</div>
          <div className="rounded-sm bg-destructive p-4 text-primary-foreground">
            Destructif (sm)
          </div>
          <div className="rounded-md border border-border bg-muted p-4 text-muted-foreground">
            Muted + Bordure
          </div>
          <div className="rounded-md border bg-card p-4 text-card-foreground shadow-md">
            Carte + Ombre md
          </div>
          <div className="rounded-md border bg-popover p-4 text-popover-foreground shadow-lg">
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

      <Separator />

      {/* Section Select */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Menu Déroulant (Select)</h2>
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Thème" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Clair</SelectItem>
            <SelectItem value="dark">Sombre</SelectItem>
            <SelectItem value="system">Système</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {/* Section Textarea */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Zone de Texte (Textarea)</h2>
        <div className="grid w-full gap-1.5">
          <Label htmlFor="message">Votre message</Label>
          <Textarea placeholder="Écrivez votre message ici." id="message" />
        </div>
      </section>

      {/* Section Checkbox & Switch */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">
          Cases à Cocher (Checkbox) & Interrupteurs (Switch)
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accepter les termes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Mode Avion</Label>
          </div>
        </div>
      </section>

      {/* Section Dropdown Menu */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Menu Contextuel (Dropdown Menu)</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Ouvrir Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Facturation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Déconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Section Table */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Tableau (Table)</h2>
        <Table>
          <TableCaption>Liste des factures récentes.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Facture</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Méthode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>Payée</TableCell>
              <TableCell>Carte de crédit</TableCell>
              <TableCell className="text-right">€250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV002</TableCell>
              <TableCell>En attente</TableCell>
              <TableCell>Virement</TableCell>
              <TableCell className="text-right">€150.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      {/* Section Avatar */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Avatar</h2>
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </section>

      {/* Section Badge */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Badges</h2>
        <div className="flex gap-2">
          <Badge>Défaut</Badge>
          <Badge variant="secondary">Secondaire</Badge>
          <Badge variant="destructive">Destructif</Badge>
          <Badge variant="outline">Contour</Badge>
        </div>
      </section>

      {/* Section Alert */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Alertes (Alert)</h2>
        <div className="space-y-4">
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>Ceci est une alerte informative.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" /> {/* Utiliser une icone appropriée si disponible */}
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>Ceci est une alerte d&apos;erreur.</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Section Dialog */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Boîte de Dialogue (Dialog)</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Ouvrir Dialogue</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Êtes-vous s&apos;ûr?</DialogTitle>
              <DialogDescription>Cette action ne peut pas être annulée.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Fermer
                </Button>
              </DialogClose>
              <Button type="button">Confirmer</Button> {/* Ajouter une action si nécessaire */}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Section Tooltip */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Infobulle (Tooltip)</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Survolez-moi</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ceci est une infobulle !</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </section>

      {/* Section Sonner (Toast) */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Notifications (Sonner/Toast)</h2>
        <Button onClick={handleToast}>Afficher Toast</Button>
        {/* <Toaster />  Toaster moved to layout.tsx */}
      </section>

      {/* Separator Example */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Séparateur (Separator)</h2>
        <div>
          <p>Contenu au-dessus</p>
          <Separator className="my-4" />
          <p>Contenu en-dessous</p>
        </div>
      </section>

      {/* Nouvelles sections pour Tabs, Accordion, Form */}

      {/* Section Tabs */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Onglets (Tabs)</h2>
        <Tabs defaultValue="compte" className="w-[400px]">
          <TabsList>
            <TabsTrigger value="compte">Compte</TabsTrigger>
            <TabsTrigger value="motdepasse">Mot de passe</TabsTrigger>
            <TabsTrigger value="autre">Autre</TabsTrigger>
          </TabsList>
          <TabsContent value="compte">Contenu de l&apos;onglet Compte.</TabsContent>
          <TabsContent value="motdepasse">Contenu de l&apos;onglet Mot de passe.</TabsContent>
          <TabsContent value="autre">Contenu d&apos;un autre onglet.</TabsContent>
        </Tabs>
      </section>

      {/* Section Accordion */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Accordéon (Accordion)</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Est-ce accessible?</AccordionTrigger>
            <AccordionContent>Oui. Adhère aux normes WAI-ARIA.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Est-ce stylisé?</AccordionTrigger>
            <AccordionContent>
              Oui. Livré avec des styles par défaut qui peuvent être étendus.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Est-ce animé?</AccordionTrigger>
            <AccordionContent>
              Oui. C&apos;est animé par défaut, mais vous pouvez le désactiver.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Section Form */}
      <section>
        <h2 className="mb-4 font-serif text-xl font-semibold">Formulaire (Form)</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d&apos;utilisateur</FormLabel>
                  <FormControl>
                    <Input placeholder="Votre pseudo" {...field} />
                  </FormControl>
                  <FormDescription>C&apos;est votre nom d&apos;affichage public.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Soumettre</Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
