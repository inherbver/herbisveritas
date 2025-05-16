# Guide de l'API

## Authentification

### Authentification par JWT

Toutes les requêtes nécessitent un jeton JWT valide dans l'en-tête d'autorisation :

```http
Authorization: Bearer VOTRE_JETON_ICI
```

### Rôles et Permissions

- `anon` : Accès public (lecture seule)
- `authenticated` : Utilisateur connecté
- `service_role` : Accès administrateur complet (à utiliser uniquement côté serveur)

## Points d'Accès

### Produits

#### 1. Lister les produits

```http
GET /api/v1/products
```

**Paramètres de requête :**

- `category` : Filtrer par catégorie
- `search` : Recherche textuelle
- `min_price`, `max_price` : Filtre par prix
- `in_stock` : Booléen, produits en stock uniquement
- `sort` : Champ de tri (ex: `price_asc`, `price_desc`, `newest`)
- `limit` : Nombre de résultats par page (défaut: 20)
- `offset` : Décalage pour la pagination

**Exemple de réponse :**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Produit exemple",
      "description": "Description du produit",
      "price": 29.99,
      "image_url": "https://example.com/image.jpg",
      "in_stock": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 20,
    "offset": 0
  }
}
```

#### 2. Obtenir un produit spécifique

```http
GET /api/v1/products/{id}
```

#### 3. Créer un produit (admin)

```http
POST /api/v1/products
Content-Type: application/json

{
  "name": "Nouveau produit",
  "description": "Description",
  "price": 19.99,
  "inventory_quantity": 100,
  "is_active": true
}
```

### Panier

#### 1. Obtenir le panier actuel

```http
GET /api/v1/cart
```

#### 2. Ajouter un article au panier

```http
POST /api/v1/cart/items
Content-Type: application/json

{
  "product_id": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 1
}
```

#### 3. Mettre à jour la quantité d'un article

```http
PATCH /api/v1/cart/items/{item_id}
Content-Type: application/json

{
  "quantity": 2
}
```

#### 4. Supprimer un article du panier

```http
DELETE /api/v1/cart/items/{item_id}
```

### Commandes

#### 1. Passer une commande

```http
POST /api/v1/orders
Content-Type: application/json

{
  "shipping_address_id": "660e8400-e29b-41d4-a716-446655440000",
  "billing_address_id": "660e8400-e29b-41d4-a716-446655440000",
  "payment_method": "card",
  "notes": "Livraison avant 18h si possible"
}
```

#### 2. Lister les commandes de l'utilisateur

```http
GET /api/v1/orders
```

#### 3. Obtenir les détails d'une commande

```http
GET /api/v1/orders/{id}
```

### Utilisateurs

#### 1. Inscription

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "utilisateur@exemple.com",
  "password": "motdepasse123",
  "first_name": "Prénom",
  "last_name": "Nom"
}
```

#### 2. Connexion

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "utilisateur@exemple.com",
  "password": "motdepasse123"
}
```

#### 3. Récupérer le profil utilisateur

```http
GET /api/v1/users/me
```

## Gestion des Erreurs

Les réponses d'erreur suivent le format suivant :

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Message d'erreur lisible par l'utilisateur",
    "details": {
      "field_name": "Détails supplémentaires sur l'erreur"
    }
  }
}
```

### Codes d'erreur courants

- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Accès refusé
- `404` : Ressource non trouvée
- `422` : Erreur de validation
- `500` : Erreur serveur

## Pagination

Les réponses de liste utilisent une pagination basée sur le décalage. Les paramètres sont :

- `limit` : Nombre d'éléments par page (max 100)
- `offset` : Position de départ (0-indexé)

Exemple de réponse paginée :

```json
{
  "data": [],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  },
  "links": {
    "first": "/api/v1/resource?limit=20&offset=0",
    "prev": null,
    "next": "/api/v1/resource?limit=20&offset=20",
    "last": "/api/v1/resource?limit=20&offset=80"
  }
}
```

## Taux de Limite

- 100 requêtes par minute par adresse IP pour les points d'accès publics
- 1000 requêtes par minute par utilisateur authentifié
- 5000 requêtes par minute pour les clés d'API privilégiées

## Exemple d'Utilisation avec fetch

```javascript
// Obtenir la liste des produits
async function getProducts() {
  const response = await fetch("/api/v1/products", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erreur lors de la récupération des produits");
  }

  return response.json();
}

// Ajouter un article au panier
async function addToCart(productId, quantity = 1) {
  const response = await fetch("/api/v1/cart/items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: productId,
      quantity: quantity,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erreur lors de l'ajout au panier");
  }

  return response.json();
}
```

## Webhooks

### Événements disponibles

- `order.created` : Nouvelle commande créée
- `order.updated` : Commande mise à jour
- `payment.succeeded` : Paiement réussi
- `payment.failed` : Échec du paiement

### Configuration du webhook

1. Configurez votre endpoint webhook dans le tableau de bord d'administration
2. Les requêtes incluront un en-tête `X-Webhook-Signature` pour la vérification
3. Votre endpoint doit répondre avec un code 2xx dans un délai de 10 secondes

### Exemple de payload de webhook

```json
{
  "event": "order.created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "order_number": "ORDER-12345",
    "status": "pending",
    "total_price": 59.98,
    "customer_email": "client@exemple.com"
  },
  "created_at": "2025-01-01T12:00:00.000Z"
}
```

## Dépréciation et Versionnage

Les modifications incompatibles avec les versions antérieures seront annoncées avec un préavis de 6 mois. Les nouvelles versions de l'API seront disponibles sous `/api/v2/`, `/api/v3/`, etc.
