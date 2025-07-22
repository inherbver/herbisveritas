# Documentation Colissimo - Intégration Point de Retrait

Cette documentation décrit l'implémentation complète de l'intégration Colissimo pour la sélection de points de retrait dans l'application.

## Vue d'ensemble

L'intégration Colissimo permet aux clients de sélectionner un point de retrait pour leurs commandes via le Widget Point Retrait V2 de Colissimo. L'implémentation comprend :

- Widget de sélection de points de retrait (réel et simulé)
- Authentification sécurisée avec l'API Colissimo via Edge Functions
- Base de données étendue pour stocker les points de retrait sélectionnés
- Suite de tests complète

## Architecture

### Composants principaux

```
src/components/domain/colissimo/
├── ColissimoWidget.tsx          # Widget réel Colissimo
├── ColissimoWidgetMock.tsx      # Widget de simulation pour développement
└── __tests__/                   # Suite de tests complète (68 tests)
```

### Backend et API

```
supabase/functions/colissimo-token/
└── index.ts                     # Edge Function pour l'authentification JWT

supabase/migrations/
├── pickup_points.sql            # Table des points de retrait
└── orders_pickup_point.sql     # Extension table orders
```

### Page de test

```
src/app/[locale]/test-colissimo/
└── page.tsx                     # Interface de test complète
```

## Configuration

### Variables d'environnement

```bash
# API Colissimo
COLISSIMO_API_SECRET=your_colissimo_api_secret
COLISSIMO_SANDBOX_MODE=true

# URLs (automatiquement configurées selon l'environnement)
COLISSIMO_API_BASE_URL=https://ws.colissimo.fr  # Production
COLISSIMO_API_BASE_URL=https://ws-sandbox.colissimo.fr  # Sandbox
```

### Dépendances

```json
{
  "dependencies": {
    "jquery": "^3.7.1",
    "mapbox-gl": "^2.15.0"
  },
  "devDependencies": {
    "@types/jquery": "^3.5.32"
  }
}
```

## Base de données

### Table `pickup_points`

Stocke les informations des points de retrait sélectionnés.

```sql
CREATE TABLE pickup_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colissimo_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    city TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance INTEGER, -- en mètres
    type_de_point TEXT,
    horaires_ouverture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Extension table `orders`

```sql
ALTER TABLE orders
ADD COLUMN pickup_point_id UUID REFERENCES pickup_points(id);
```

### Politiques RLS

```sql
-- Les utilisateurs peuvent voir leurs propres points de retrait
CREATE POLICY "Users can view own pickup points" ON pickup_points
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.pickup_point_id = pickup_points.id
        AND orders.user_id = auth.uid()
    )
);
```

## Utilisation des composants

### ColissimoWidget (Production)

```tsx
import ColissimoWidget from "@/components/domain/colissimo/ColissimoWidget";

function CheckoutPage() {
  const handlePointSelection = (point: PointRetrait) => {
    console.log("Point sélectionné:", point);
    // Traiter la sélection du point
  };

  const handleError = (error: string) => {
    console.error("Erreur widget Colissimo:", error);
  };

  return (
    <ColissimoWidget
      token="jwt_token_from_edge_function"
      onSelect={handlePointSelection}
      onError={handleError}
      defaultAddress={{
        address: "123 Rue Example",
        zipCode: "75001",
        city: "Paris",
      }}
      className="my-custom-class"
    />
  );
}
```

### ColissimoWidgetMock (Développement)

```tsx
import ColissimoWidgetMock from "@/components/domain/colissimo/ColissimoWidgetMock";

function TestPage() {
  return (
    <ColissimoWidgetMock
      token="test_token"
      onSelect={handlePointSelection}
      onError={handleError}
      className="rounded-lg border"
    />
  );
}
```

### Types TypeScript

```typescript
interface PointRetrait {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  latitude: number;
  longitude: number;
  distance: number; // en mètres
  typeDePoint?: string; // 'POST' | 'PICKUP' | 'LOCKER' | 'RELAY'
  horairesOuverture?: string;
}

