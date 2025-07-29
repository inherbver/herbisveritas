/**
 * Bounded Contexts Analysis for Microservices Architecture
 * 
 * Analyse des domaines métier et définition des frontières de services
 * pour une architecture microservices optimale.
 */

export interface BoundedContext {
  name: string;
  description: string;
  responsibilities: string[];
  entities: string[];
  aggregates: string[];
  events: string[];
  apis: string[];
  dependencies: string[];
  dataStores: string[];
  complexity: 'low' | 'medium' | 'high';
  businessCriticality: 'low' | 'medium' | 'high';
  changeFrequency: 'low' | 'medium' | 'high';
}

/**
 * Définition des Bounded Contexts identifiés dans l'application
 */
export const BOUNDED_CONTEXTS: Record<string, BoundedContext> = {
  // === CORE BUSINESS CONTEXTS ===
  
  PRODUCT_CATALOG: {
    name: 'Product Catalog',
    description: 'Gestion du catalogue de produits, recherche et métadonnées',
    responsibilities: [
      'Gestion des produits et variantes',
      'Gestion des catégories et taxonomies', 
      'Recherche et filtrage de produits',
      'Gestion des traductions multilingues',
      'Gestion des images et médias',
      'Optimisation SEO des produits'
    ],
    entities: [
      'Product',
      'ProductTranslation', 
      'Category',
      'ProductImage',
      'ProductVariant'
    ],
    aggregates: ['Product', 'Category'],
    events: [
      'ProductCreated',
      'ProductUpdated', 
      'ProductActivated',
      'ProductDeactivated',
      'ProductCategoryChanged'
    ],
    apis: [
      'GET /api/products',
      'GET /api/products/:id',
      'GET /api/categories',
      'POST /api/products/search',
      'GET /api/products/featured'
    ],
    dependencies: [],
    dataStores: ['products', 'product_translations', 'categories'],
    complexity: 'medium',
    businessCriticality: 'high',
    changeFrequency: 'medium'
  },

  INVENTORY_MANAGEMENT: {
    name: 'Inventory Management', 
    description: 'Gestion des stocks, réservations et approvisionnement',
    responsibilities: [
      'Suivi des niveaux de stock',
      'Réservation et libération de stock',
      'Gestion des mouvements de stock',
      'Alertes de stock faible',
      'Gestion des approvisionnements',
      'Prévisions de demande'
    ],
    entities: [
      'StockLevel',
      'StockMovement', 
      'StockReservation',
      'SupplyOrder',
      'StockAlert'
    ],
    aggregates: ['Inventory', 'StockMovement'],
    events: [
      'StockLevelUpdated',
      'StockReserved',
      'StockReleased', 
      'StockReplenished',
      'LowStockAlert'
    ],
    apis: [
      'GET /api/inventory/:productId',
      'POST /api/inventory/reserve',
      'POST /api/inventory/release',
      'GET /api/inventory/alerts'
    ],
    dependencies: ['PRODUCT_CATALOG'],
    dataStores: ['inventory', 'stock_movements', 'stock_reservations'],
    complexity: 'high',
    businessCriticality: 'high', 
    changeFrequency: 'high'
  },

  SHOPPING_CART: {
    name: 'Shopping Cart',
    description: 'Gestion des paniers, sessions et persistance',
    responsibilities: [
      'Gestion des paniers utilisateurs',
      'Persistance des sessions',
      'Calculs de prix et promotions',
      'Gestion des paniers abandonnés',
      'Synchronisation multi-device',
      'Optimisations de performance'
    ],
    entities: [
      'Cart',
      'CartItem',
      'CartSession',
      'AbandonedCart'
    ],
    aggregates: ['Cart'],
    events: [
      'CartCreated',
      'CartItemAdded',
      'CartItemRemoved', 
      'CartItemUpdated',
      'CartAbandoned',
      'CartCleared'
    ],
    apis: [
      'GET /api/cart',
      'POST /api/cart/items',
      'PUT /api/cart/items/:id',
      'DELETE /api/cart/items/:id',
      'POST /api/cart/clear'
    ],
    dependencies: ['PRODUCT_CATALOG', 'INVENTORY_MANAGEMENT'],
    dataStores: ['carts', 'cart_items', 'cart_sessions'],
    complexity: 'medium',
    businessCriticality: 'high',
    changeFrequency: 'medium'
  },

  ORDER_MANAGEMENT: {
    name: 'Order Management',
    description: 'Gestion du cycle de vie des commandes',
    responsibilities: [
      'Création et validation des commandes',
      'Gestion des statuts de commande',
      'Orchestration du fulfillment',
      'Gestion des retours et remboursements',
      'Intégration avec les transporteurs',
      'Notifications clients'
    ],
    entities: [
      'Order',
      'OrderItem',
      'OrderStatus',
      'Shipment',
      'Return',
      'Refund'
    ],
    aggregates: ['Order', 'Shipment'],
    events: [
      'OrderCreated',
      'OrderConfirmed',
      'OrderShipped',
      'OrderDelivered',
      'OrderCancelled',
      'OrderReturned'
    ],
    apis: [
      'POST /api/orders',
      'GET /api/orders/:id',
      'PUT /api/orders/:id/status',
      'POST /api/orders/:id/cancel',
      'POST /api/orders/:id/return'
    ],
    dependencies: ['SHOPPING_CART', 'INVENTORY_MANAGEMENT', 'PAYMENT_PROCESSING'],
    dataStores: ['orders', 'order_items', 'shipments'],
    complexity: 'high',
    businessCriticality: 'high',
    changeFrequency: 'medium' 
  },

  PAYMENT_PROCESSING: {
    name: 'Payment Processing',
    description: 'Gestion des paiements et transactions financières',
    responsibilities: [
      'Traitement des paiements',
      'Gestion des méthodes de paiement',
      'Gestion des webhooks Stripe',
      'Gestion des remboursements',
      'Rapprochement comptable',
      'Conformité PCI-DSS'
    ],
    entities: [
      'Payment',
      'PaymentMethod',
      'Transaction',
      'Refund',
      'PaymentIntent'
    ],
    aggregates: ['Payment', 'PaymentIntent'],
    events: [
      'PaymentInitiated',
      'PaymentCompleted',
      'PaymentFailed',
      'PaymentRefunded',
      'PaymentMethodAdded'
    ],
    apis: [
      'POST /api/payments/intent',
      'POST /api/payments/confirm',
      'POST /api/payments/refund',
      'POST /api/webhooks/stripe'
    ],
    dependencies: ['ORDER_MANAGEMENT'],
    dataStores: ['payments', 'payment_intents', 'transactions'],
    complexity: 'high',
    businessCriticality: 'high',
    changeFrequency: 'low'
  },

  // === CUSTOMER CONTEXTS ===

  USER_MANAGEMENT: {
    name: 'User Management',
    description: 'Gestion des utilisateurs, profils et authentification',
    responsibilities: [
      'Gestion des comptes utilisateurs',
      'Authentification et autorisation', 
      'Gestion des profils',
      'Gestion des préférences',
      'Notifications utilisateurs',
      'RGPD et données personnelles'
    ],
    entities: [
      'User',
      'UserProfile',
      'UserPreferences',
      'UserSession',
      'UserNotification'
    ],
    aggregates: ['User'],
    events: [
      'UserRegistered',
      'UserEmailVerified',
      'UserProfileUpdated',
      'UserDeactivated',
      'UserPreferencesUpdated'
    ],
    apis: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/users/profile',
      'PUT /api/users/profile',
      'DELETE /api/users/account'
    ],
    dependencies: [],
    dataStores: ['users', 'profiles', 'user_preferences'],
    complexity: 'medium',
    businessCriticality: 'high',
    changeFrequency: 'low'
  },

  ADDRESS_MANAGEMENT: {
    name: 'Address Management',
    description: 'Gestion des adresses de livraison et facturation',
    responsibilities: [
      'Gestion des adresses utilisateurs',
      'Validation des adresses',
      'Géocodage et normalisation',
      'Gestion des zones de livraison',
      'Intégration avec services de livraison',
      'Adresses temporaires pour invités'
    ],
    entities: [
      'Address',
      'DeliveryZone',
      'AddressValidation'
    ],
    aggregates: ['Address'],
    events: [
      'AddressCreated',
      'AddressUpdated',
      'AddressDeleted',
      'AddressValidated'
    ],
    apis: [
      'GET /api/addresses',
      'POST /api/addresses',
      'PUT /api/addresses/:id',
      'DELETE /api/addresses/:id',
      'POST /api/addresses/validate'
    ],
    dependencies: ['USER_MANAGEMENT'],
    dataStores: ['addresses', 'delivery_zones'],
    complexity: 'low',
    businessCriticality: 'medium',
    changeFrequency: 'low'
  },

  // === CONTENT CONTEXTS ===

  CONTENT_MANAGEMENT: {
    name: 'Content Management',
    description: 'Gestion du contenu éditorial et du magazine',
    responsibilities: [
      'Gestion des articles de magazine',
      'Workflow éditorial',
      'Gestion des médias',
      'SEO et métadonnées',
      'Publication multilingue',
      'Archive et versioning'
    ],
    entities: [
      'Article',
      'ArticleTranslation',
      'Category',
      'Tag',
      'Media',
      'Author'
    ],
    aggregates: ['Article', 'Category'],
    events: [
      'ArticleCreated',
      'ArticlePuslished',
      'ArticleUnpublished',
      'ArticleTranslated',
      'CategoryCreated'
    ],
    apis: [
      'GET /api/articles',
      'POST /api/articles',
      'PUT /api/articles/:id',
      'POST /api/articles/:id/publish',
      'GET /api/categories'
    ],
    dependencies: [],
    dataStores: ['articles', 'article_translations', 'categories', 'tags'],
    complexity: 'medium',
    businessCriticality: 'medium',
    changeFrequency: 'high'
  },

  // === SUPPORT CONTEXTS ===

  NOTIFICATION_SERVICE: {
    name: 'Notification Service',
    description: 'Service de notifications multi-canal',
    responsibilities: [
      'Envoi d\'emails transactionnels',
      'Notifications push',
      'SMS notifications',
      'Templates de communication',
      'Gestion des préférences',
      'Analytics de communication'
    ],
    entities: [
      'Notification',
      'NotificationTemplate',
      'NotificationChannel',
      'NotificationLog'
    ],
    aggregates: ['Notification'],
    events: [
      'NotificationSent',
      'NotificationFailed',
      'NotificationOpened',
      'NotificationClicked'
    ],
    apis: [
      'POST /api/notifications/send',
      'GET /api/notifications/templates',
      'PUT /api/notifications/preferences'
    ],
    dependencies: ['USER_MANAGEMENT'],
    dataStores: ['notifications', 'notification_templates', 'notification_logs'],
    complexity: 'medium',
    businessCriticality: 'medium',
    changeFrequency: 'medium'
  },

  ANALYTICS_REPORTING: {
    name: 'Analytics & Reporting',
    description: 'Analytics métier et reporting',
    responsibilities: [
      'Tracking des événements métier',
      'Rapports de ventes',
      'Analyses de comportement',
      'KPIs et métriques',
      'Dashboards temps réel',
      'Export et intégrations BI'
    ],
    entities: [
      'Event',
      'Report',
      'Metric',
      'Dashboard',
      'KPI'
    ],
    aggregates: ['Analytics', 'Report'],
    events: [
      'EventTracked',
      'ReportGenerated',
      'MetricCalculated',
      'DashboardUpdated'
    ],
    apis: [
      'POST /api/analytics/track',
      'GET /api/analytics/reports',
      'GET /api/analytics/dashboards',
      'POST /api/analytics/export'
    ],
    dependencies: ['ORDER_MANAGEMENT', 'USER_MANAGEMENT', 'SHOPPING_CART'],
    dataStores: ['events', 'analytics', 'reports'],
    complexity: 'high',
    businessCriticality: 'medium',
    changeFrequency: 'high'
  }
};

