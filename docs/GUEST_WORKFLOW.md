# Workflow Utilisateur Guest

## Vue d'ensemble

Ce document décrit en détail le parcours complet d'un utilisateur guest (non authentifié) sur la plateforme In Herbis Veritas.

## Étapes du Parcours Guest

### 1. Navigation et Découverte

- **Accès libre** : Consultation boutique, produits, contenu
- **Aucune restriction** : Navigation complète sans authentification
- **Génération automatique** : `guest_id` unique créé silencieusement

### 2. Gestion du Panier

#### Ajout d'Articles

```typescript
// Flux technique
1. Génération guest_id (UUID v4)
2. Création cart avec guest_id, user_id = NULL
3. Ajout cart_items liés au cart
4. Synchronisation localStorage ↔ serveur
```

#### Persistance

- **Base de données** : Stockage permanent avec `guest_id`
- **LocalStorage** : Cache local pour UX fluide
- **Synchronisation** : Bidirectionnelle automatique

### 3. Processus de Checkout

#### Phase 1 : Validation Panier

```typescript
// ProductValidationService
- Vérification stock et disponibilité
- Calcul prix total
- Validation quantités
```

#### Phase 2 : Informations Livraison

```typescript
// Guest doit fournir :
interface GuestShippingInfo {
  // Adresse de livraison
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    postalCode: string;
    city: string;
    countryCode: string;
  };

  // Adresse de facturation (peut être identique)
  billingAddress: Address;

  // Contact
  email: string;
  phone: string;
}
```

#### Phase 3 : Paiement Stripe

```typescript
// CreateStripeCheckoutSession
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer_email: guestEmail, // Email guest pré-rempli
  line_items: cartItems,
  shipping_address_collection: {
    allowed_countries: ["FR", "BE", "DE", "ES"],
  },
  metadata: {
    isGuestCheckout: "true",
    guestId: guestId,
    cartId: cartId,
  },
});
```

#### Phase 4 : Finalisation Commande

```typescript
// Webhook Stripe → Order Creation
const order = await createOrder({
  user_id: null, // Guest = null
  guest_email: customerEmail,
  guest_phone: shippingPhone,
  stripe_checkout_id: sessionId,
  total_amount: amountTotal,
  status: "confirmed",
});
```

### 4. Conversion en Utilisateur Authentifié

#### Inscription Pendant/Après Checkout

```typescript
// Option 1: Inscription avec email checkout
const signupData = {
  email: guestEmail, // Pré-rempli depuis checkout
  password: userPassword,
};

// Option 2: Lien de création compte dans email confirmation
```

#### Migration Automatique du Panier

```typescript
// Dans loginAction / signupAction
if (detectedGuestId) {
  const migrationResult = await migrateAndGetCart({
    guestUserId: detectedGuestId,
  });

  // Migration inclut :
  // - Transfert cart_items guest → user
  // - Suppression cart guest
  // - Suppression user anonyme
  // - Logging audit trail
}
```

## Scénarios d'Usage

### Scénario A : Guest One-Shot

```
Navigation → Ajout panier → Checkout complet → Email confirmation → Fin
- Aucun compte créé
- Commande liée à email guest
- Panier purgé après 14 jours
```

### Scénario B : Guest → Inscription Post-Checkout

```
Navigation → Checkout guest → Email confirmation → Clic "Créer compte" → Inscription → Migration automatique
- Compte créé avec email checkout
- Historique commande transféré
- Panier actuel conservé
```

### Scénario C : Guest → Connexion Existant

```
Navigation → Ajout panier → Login compte existant → Migration automatique → Checkout user
- Panier guest fusionné avec panier user
- Checkout sous identité authentifiée
- Suppression données guest
```

## Architecture Technique

### Tables Impliquées

```sql
-- Panier guest
carts: guest_id (UUID), user_id (NULL)
cart_items: cart_id (référence)

-- Commande guest
orders: user_id (NULL), guest_email, guest_phone
order_items: order_id (référence)

-- Migration
audit_logs: action='cart_migration', metadata
```

### Services Clés

#### AddressValidationService

```typescript
interface AddressValidationResult {
  isGuestCheckout: boolean; // true pour guest
  shippingAddress: ProcessedAddress;
  billingAddress: ProcessedAddress;
  requiresAccountCreation: boolean; // false pour guest
}
```

#### CheckoutOrchestratorService

```typescript
async processCheckout(params: CheckoutParams) {
  // 1. Validation panier (guest ou user)
  // 2. Processing addresses (avec flag guest)
  // 3. Stripe session (customer_email pour guest)
  // 4. Order creation (user_id nullable)
}
```

## Monitoring et Maintenance

### Métriques Guest

- **Taux de conversion** : Guest checkout / Guest avec panier
- **Taux de migration** : Inscription post-checkout / Total guest
- **Panier moyen** : Valeur panier guest vs user authentifié

### Maintenance Automatique

#### Purge des Paniers (14 jours)

```typescript
// Edge Function : cleanup-guest-carts
Schedule: Quotidien 02:00 UTC
Config: {
  maxAgeHours: 24 * 14,  // 14 jours
  batchSize: 100,        // Par lot
  dryRun: false         // Mode production
}
```

#### Alertes

- **Échec migration** : Panier guest non transféré
- **Checkout incomplet** : Session Stripe expirée sans commande
- **Purge excessive** : Plus de X% paniers supprimés

## Sécurité

### Protection Guest

- **Rate limiting** : Limitation ajout panier par IP
- **Validation stricte** : Tous inputs guest validés
- **RLS policies** : Accès panier limité par guest_id
- **Audit trail** : Logging toutes opérations guest

### Privacy

- **RGPD compliant** : Purge automatique données guest
- **Consentement** : Checkbox acceptation conditions
- **Anonymisation** : Aucune donnée personnelle en local

## Tests

### Tests E2E

```typescript
test("guest-complete-purchase", async ({ page }) => {
  await page.goto("/boutique");
  await addProductToCart();
  await fillGuestCheckout();
  await completeStripePayment();
  await verifyOrderConfirmation();
});

test("guest-to-user-migration", async ({ page }) => {
  await createGuestCart();
  await signupWithSameEmail();
  await verifyCartMigration();
});
```

### Tests Unitaires

- **Migration panier** : Tous cas edge (panier vide, doublons, etc.)
- **Validation addresses** : Format guest vs user
- **Purge automatique** : Vérification seuils et batch
