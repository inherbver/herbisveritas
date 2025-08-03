# 🚀 FEUILLE DE ROUTE D'IMPLÉMENTATION - SYSTÈME DE PANIER

## Sprint 1: Stabilisation Immédiate (5 jours)

### Jour 1-2: Nettoyage et Unification
```bash
# Actions
1. Supprimer cartStore.ts (legacy)
2. Renommer cart-store-refactored.ts → cart.store.ts
3. Supprimer cart-actions-v2.ts et cart-actions-refactored.ts
4. Unifier tous les imports vers les nouveaux chemins

# Commandes
git checkout -b refactor/cart-unification
rm src/stores/cartStore.ts
mv src/stores/cart-store-refactored.ts src/stores/cart.store.ts
# Update imports avec votre IDE
```

### Jour 3-4: Tests Critiques
```typescript
// src/stores/__tests__/cart.store.test.ts
describe('CartStore', () => {
  beforeEach(() => {
    // Reset store
    useCartStore.setState(initialState);
  });

  describe('Optimistic Updates', () => {
    it('should rollback on server error', async () => {
      // Mock server error
      // Add item optimistically
      // Verify rollback
    });
  });

  describe('Race Conditions', () => {
    it('should handle concurrent updates', async () => {
      // Simulate multiple tabs
      // Verify consistency
    });
  });
});
```

### Jour 5: Documentation
```markdown
# Cart System Documentation

## Architecture Overview
[Diagramme]

## API Reference
- Store Methods
- Server Actions
- Event Types

## Common Issues
- Hydration errors → Solution
- Sync conflicts → Solution
```

---

## Sprint 2: Infrastructure CQRS (10 jours)

### Structure des Dossiers
```
src/
├── application/
│   └── cart/
│       ├── commands/
│       │   ├── add-item/
│       │   │   ├── add-item.command.ts
│       │   │   ├── add-item.handler.ts
│       │   │   └── add-item.validator.ts
│       │   ├── remove-item/
│       │   ├── update-quantity/
│       │   └── clear-cart/
│       ├── queries/
│       │   ├── get-cart/
│       │   ├── get-cart-summary/
│       │   └── get-cart-history/
│       └── ports/
│           ├── cart.repository.ts
│           └── event.publisher.ts
```

### Implémentation Command Bus
```typescript
// src/shared/cqrs/command-bus.ts
export class CommandBus {
  private handlers = new Map<string, ICommandHandler>();

  register<T extends ICommand>(
    commandType: Constructor<T>,
    handler: ICommandHandler<T>
  ): void {
    this.handlers.set(commandType.name, handler);
  }

  async execute<T extends ICommand>(command: T): Promise<Result<void>> {
    const handler = this.handlers.get(command.constructor.name);
    if (!handler) {
      return Result.error(new Error(`No handler for ${command.constructor.name}`));
    }
    
    return handler.handle(command);
  }
}

// Usage in React
export function useCommand<T extends ICommand>() {
  const commandBus = useCommandBus();
  
  return useCallback(async (command: T) => {
    const result = await commandBus.execute(command);
    if (result.isError()) {
      toast.error(result.getError().message);
    }
    return result;
  }, [commandBus]);
}
```

### Migration Progressive des Composants
```typescript
// AVANT
const handleAddToCart = async () => {
  const formData = new FormData();
  formData.append('productId', product.id);
  formData.append('quantity', '1');
  await addItemToCart(null, formData);
};

// APRÈS
const executeCommand = useCommand();
const handleAddToCart = async () => {
  await executeCommand(new AddItemCommand({
    productId: product.id,
    quantity: 1
  }));
};
```

---

## Sprint 3: Event Store & Projections (10 jours)

### Schema Base de Données
```sql
-- Event Store
CREATE TABLE domain_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_version INTEGER NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_domain_events_aggregate ON domain_events(aggregate_id, event_version);
CREATE INDEX idx_domain_events_type ON domain_events(event_type, occurred_at);

-- Read Model (Projection)
CREATE TABLE cart_projections (
  user_id UUID PRIMARY KEY,
  cart_data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  last_event_id UUID REFERENCES domain_events(event_id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Snapshots pour performance
CREATE TABLE cart_snapshots (
  aggregate_id UUID PRIMARY KEY,
  aggregate_data JSONB NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Event Handlers avec Projections
```typescript
// src/infrastructure/projections/cart.projection.ts
export class CartProjection {
  constructor(
    private eventStore: EventStore,
    private projectionStore: ProjectionStore
  ) {}

  async project(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'CartItemAdded':
        await this.handleItemAdded(event);
        break;
      case 'CartItemRemoved':
        await this.handleItemRemoved(event);
        break;
      // ... autres events
    }
  }

  private async handleItemAdded(event: CartItemAddedEvent): Promise<void> {
    const projection = await this.projectionStore.get(event.userId);
    
    const updatedProjection = {
      ...projection,
      items: [...projection.items, {
        id: event.itemId,
        productId: event.productId,
        quantity: event.quantity,
        addedAt: event.occurredAt
      }],
      totalItems: projection.totalItems + event.quantity,
      totalPrice: projection.totalPrice + (event.price * event.quantity),
      version: projection.version + 1,
      lastEventId: event.eventId
    };

    await this.projectionStore.save(event.userId, updatedProjection);
  }
}
```

---

## Sprint 4: Optimisations & Cache (5 jours)

### Redis Cache Layer
```typescript
// src/infrastructure/cache/redis-cache.service.ts
export class RedisCacheService implements CacheService {
  private redis: Redis;
  
