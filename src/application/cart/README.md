# Cart Application Layer (CQRS)

Cette couche implémente le pattern CQRS (Command Query Responsibility Segregation) pour le système de panier.

## Structure

```
cart/
├── commands/           # Write operations
│   ├── add-item/
│   ├── remove-item/
│   ├── update-quantity/
│   └── clear-cart/
├── queries/           # Read operations
│   ├── get-cart/
│   ├── get-summary/
│   └── get-history/
├── events/           # Domain events
├── mappers/          # DTO ↔ Domain mappings
└── ports/            # Interfaces (DIP)
```

## Usage

### Commands (Write)
```typescript
// Dans un composant React
const executeCommand = useCommand();

const handleAddToCart = async (productId: string) => {
  const result = await executeCommand(
    new AddItemCommand({
      userId: currentUser.id,
      productId,
      quantity: 1
    })
  );
  
  if (result.isSuccess()) {
    toast.success('Produit ajouté au panier');
  }
};
```

### Queries (Read)
```typescript
// Dans un hook React
const { data: cart, isLoading } = useQuery({
  queryKey: ['cart', userId],
  queryFn: () => queryBus.execute(new GetCartQuery(userId))
});
```

## Principes

1. **Séparation Read/Write** : Les commandes modifient l'état, les queries le lisent
2. **Immutabilité** : Toutes les opérations retournent un nouvel état
3. **Event Sourcing Ready** : Chaque commande génère des événements
4. **Testabilité** : Handlers isolés et facilement mockables