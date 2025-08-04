/**
 * Event System Container Configuration
 * 
 * Configures the complete event-driven architecture within the DI container.
 */

import { ContainerBuilder, SERVICE_TOKENS } from "../container/container";
import { SimpleEventBus } from "./simple-event-bus";
import { InMemoryEventStore } from "./event-store";
import type { EventBus, EventStore } from "@/lib/core/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/core/logger";

// Event Handlers
import { CartEventHandler } from "./handlers/cart.event-handler";
import { OrderEventHandler } from "./handlers/order.event-handler";
import { UserEventHandler } from "./handlers/user.event-handler";
import { InventoryEventHandler } from "./handlers/inventory.event-handler";
import { NotificationEventHandler } from "./handlers/notification.event-handler";
import { AuditEventHandler } from "./handlers/audit.event-handler";

// Event Listeners (aggregate handlers)
import { CartEventListener } from "./listeners/cart.event-listener";
import { OrderWorkflowEventListener } from "./listeners/order-workflow.event-listener";
import { NotificationEventListener } from "./listeners/notification.event-listener";
import { AuditEventListener } from "./listeners/audit.event-listener";

// Event Listener Interfaces
interface CartEventListenerInterface {
  handleCartItemAdded: (event: unknown) => Promise<void>;
  handleCartItemRemoved: (event: unknown) => Promise<void>;
  handleCartItemQuantityUpdated: (event: unknown) => Promise<void>;
  handleCartCleared: (event: unknown) => Promise<void>;
  handleProductStockUpdated: (event: unknown) => Promise<void>;
  handleProductPriceChanged: (event: unknown) => Promise<void>;
}

interface OrderWorkflowEventListenerInterface {
  handleOrderCreated: (event: unknown) => Promise<void>;
  handleOrderConfirmed: (event: unknown) => Promise<void>;
  handleOrderShipped: (event: unknown) => Promise<void>;
  handleOrderDelivered: (event: unknown) => Promise<void>;
  handleOrderCancelled: (event: unknown) => Promise<void>;
}

interface NotificationEventListenerInterface {
  handleUserRegistered: (event: unknown) => Promise<void>;
  handleUserProfileUpdated: (event: unknown) => Promise<void>;
}

interface AuditEventListenerInterface {
  handleAuditEvent: (event: unknown) => Promise<void>;
}

/**
 * Configure the complete event system in the DI container
 */
export function configureEventSystem(builder: ContainerBuilder): void {
  // Core Event Infrastructure
  configureEventInfrastructure(builder);
  
  // Event Handlers
  configureEventHandlers(builder);
  
  // Event Listeners (aggregate handlers)
  configureEventListeners(builder);
  
  // Event System Initialization
  configureEventSystemInitialization(builder);
}

/**
 * Configure core event infrastructure
 */
function configureEventInfrastructure(builder: ContainerBuilder): void {
  // Event Bus - Singleton to ensure all events go through the same instance
  builder.addSingleton(
    SERVICE_TOKENS.EVENT_BUS,
    () => new SimpleEventBus(logger),
    []
  );

  // Event Store - Singleton for event persistence
  builder.addSingleton(
    SERVICE_TOKENS.EVENT_STORE,
    (container) => new InMemoryEventStore(
      container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT),
      logger
    ),
    [SERVICE_TOKENS.SUPABASE_CLIENT]
  );

  // Event Publisher - Uses Event Bus
  builder.addSingleton(
    SERVICE_TOKENS.EVENT_PUBLISHER,
    (container) => container.resolve(SERVICE_TOKENS.EVENT_BUS),
    [SERVICE_TOKENS.EVENT_BUS]
  );
}

/**
 * Configure individual event handlers
 */
function configureEventHandlers(builder: ContainerBuilder): void {
  // Cart Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.CART_EVENT_HANDLER,
    (container) => new CartEventHandler(
      container.resolve(SERVICE_TOKENS.CART_REPOSITORY),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.CART_REPOSITORY, SERVICE_TOKENS.EVENT_STORE]
  );

  // Order Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.ORDER_EVENT_HANDLER,
    (container) => new OrderEventHandler(
      container.resolve(SERVICE_TOKENS.ORDER_REPOSITORY),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.ORDER_REPOSITORY, SERVICE_TOKENS.EVENT_STORE]
  );

  // User Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.USER_EVENT_HANDLER,
    (container) => new UserEventHandler(
      container.resolve(SERVICE_TOKENS.USER_REPOSITORY),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.USER_REPOSITORY, SERVICE_TOKENS.EVENT_STORE]
  );

  // Inventory Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.INVENTORY_EVENT_HANDLER,
    (container) => new InventoryEventHandler(
      container.resolve(SERVICE_TOKENS.PRODUCT_REPOSITORY),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.PRODUCT_REPOSITORY, SERVICE_TOKENS.EVENT_STORE]
  );

  // Notification Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER,
    (container) => new NotificationEventHandler(
      container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.SUPABASE_CLIENT, SERVICE_TOKENS.EVENT_STORE]
  );

  // Audit Event Handler
  builder.addSingleton(
    SERVICE_TOKENS.AUDIT_EVENT_HANDLER,
    (container) => new AuditEventHandler(
      container.resolve(SERVICE_TOKENS.SUPABASE_CLIENT),
      container.resolve(SERVICE_TOKENS.EVENT_STORE),
      logger
    ),
    [SERVICE_TOKENS.SUPABASE_CLIENT, SERVICE_TOKENS.EVENT_STORE]
  );
}