/**
 * Configuration des services microservices 
 */
export const MICROSERVICE_CONFIG = {
  // Services Core Business (Critical Path)
  CORE_SERVICES: [
    'PRODUCT_CATALOG',
    'INVENTORY_MANAGEMENT', 
    'SHOPPING_CART',
    'ORDER_MANAGEMENT',
    'PAYMENT_PROCESSING'
  ],

  // Services Customer (User Experience)
  CUSTOMER_SERVICES: [
    'USER_MANAGEMENT',
    'ADDRESS_MANAGEMENT'
  ],

  // Services Support (Non-Critical)
  SUPPORT_SERVICES: [
    'CONTENT_MANAGEMENT',
    'NOTIFICATION_SERVICE',
    'ANALYTICS_REPORTING'
  ],

  // Configuration de déploiement
  DEPLOYMENT_STRATEGY: {
    // Services qui peuvent être extraits en premier (faible couplage)
    PHASE_1: ['CONTENT_MANAGEMENT', 'NOTIFICATION_SERVICE'],
    
    // Services avec dépendances modérées
    PHASE_2: ['USER_MANAGEMENT', 'ADDRESS_MANAGEMENT', 'ANALYTICS_REPORTING'],
    
    // Services core business (extraction complexe)
    PHASE_3: ['PRODUCT_CATALOG', 'INVENTORY_MANAGEMENT'],
    
    // Services transactionnels critiques (extraction finale)
    PHASE_4: ['SHOPPING_CART', 'ORDER_MANAGEMENT', 'PAYMENT_PROCESSING']
  }
};