  constructor(config: RedisConfig) {
    this.redis = new Redis(config);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, data);
    } else {
      await this.redis.set(key, data);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Query avec cache
export class GetCartQueryHandler {
  constructor(
    private repository: CartRepository,
    private cache: CacheService
  ) {}

  async handle(query: GetCartQuery): Promise<Result<CartViewModel>> {
    const cacheKey = `cart:${query.userId}`;
    
    // Try cache first
    const cached = await this.cache.get<CartViewModel>(cacheKey);
    if (cached) {
      return Result.ok(cached);
    }

    // Load from DB
    const result = await this.repository.findByUserId(query.userId);
    if (result.isSuccess()) {
      // Cache for 5 minutes
      await this.cache.set(cacheKey, result.getValue(), 300);
    }

    return result;
  }
}
```

### Database Indexes
```sql
-- Optimisation des requêtes
CREATE INDEX idx_carts_user_id ON carts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id) INCLUDE (product_id, quantity);
CREATE INDEX idx_products_active ON products(id) WHERE is_active = true;

-- Materialized View pour analytics
CREATE MATERIALIZED VIEW cart_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_carts,
  AVG(total_items) as avg_items_per_cart,
  AVG(total_price) as avg_cart_value,
  SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END)::float / COUNT(*) as abandonment_rate
FROM carts
GROUP BY DATE_TRUNC('day', created_at);

CREATE UNIQUE INDEX idx_cart_analytics_date ON cart_analytics(date);
```

---

## Sprint 5: Monitoring & Observabilité (5 jours)

### OpenTelemetry Integration
```typescript
// src/infrastructure/monitoring/tracing.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

export class TracedCommandBus extends CommandBus {
  private tracer = trace.getTracer('cart-service');

  async execute<T extends ICommand>(command: T): Promise<Result<void>> {
    const span = this.tracer.startSpan(`command.${command.constructor.name}`);
    
    try {
      span.setAttributes({
        'command.type': command.constructor.name,
        'command.user_id': command.userId,
        'command.timestamp': new Date().toISOString()
      });

      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => super.execute(command)
      );

      if (result.isError()) {
        span.recordException(result.getError());
        span.setStatus({ code: SpanStatusCode.ERROR });
      }

      return result;
    } finally {
      span.end();
    }
  }
}
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "title": "Cart Service Metrics",
    "panels": [
      {
        "title": "Cart Operations",
        "targets": [
          {
            "expr": "rate(cart_operations_total[5m])",
            "legendFormat": "{{operation}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(cart_errors_total[5m]) / rate(cart_operations_total[5m])"
          }
        ]
      },
      {
        "title": "P95 Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(cart_operation_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

### Health Checks
```typescript
// src/infrastructure/health/cart-health.ts
export class CartHealthCheck implements HealthIndicator {
  constructor(
    private db: SupabaseClient,
    private cache: CacheService,
    private eventBus: EventBus
  ) {}

  async check(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCache(),
      this.checkEventBus()
    ]);

    const results = checks.map((check, index) => ({
      name: ['database', 'cache', 'eventBus'][index],
      status: check.status === 'fulfilled' ? 'up' : 'down',
      message: check.status === 'rejected' ? check.reason.message : 'OK'
    }));

    const allHealthy = results.every(r => r.status === 'up');

    return {
      status: allHealthy ? 'up' : 'down',
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## Checklist de Déploiement

### Pré-Production
- [ ] Tous les tests passent (unit, integration, e2e)
- [ ] Performance tests validés (<100ms p95)
- [ ] Load tests validés (1000 req/s)
- [ ] Security scan passé
- [ ] Documentation à jour
- [ ] Rollback plan défini

### Production (Blue-Green Deployment)
```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Run smoke tests
npm run test:smoke:staging

# 3. Switch traffic gradually
# 10% → 25% → 50% → 100%

# 4. Monitor metrics
# - Error rate < 0.1%
# - Latency p95 < 100ms
# - No memory leaks

# 5. If issues, rollback
npm run rollback:production
```

### Post-Deployment
- [ ] Monitor dashboards 24h
- [ ] Analyser logs d'erreur
- [ ] Vérifier analytics business
- [ ] Communiquer succès à l'équipe
- [ ] Planning rétrospective

---

## Métriques de Succès Final

### Technique
- ✅ Latency: p95 < 100ms (objectif atteint)
- ✅ Availability: 99.9% uptime
- ✅ Error Rate: < 0.1%
- ✅ Test Coverage: > 85%

### Business
- ✅ Cart Abandonment: -15% (de 70% à 55%)
- ✅ Conversion Rate: +20%
- ✅ Average Order Value: +25%
- ✅ Customer Satisfaction: +30 NPS

### ROI
- Investissement: 30 jours-homme
- Retour: +150k€/an revenue
- Payback: 4 mois