interface ColissimoWidgetProps {
  token: string;
  onSelect: (point: PointRetrait) => void;
  onError?: (error: string) => void;
  defaultAddress?: {
    address?: string;
    zipCode?: string;
    city?: string;
  };
  className?: string;
}
```

## Edge Function - Génération de token

### Endpoint

```
GET/POST /functions/v1/colissimo-token
```

### Utilisation

```typescript
async function getColissimoToken(): Promise<string> {
  const response = await fetch("/api/supabase/functions/colissimo-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });

  const { token } = await response.json();
  return token;
}
```

### Implémentation Edge Function

```typescript
// supabase/functions/colissimo-token/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  const apiSecret = Deno.env.get("COLISSIMO_API_SECRET");
  const sandboxMode = Deno.env.get("COLISSIMO_SANDBOX_MODE") === "true";

  // Génération du JWT avec expiration 30 minutes
  const payload = {
    iss: "your-app",
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
    sandbox: sandboxMode,
  };

  const token = await createJWT(payload, apiSecret);

  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

## Tests

### Structure des tests

```
src/components/domain/colissimo/__tests__/
├── ColissimoWidget.test.tsx        # Tests du widget réel (15 tests)
├── ColissimoWidgetMock.test.tsx    # Tests du widget simulé (15 tests)
├── types.test.ts                   # Tests des interfaces TypeScript (18 tests)
└── utils.test.ts                   # Tests des utilitaires métier (20 tests)
```

### Exécution des tests

```bash
# Tous les tests Colissimo
npm test -- --testPathPattern=colissimo

# Tests spécifiques
npm test -- --testPathPattern=ColissimoWidget.test.tsx
npm test -- --testPathPattern=ColissimoWidgetMock.test.tsx
npm test -- --testPathPattern=types.test.ts
npm test -- --testPathPattern=utils.test.ts
```

### Couverture de tests

- **68 tests au total** couvrant :
  - Rendu des composants et états de chargement
  - Interactions utilisateur (clic, clavier)
  - Accessibilité (ARIA, HTML sémantique)
  - Validation des types TypeScript
  - Logique métier (calculs de distance, filtrage)
  - Gestion d'erreurs et cas limites

## Page de test

Accessible à `/test-colissimo`, la page de test permet de :

- Tester la génération de tokens JWT
- Comparer le widget réel vs simulé
- Vérifier les callbacks de sélection
- Tester avec différentes adresses par défaut
- Déboguer les erreurs d'intégration

### Utilisation

1. Naviguer vers `/test-colissimo`
2. Cliquer sur "Générer Token"
3. Tester la sélection de points avec les deux widgets
4. Observer les logs dans la console

## Intégration dans le processus de commande

### 1. Génération du token

```typescript
// Dans votre page de checkout
const [colissimoToken, setColissimoToken] = useState<string>("");

useEffect(() => {
  async function initColissimo() {
    try {
      const token = await getColissimoToken();
      setColissimoToken(token);
    } catch (error) {
      console.error("Erreur génération token Colissimo:", error);
    }
  }

  initColissimo();
}, []);
```

### 2. Intégration widget

```tsx
{
  colissimoToken && (
    <ColissimoWidget
      token={colissimoToken}
      onSelect={async (point) => {
        // Sauvegarder le point sélectionné
        await savePickupPoint(point);
        setSelectedPickupPoint(point);
      }}
      onError={(error) => {
        showError(`Erreur Colissimo: ${error}`);
      }}
      defaultAddress={userAddress}
    />
  );
}
```

### 3. Sauvegarde en base

```typescript
async function savePickupPoint(point: PointRetrait) {
  const { data, error } = await supabase
    .from("pickup_points")
    .upsert({
      colissimo_id: point.id,
      name: point.name,
      address: point.address,
      zip_code: point.zipCode,
      city: point.city,
      latitude: point.latitude,
      longitude: point.longitude,
      distance: point.distance,
      type_de_point: point.typeDePoint,
      horaires_ouverture: point.horairesOuverture,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 4. Association à la commande

```typescript
async function createOrder(orderData: any, pickupPointId: string) {
  const { data, error } = await supabase.from("orders").insert({
    ...orderData,
    pickup_point_id: pickupPointId,
    delivery_method: "pickup",
  });

  if (error) throw error;
  return data;
}
```

## Dépannage

### Problèmes fréquents

#### 1. Erreur 401 "Non-AutorisÉ"

```bash
# Vérifier les variables d'environnement
echo $COLISSIMO_API_SECRET
echo $COLISSIMO_SANDBOX_MODE

# Régénérer le token
curl -X POST https://your-app.supabase.co/functions/v1/colissimo-token
```

#### 2. Widget ne se charge pas

```javascript
// Vérifier que jQuery est disponible globalement
console.log(window.$); // Doit afficher la fonction jQuery
console.log(typeof $.fn.frameColissimoOpen); // Doit être 'function'
```

#### 3. Erreurs de script loading

```javascript
// Observer les erreurs réseau dans DevTools
// Vérifier la CSP (Content Security Policy)
// S'assurer que les domaines Colissimo sont autorisés
```

### Logs utiles

```javascript
// Activer les logs de débogage
localStorage.setItem("colissimo_debug", "true");

// Observer les événements
window.addEventListener("colissimo:pointSelected", (event) => {
  console.log("Point sélectionné:", event.detail);
});
```

## Environnements

### Développement

- Utilise `ColissimoWidgetMock` pour éviter les appels API
- Variables d'environnement en mode sandbox
- Tests automatisés complets

### Staging/Production

- Utilise `ColissimoWidget` avec vraies API
- Variables d'environnement production
- Monitoring des erreurs d'intégration

## Sécurité

### Bonnes pratiques

1. **Tokens JWT** : Expiration courte (30 min)
2. **Variables d'environnement** : Secrets stockés côté serveur uniquement
3. **RLS Policies** : Accès restreint aux données utilisateur
4. **HTTPS** : Toutes les communications chiffrées
5. **Validation** : Validation côté client ET serveur

### Audit de sécurité

```bash
# Vérifier les secrets exposés
grep -r "COLISSIMO_API" --exclude-dir=node_modules .

# Tester les politiques RLS
npm run test -- --testPathPattern=rls
```

## Performance

### Optimisations

1. **Lazy loading** : Widget chargé uniquement si nécessaire
2. **Cache tokens** : Réutilisation des tokens valides
3. **Mémoire** : Nettoyage des callbacks globaux
4. **Bundle size** : jQuery et Mapbox chargés à la demande

### Monitoring

```javascript
// Mesurer les performances de chargement
performance.mark("colissimo-start");
// ... chargement widget ...
performance.mark("colissimo-end");
performance.measure("colissimo-load", "colissimo-start", "colissimo-end");
```

## Roadmap

### Sprint 2 (à venir)

- Intégration dans le processus de commande réel
- Gestion des erreurs utilisateur améliorée
- Sauvegarde automatique des points favoris

### Sprint 3 (planifié)

- Suivi des colis (tracking)
- Gestion des documents de transport
- API avancées Colissimo (retours, modifications)

## Support

### Ressources

- [Documentation officielle Colissimo](https://www.colissimo.entreprise.laposte.fr/fr/system/files/imagecache/large/guide_utilisation_widget_point_retrait_v2.pdf)
- [Guide technique interne](./doc/GUIDE_COLLISSIMO.md)
- Tests de régression : `npm test -- --testPathPattern=colissimo`

### Contacts

- Équipe développement : Pour questions techniques
- La Poste Colissimo : Support API officiel
- Documentation mise à jour : [Date de dernière modification]