/**
 * Matrice de dépendances entre services
 */
export const SERVICE_DEPENDENCIES = {
  // Communication synchrone (API calls)
  SYNCHRONOUS: {
    'SHOPPING_CART': ['PRODUCT_CATALOG', 'INVENTORY_MANAGEMENT'],
    'ORDER_MANAGEMENT': ['SHOPPING_CART', 'INVENTORY_MANAGEMENT', 'PAYMENT_PROCESSING'],
    'INVENTORY_MANAGEMENT': ['PRODUCT_CATALOG'],
    'ADDRESS_MANAGEMENT': ['USER_MANAGEMENT'],
    'NOTIFICATION_SERVICE': ['USER_MANAGEMENT'],
    'ANALYTICS_REPORTING': ['ORDER_MANAGEMENT', 'USER_MANAGEMENT', 'SHOPPING_CART']
  },

  // Communication asynchrone (Events)
  ASYNCHRONOUS: {
    'NOTIFICATION_SERVICE': ['ORDER_MANAGEMENT', 'USER_MANAGEMENT', 'SHOPPING_CART'],
    'ANALYTICS_REPORTING': ['*'], // Tous les services via événements
    'INVENTORY_MANAGEMENT': ['ORDER_MANAGEMENT', 'SHOPPING_CART']
  }
};