/**
 * Configure event listeners (aggregate handlers that coordinate multiple handlers)
 */
function configureEventListeners(builder: ContainerBuilder): void {
  // Cart Event Listener - coordinates cart-related event handling
  builder.addSingleton(
    SERVICE_TOKENS.CART_EVENT_LISTENER,
    (container) => new CartEventListener(
      container.resolve(SERVICE_TOKENS.CART_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.INVENTORY_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.AUDIT_EVENT_HANDLER),
      logger
    ),
    [
      SERVICE_TOKENS.CART_EVENT_HANDLER,
      SERVICE_TOKENS.INVENTORY_EVENT_HANDLER,
      SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER,
      SERVICE_TOKENS.AUDIT_EVENT_HANDLER
    ]
  );

  // Order Workflow Event Listener - coordinates order processing
  builder.addSingleton(
    SERVICE_TOKENS.ORDER_WORKFLOW_EVENT_LISTENER,
    (container) => new OrderWorkflowEventListener(
      container.resolve(SERVICE_TOKENS.ORDER_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.INVENTORY_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.AUDIT_EVENT_HANDLER),
      logger
    ),
    [
      SERVICE_TOKENS.ORDER_EVENT_HANDLER,
      SERVICE_TOKENS.INVENTORY_EVENT_HANDLER,
      SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER,
      SERVICE_TOKENS.AUDIT_EVENT_HANDLER
    ]
  );

  // Notification Event Listener - handles all notification scenarios
  builder.addSingleton(
    SERVICE_TOKENS.NOTIFICATION_EVENT_LISTENER,
    (container) => new NotificationEventListener(
      container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER),
      container.resolve(SERVICE_TOKENS.USER_EVENT_HANDLER),
      logger
    ),
    [
      SERVICE_TOKENS.NOTIFICATION_EVENT_HANDLER,
      SERVICE_TOKENS.USER_EVENT_HANDLER
    ]
  );

  // Audit Event Listener - comprehensive audit trail
  builder.addSingleton(
    SERVICE_TOKENS.AUDIT_EVENT_LISTENER,
    (container) => new AuditEventListener(
      container.resolve(SERVICE_TOKENS.AUDIT_EVENT_HANDLER),
      logger
    ),
    [SERVICE_TOKENS.AUDIT_EVENT_HANDLER]
  );
}

/**
 * Configure event system initialization
 */
function configureEventSystemInitialization(builder: ContainerBuilder): void {
  // Event System Initializer - sets up all event subscriptions
  builder.addSingleton(
    SERVICE_TOKENS.EVENT_SYSTEM_INITIALIZER,
    (container) => ({
      initialize: async () => {
        await initializeEventSystem(container);
      }
    }),
    [
      SERVICE_TOKENS.EVENT_BUS,
      SERVICE_TOKENS.CART_EVENT_LISTENER,
      SERVICE_TOKENS.ORDER_WORKFLOW_EVENT_LISTENER,
      SERVICE_TOKENS.NOTIFICATION_EVENT_LISTENER,
      SERVICE_TOKENS.AUDIT_EVENT_LISTENER
    ]
  );
}

/**
 * Initialize the event system by registering all event listeners
 */
