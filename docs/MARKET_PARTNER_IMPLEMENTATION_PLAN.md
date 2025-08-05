# Plan d'Implémentation - Système CRUD Markets et Partners

## Vue d'ensemble

Ce document détaille le plan d'implémentation pour migrer les données hardcodées des marchés et partenaires vers la base de données Supabase, avec une interface d'administration CRUD complète.

## Objectifs

1. **Admin - Gestion des marchés** : Interface CRUD pour créer, lire, modifier et supprimer des marchés récurrents
2. **Admin - Gestion des partenaires** : Interface CRUD pour gérer les boutiques partenaires
3. **Public - Calendrier des marchés** : Affichage dynamique des marchés depuis la BDD
4. **Public - Liste des partenaires** : Affichage des partenaires depuis la BDD
5. **Architecture** : Utilisation du système d'événements et des patterns existants

## Phase 1 : Infrastructure Base de Données

### 1.1 Création des tables

#### Table `markets`
```sql
-- Migration: 20250108_create_markets_table.sql
CREATE TABLE markets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  description TEXT,
  gps_link TEXT,
  hero_image TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour optimiser les requêtes par dates
CREATE INDEX idx_markets_dates ON markets(start_date, end_date);
CREATE INDEX idx_markets_day_of_week ON markets(day_of_week);
```

#### Table `partners`
```sql
-- Migration: 20250108_create_partners_table.sql
CREATE TABLE partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  image_url TEXT NOT NULL,
  facebook_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'ordre d'affichage
CREATE INDEX idx_partners_order ON partners(display_order, created_at);
```

### 1.2 Politiques RLS

```sql
-- RLS pour markets
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "Markets are viewable by everyone" 
ON markets FOR SELECT 
USING (true);

-- Modification admin uniquement
CREATE POLICY "Only admins can insert markets" 
ON markets FOR INSERT 
WITH CHECK (check_admin_role());

CREATE POLICY "Only admins can update markets" 
ON markets FOR UPDATE 
USING (check_admin_role());

CREATE POLICY "Only admins can delete markets" 
ON markets FOR DELETE 
USING (check_admin_role());

-- RLS pour partners (même logique)
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners are viewable by everyone" 
ON partners FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage partners" 
ON partners FOR ALL 
USING (check_admin_role());
```

### 1.3 Triggers et audit

```sql
-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Phase 2 : Server Actions et Domain Layer

### 2.1 Types et schémas Zod

```typescript
// src/lib/validators/market.ts
import { z } from "zod";

export const marketSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format de date invalide"),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Format d'heure invalide"),
  city: z.string().min(1, "La ville est requise"),
  address: z.string().optional(),
  description: z.string().optional(),
  gps_link: z.string().url().optional().or(z.literal("")),
  hero_image: z.string().optional(),
  image: z.string().optional(),
});

export const partnerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().min(1, "La description est requise"),
  address: z.string().min(1, "L'adresse est requise"),
  image_url: z.string().url("URL d'image invalide"),
  facebook_url: z.string().url("URL Facebook invalide").optional().or(z.literal("")),
  display_order: z.number().optional(),
  is_active: z.boolean().optional(),
});
```

### 2.2 Server Actions

```typescript
// src/actions/marketActions.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { marketSchema } from "@/lib/validators/market";
import { ActionResult } from "@/types/action-result";
import { revalidatePath } from "next/cache";
import { checkAdminRole } from "@/lib/auth/admin-service";

export async function createMarket(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const isAdmin = await checkAdminRole();
  if (!isAdmin) {
    return { success: false, error: "Accès non autorisé" };
  }

  const validation = marketSchema.safeParse(Object.fromEntries(formData));
  if (!validation.success) {
    return { 
      success: false, 
      error: validation.error.errors[0].message 
    };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("markets")
    .insert(validation.data)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/contact");
  revalidatePath("/admin/markets");

  return { success: true, data: { id: data.id } };
}

export async function updateMarket(
  id: string,
  formData: FormData
): Promise<ActionResult<void>> {
  // Logique similaire avec .update()
}

export async function deleteMarket(id: string): Promise<ActionResult<void>> {
  // Logique similaire avec .delete()
}

export async function getMarkets(): Promise<ActionResult<Market[]>> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .order("start_date", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data };
}
```

### 2.3 Adaptation de market-utils.ts

```typescript
// src/lib/market-utils.ts
import { createServerClient } from "@/lib/supabase/server";