/**
 * Configuration des données partagées
 */
export const SHARED_DATA_STRATEGY = {
  // Données partagées via événements (Event Sourcing)
  EVENT_SOURCED: [
    'ProductEvents',
    'OrderEvents', 
    'CartEvents',
    'UserEvents',
    'InventoryEvents'
  ],

  // Données partagées via API (Read-only)
  API_SHARED: [
    'ProductCatalog', // Lecture seule pour autres services
    'UserProfiles',   // Lecture seule pour notifications
    'Addresses'       // Lecture seule pour commandes
  ],

  // Données dupliquées par service (Eventual Consistency)
  REPLICATED: [
    'ProductBasicInfo', // Nom, prix dans cart/order
    'UserBasicInfo',    // Email, nom dans notifications
    'AddressSnapshot'   // Adresse figée dans commandes
  ]
};

/**
 * Patterns de communication inter-services
 */
export const COMMUNICATION_PATTERNS = {
  // Request-Response synchrone
  SYNCHRONOUS_RPC: {
    pattern: 'HTTP REST API',
    useCases: ['Product lookup', 'User validation', 'Address validation'],
    timeout: '5s',
    retry: '3 attempts',
    circuitBreaker: true
  },

  // Event-driven asynchrone  
  ASYNCHRONOUS_EVENTS: {
    pattern: 'Event Bus + Event Store',
    useCases: ['Order processing', 'Inventory updates', 'Notifications'],
    eventStore: 'Supabase',
    eventBus: 'InMemory + Future: Kafka',
    retryPolicy: 'Exponential backoff'
  },

  // Saga Pattern pour transactions distribuées
  SAGA_ORCHESTRATION: {
    pattern: 'Orchestrator Saga',
    useCases: ['Order fulfillment', 'Payment processing'],
    orchestrator: 'Order Service',
    compensationActions: true
  }
};

/**
 * Stratégie de migration vers microservices
 */
export const MIGRATION_STRATEGY = {
  // Approche Strangler Fig Pattern
  approach: 'Strangler Fig',
  
  // Étapes de migration
  steps: [
    '1. Extract support services (Content, Notifications)',
    '2. Extract customer services (User, Address)', 
    '3. Extract catalog services (Products, Inventory)',
    '4. Extract core business (Cart, Orders, Payments)',
    '5. Retire monolith APIs progressively'
  ],

  // Critères de readiness
  readinessCriteria: [
    'Event-driven architecture in place',
    'Service contracts defined',
    'Monitoring and observability ready',
    'Data migration strategy validated',
    'Team and operational readiness'
  ]
};

export default {
  BOUNDED_CONTEXTS,
  MICROSERVICE_CONFIG,
  SERVICE_DEPENDENCIES,
  SHARED_DATA_STRATEGY,
  COMMUNICATION_PATTERNS,
  MIGRATION_STRATEGY
};