export async function initializeEventSystem(container: { resolve: (token: string) => unknown }): Promise<void> {
  try {
    logger.info('Initializing event system...');

    const eventBus: EventBus = container.resolve(SERVICE_TOKENS.EVENT_BUS) as EventBus;
    
    // Get all event listeners
    const cartListener = container.resolve(SERVICE_TOKENS.CART_EVENT_LISTENER) as CartEventListenerInterface;
    const orderWorkflowListener = container.resolve(SERVICE_TOKENS.ORDER_WORKFLOW_EVENT_LISTENER) as OrderWorkflowEventListenerInterface;
    const notificationListener = container.resolve(SERVICE_TOKENS.NOTIFICATION_EVENT_LISTENER) as NotificationEventListenerInterface;
    const auditListener = container.resolve(SERVICE_TOKENS.AUDIT_EVENT_LISTENER) as AuditEventListenerInterface;

    // Register Cart Event Subscriptions
    await eventBus.subscribe('CART_ITEM_ADDED', (event) => cartListener.handleCartItemAdded(event));
    await eventBus.subscribe('CART_ITEM_REMOVED', (event) => cartListener.handleCartItemRemoved(event));
    await eventBus.subscribe('CART_ITEM_QUANTITY_UPDATED', (event) => cartListener.handleCartItemQuantityUpdated(event));
    await eventBus.subscribe('CART_CLEARED', (event) => cartListener.handleCartCleared(event));

    // Register Order Event Subscriptions
    await eventBus.subscribe('ORDER_CREATED', (event) => orderWorkflowListener.handleOrderCreated(event));
    await eventBus.subscribe('ORDER_CONFIRMED', (event) => orderWorkflowListener.handleOrderConfirmed(event));
    await eventBus.subscribe('ORDER_SHIPPED', (event) => orderWorkflowListener.handleOrderShipped(event));
    await eventBus.subscribe('ORDER_DELIVERED', (event) => orderWorkflowListener.handleOrderDelivered(event));
    await eventBus.subscribe('ORDER_CANCELLED', (event) => orderWorkflowListener.handleOrderCancelled(event));

    // Register User Event Subscriptions
    await eventBus.subscribe('USER_REGISTERED', (event) => notificationListener.handleUserRegistered(event));
    await eventBus.subscribe('USER_PROFILE_UPDATED', (event) => notificationListener.handleUserProfileUpdated(event));

    // Register Inventory Event Subscriptions
    await eventBus.subscribe('PRODUCT_STOCK_UPDATED', (event) => cartListener.handleProductStockUpdated(event));
    await eventBus.subscribe('PRODUCT_PRICE_CHANGED', (event) => cartListener.handleProductPriceChanged(event));

    // Register Audit Event Subscriptions (catch-all for audit trail)
    const auditEvents = [
      'CART_ITEM_ADDED', 'CART_ITEM_REMOVED', 'CART_ITEM_QUANTITY_UPDATED', 'CART_CLEARED',
      'ORDER_CREATED', 'ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
      'USER_REGISTERED', 'USER_PROFILE_UPDATED',
      'PRODUCT_STOCK_UPDATED', 'PRODUCT_PRICE_CHANGED'
    ];

    for (const eventType of auditEvents) {
      await eventBus.subscribe(eventType, (event) => auditListener.handleAuditEvent(event));
    }

    logger.info('Event system initialized successfully', {
      registeredEvents: auditEvents.length,
      listeners: ['cart', 'order-workflow', 'notification', 'audit']
    });
  } catch (error) {
    logger.error('Failed to initialize event system', error);
    throw error;
  }
}

/**
 * Health check for the event system
 */
export async function checkEventSystemHealth(container: { resolve: (token: string) => unknown }): Promise<{
  eventBus: boolean;
  eventStore: boolean;
  handlers: Record<string, boolean>;
  listeners: Record<string, boolean>;
  errors: string[];
}> {
  const errors: string[] = [];
  const result = {
    eventBus: false,
    eventStore: false,
    handlers: {} as Record<string, boolean>,
    listeners: {} as Record<string, boolean>,
    errors
  };

  try {
    // Check Event Bus
    const eventBus = container.resolve(SERVICE_TOKENS.EVENT_BUS) as EventBus;
    result.eventBus = eventBus !== null;
  } catch (error) {
    errors.push(`Event Bus: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Check Event Store
    const eventStore = container.resolve(SERVICE_TOKENS.EVENT_STORE) as EventStore;
    result.eventStore = eventStore !== null;
  } catch (error) {
    errors.push(`Event Store: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Check Event Handlers
  const handlerTokens = [
    'CART_EVENT_HANDLER',
    'ORDER_EVENT_HANDLER', 
    'USER_EVENT_HANDLER',
    'INVENTORY_EVENT_HANDLER',
    'NOTIFICATION_EVENT_HANDLER',
    'AUDIT_EVENT_HANDLER'
  ];

  for (const token of handlerTokens) {
    try {
      const handler = container.resolve((SERVICE_TOKENS as Record<string, string>)[token]);
      result.handlers[token] = handler !== null;
    } catch (error) {
      result.handlers[token] = false;
      errors.push(`Handler ${token}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check Event Listeners
  const listenerTokens = [
    'CART_EVENT_LISTENER',
    'ORDER_WORKFLOW_EVENT_LISTENER',
    'NOTIFICATION_EVENT_LISTENER', 
    'AUDIT_EVENT_LISTENER'
  ];

  for (const token of listenerTokens) {
    try {
      const listener = container.resolve((SERVICE_TOKENS as Record<string, string>)[token]);
      result.listeners[token] = listener !== null;
    } catch (error) {
      result.listeners[token] = false;
      errors.push(`Listener ${token}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return result;
}