export async function generateMarketInstances(): Promise<MarketInfo[]> {
  const supabase = await createServerClient();
  const { data: recurringMarkets, error } = await supabase
    .from("markets")
    .select("*")
    .gte("end_date", new Date().toISOString().split("T")[0])
    .order("start_date");

  if (error || !recurringMarkets) {
    console.error("Error fetching markets:", error);
    return [];
  }

  const allInstances: MarketInfo[] = [];
  
  recurringMarkets.forEach((recurringMarket) => {
    const startDate = new Date(recurringMarket.start_date);
    const endDate = new Date(recurringMarket.end_date);
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (currentDate.getDay() === recurringMarket.day_of_week) {
        allInstances.push({
          id: `${recurringMarket.id}-${currentDate.toISOString().split("T")[0]}`,
          name: recurringMarket.name,
          date: currentDate.toISOString().split("T")[0],
          startTime: recurringMarket.start_time,
          endTime: recurringMarket.end_time,
          city: recurringMarket.city,
          address: recurringMarket.address,
          description: recurringMarket.description,
          gpsLink: recurringMarket.gps_link,
          heroImage: recurringMarket.hero_image,
          image: recurringMarket.image,
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  return allInstances.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
```

## Phase 3 : Interface Admin

### 3.1 Liste des marchés

```typescript
// src/app/[locale]/admin/markets/page.tsx
import { DashboardShell } from "@/components/admin/dashboard-shell";
import { getMarkets } from "@/actions/marketActions";
import { MarketsList } from "./markets-list";

export default async function AdminMarketsPage() {
  const result = await getMarkets();
  
  if (!result.success) {
    return <div>Erreur: {result.error}</div>;
  }

  return (
    <DashboardShell
      title="Gestion des Marchés"
      headerAction={
        <Link href="/admin/markets/new">
          <Button>Ajouter un marché</Button>
        </Link>
      }
    >
      <MarketsList markets={result.data} />
    </DashboardShell>
  );
}
```

### 3.2 Formulaire de création/édition

```typescript
// src/app/[locale]/admin/markets/[id]/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { marketSchema } from "@/lib/validators/market";
import { createMarket, updateMarket } from "@/actions/marketActions";
import { toast } from "sonner";

export default function MarketForm({ market }: { market?: Market }) {
  const form = useForm({
    resolver: zodResolver(marketSchema),
    defaultValues: market || {
      day_of_week: 0,
      start_time: "09:00",
      end_time: "13:00",
    },
  });

  async function onSubmit(data: z.infer<typeof marketSchema>) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const result = market
      ? await updateMarket(market.id, formData)
      : await createMarket(formData);

    if (result.success) {
      toast.success(market ? "Marché modifié" : "Marché créé");
      router.push("/admin/markets");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom du marché</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Autres champs: dates, heures, jour de semaine, etc. */}
        
        <Button type="submit">
          {market ? "Modifier" : "Créer"}
        </Button>
      </form>
    </Form>
  );
}
```

### 3.3 Interface partenaires

Structure similaire dans `/admin/partners` avec :
- Liste des partenaires avec drag & drop pour l'ordre
- Formulaire avec upload d'image
- Toggle actif/inactif

## Phase 4 : Intégration Event System

### 4.1 Événements

```typescript
// src/lib/events/market-events.ts
export const MarketEvents = {
  MARKET_CREATED: "market.created",
  MARKET_UPDATED: "market.updated",
  MARKET_DELETED: "market.deleted",
} as const;

// src/lib/events/handlers/market-handlers.ts
import { EventHandler } from "../types";
import { MarketEvents } from "../market-events";

export const marketCreatedHandler: EventHandler = {
  event: MarketEvents.MARKET_CREATED,
  handler: async (payload) => {
    console.log("Nouveau marché créé:", payload);
    // Notifications, analytics, etc.
  },
};
```

### 4.2 Émission d'événements

```typescript
// Dans marketActions.ts
import { eventBus } from "@/lib/events/event-bus";
import { MarketEvents } from "@/lib/events/market-events";

export async function createMarket(formData: FormData) {
  // ... logique de création ...
  
  if (data) {
    await eventBus.emit(MarketEvents.MARKET_CREATED, {
      marketId: data.id,
      name: validation.data.name,
      city: validation.data.city,
    });
  }
  
  return { success: true, data: { id: data.id } };
}
```

## Phase 5 : Migration des données

### 5.1 Script de migration

```typescript
// scripts/migrate-markets-partners.ts
import { createAdminClient } from "@/lib/supabase/admin";
import marketsData from "@/data/markets.json";
import partnersData from "@/data/partners.json";

async function migrateData() {
  const supabase = createAdminClient();
  
  // Migration des marchés
  console.log("Migration des marchés...");
  for (const market of marketsData) {
    const { error } = await supabase
      .from("markets")
      .insert({
        name: market.name,
        start_date: market.startDate,
        end_date: market.endDate,
        day_of_week: market.dayOfWeek,
        start_time: market.startTime,
        end_time: market.endTime,
        city: market.city,
        address: market.address,
        description: market.description,
        gps_link: market.gpsLink,
        hero_image: market.heroImage,
        image: market.image,
      });
    
    if (error) {
      console.error(`Erreur migration marché ${market.name}:`, error);
    } else {
      console.log(`✓ Marché ${market.name} migré`);
    }
  }
  
  // Migration des partenaires
  console.log("\nMigration des partenaires...");
  let order = 0;
  for (const partner of partnersData) {
    const { error } = await supabase
      .from("partners")
      .insert({
        name: partner.name,
        description: partner.description,
        address: partner.address,
        image_url: partner.imageUrl,
        facebook_url: partner.facebookUrl,
        display_order: order++,
        is_active: true,
      });
    
    if (error) {
      console.error(`Erreur migration partenaire ${partner.name}:`, error);
    } else {
      console.log(`✓ Partenaire ${partner.name} migré`);
    }
  }
  
  console.log("\nMigration terminée!");
}

migrateData().catch(console.error);
```

### 5.2 Commande NPM

```json
// package.json
{
  "scripts": {
    "migrate:markets-partners": "tsx scripts/migrate-markets-partners.ts"
  }
}
```

## Calendrier de mise en œuvre

### Semaine 1
- ✅ Phase 1 : Infrastructure BDD (migrations, RLS)
- ✅ Phase 2.1 : Types et schémas
- ✅ Phase 2.2 : Server Actions de base

### Semaine 2
- ✅ Phase 3 : Interface admin complète
- ✅ Phase 4 : Intégration événements
- ✅ Tests unitaires et d'intégration

### Semaine 3
- ✅ Phase 5 : Migration des données
- ✅ Tests end-to-end
- ✅ Documentation technique
- ✅ Déploiement

## Points d'attention

1. **Préservation de la logique métier** : La génération des instances de marchés doit rester identique
2. **Performance** : Indexation appropriée pour les requêtes fréquentes
3. **Rétrocompatibilité** : S'assurer que le calendrier public continue de fonctionner pendant la migration
4. **Sécurité** : RLS policies strictes, validation côté serveur
5. **UX Admin** : Interface cohérente avec les autres sections admin (products, magazine)

## Validation des Heures - Marchés Nocturnes ✅

### Problématique résolue
Le système de validation des heures pour les marchés nocturnes (ex: 18:00 → 00:00) a été corrigé.

### Solution implémentée
- **Fichier modifié** : `src/lib/validators/market.ts`
- **Logique ajoutée** : Détection automatique des marchés nocturnes
- **Algorithme** : Si `heure_fin ≤ heure_début`, ajouter 24h à l'heure de fin (jour suivant)

```typescript
// Gestion des marchés nocturnes dans updateMarketSchema
if (endMinutes <= startMinutes) {
  endMinutes += 24 * 60; // Ajouter 24 heures (jour suivant)
}
```

### Cas d'usage supportés
- ✅ Marchés classiques : 09:00 → 17:00
- ✅ Marchés nocturnes : 18:00 → 00:00 (minuit du jour suivant)
- ✅ Marchés de nuit : 22:00 → 04:00 (4h du matin)

### Impact
- **Création de marchés** : Fonctionne correctement
- **Modification de marchés** : Fonctionne correctement pour tous les champs
- **Validation** : Cohérente entre création et modification

## Tests requis

1. **Tests unitaires**
   - ✅ Server Actions (CRUD operations)
   - ✅ Génération d'instances de marchés
   - ✅ Validation des schémas (heures nocturnes incluses)

2. **Tests d'intégration**
   - ✅ Flux complet admin (création → affichage public)
   - ✅ Événements système
   - ✅ Permissions et sécurité

3. **Tests E2E**
   - ✅ Parcours admin complet
   - ✅ Affichage calendrier public
   - ✅ Migration des données existantes
   - ✅ Validation marchés nocturnes