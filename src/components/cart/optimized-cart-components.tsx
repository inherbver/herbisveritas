/**
 * Optimized Cart Components with Streaming and Suspense
 *
 * These components demonstrate modern Next.js 15 patterns:
 * - Server Components with async/await
 * - Streaming UI with Suspense boundaries
 * - Progressive loading for better UX
 * - Error boundaries for graceful failure handling
 */

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { resolveService } from "@/lib/infrastructure/container/container.config";
import { SERVICE_TOKENS } from "@/lib/infrastructure/container/container";
import { CartDomainService } from "@/lib/domain/services/cart.service";
import { getActiveUserId } from "@/utils/authUtils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingCart } from "lucide-react";

/**
 * Cart loading skeleton
 */
function CartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-32" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="flex items-center space-x-4 p-4">
            <Skeleton className="h-16 w-16 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="mt-4 h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Cart error fallback
 */
function CartErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <Card className="border-red-200">
      <CardContent className="flex items-center space-x-4 p-6">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Erreur lors du chargement du panier</h3>
          <p className="mt-1 text-sm text-red-700">
            {error.message || "Une erreur technique s'est produite."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={resetErrorBoundary}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Individual cart item component (Server Component)
 */
async function CartItemComponent({
  item,
  userId: _userId,
}: {
  item: {
    id: string;
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string;
    quantity: number;
    subtotal: number;
    addedAt: string;
    isAvailable: boolean;
    isQuantityAvailable: boolean;
  };
  userId: string;
}) {
  // This could fetch additional data for the item if needed
  // For example, real-time stock levels, reviews, etc.

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center space-x-4 p-4">
        {item.productImage && (
          <img
            src={item.productImage}
            alt={item.productName}
            className="h-16 w-16 rounded-md object-cover"
            loading="lazy"
          />
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{item.productName}</h3>
          <p className="text-sm text-gray-600">
            {item.productPrice.toFixed(2)} € × {item.quantity}
          </p>

          {!item.isAvailable && (
            <Badge variant="destructive" className="mt-1">
              Non disponible
            </Badge>
          )}

          {item.isAvailable && !item.isQuantityAvailable && (
            <Badge variant="secondary" className="mt-1">
              Stock insuffisant
            </Badge>
          )}
        </div>

        <div className="text-right">
          <p className="font-semibold">{item.subtotal.toFixed(2)} €</p>
          <p className="text-xs text-gray-500">
            Ajouté le {new Date(item.addedAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Cart items list (Server Component with streaming)
 */
async function CartItemsList({ userId }: { userId: string }) {
  try {
    // Use domain service to get cart
    const cartDomainService = await resolveService<CartDomainService>(
      SERVICE_TOKENS.CART_DOMAIN_SERVICE
    );
    const cartResult = await cartDomainService.getCartByUserId(userId);

    if (cartResult.isError()) {
      throw new Error(cartResult.getError().message);
    }

    const cart = cartResult.getValue();

    if (!cart || cart.isEmpty()) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Votre panier est vide</h3>
            <p className="text-gray-500">Découvrez nos produits et ajoutez-les à votre panier</p>
          </CardContent>
        </Card>
      );
    }

    const items = cart.getItems();

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Suspense
            key={item.id}
            fallback={
              <Card>
                <CardContent className="flex items-center space-x-4 p-4">
                  <Skeleton className="h-16 w-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            }
          >
            <CartItemComponent
              item={{
                id: item.id,
                productId: item.productReference.id,
                productName: item.productReference.name,
                productPrice: item.productReference.price.amount,
                productImage: item.productReference.imageUrl,
                quantity: item.quantity.value,
                subtotal: item.getSubtotal().amount,
                addedAt: item.addedAt,
                isAvailable: item.isAvailable(),
                isQuantityAvailable: item.isQuantityAvailable(),
              }}
              userId={userId}
            />
          </Suspense>
        ))}
      </div>
    );
  } catch (_error) {
    throw new Error(
      `Impossible de charger les articles du panier: ${error instanceof Error ? error.message : "Erreur inconnue"}`
    );
  }
}

/**
 * Cart summary component (Server Component)
 */
async function CartSummary({ userId }: { userId: string }) {
  try {
    const cartDomainService = await resolveService<CartDomainService>(
      SERVICE_TOKENS.CART_DOMAIN_SERVICE
    );
    const cartResult = await cartDomainService.getCartByUserId(userId);

    if (cartResult.isError()) {
      throw new Error(cartResult.getError().message);
    }

    const cart = cartResult.getValue();

    if (!cart || cart.isEmpty()) {
      return null;
    }

    const totalItems = cart.getTotalQuantity().value;
    const subtotal = cart.getSubtotal().amount;
    const unavailableItems = cart.getUnavailableItems();

    // Calculate shipping (simplified)
    const shipping = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + shipping;

    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Résumé ({totalItems} articles)</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {unavailableItems.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {unavailableItems.length} article(s) non disponible(s)
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>

            <div className="flex justify-between">
              <span>Livraison</span>
              <span>
                {shipping === 0 ? (
                  <span className="text-green-600">Gratuite</span>
                ) : (
                  `${shipping.toFixed(2)} €`
                )}
              </span>
            </div>

            {shipping > 0 && subtotal < 50 && (
              <p className="text-xs text-gray-500">Livraison gratuite dès 50€</p>
            )}

            <hr />

            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={unavailableItems.length > 0}>
            {unavailableItems.length > 0
              ? "Corriger les problèmes pour continuer"
              : "Procéder au paiement"}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Taxes incluses. Livraison calculée lors du paiement.
          </p>
        </CardContent>
      </Card>
    );
  } catch (_error) {
    throw new Error(
      `Impossible de charger le résumé: ${error instanceof Error ? error.message : "Erreur inconnue"}`
    );
  }
}

/**
 * Main cart page component with streaming
 */
export async function OptimizedCartPage() {
  // Get user ID
  const supabase = await createSupabaseServerClient();
  const userId = await getActiveUserId(supabase);

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="mb-4 text-xl font-semibold">Connexion requise</h2>
            <p className="mb-6 text-gray-600">
              Veuillez vous connecter pour accéder à votre panier.
            </p>
            <Button>Se connecter</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center space-x-2">
        <ShoppingCart className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Votre panier</h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items - Streams independently */}
        <div className="lg:col-span-2">
          <ErrorBoundary
            FallbackComponent={CartErrorFallback}
            onReset={() => window.location.reload()}
          >
            <Suspense fallback={<CartSkeleton />}>
              <CartItemsList userId={userId} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {/* Cart Summary - Streams independently */}
        <div>
          <ErrorBoundary
            FallbackComponent={({ error: _error, resetErrorBoundary }) => (
              <Card className="border-red-200">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
                  <p className="text-sm text-red-700">Erreur lors du chargement du résumé</p>
                  <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="mt-2">
                    Réessayer
                  </Button>
                </CardContent>
              </Card>
            )}
          >
            <Suspense
              fallback={
                <Card className="sticky top-4">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <hr />
                      <div className="flex justify-between">
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              }
            >
              <CartSummary userId={userId} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart badge component for navigation (Server Component)
 */
export async function CartBadge({ className }: { className?: string }) {
  try {
    const supabase = await createSupabaseServerClient();
    const userId = await getActiveUserId(supabase);

    if (!userId) {
      return (
        <Button variant="ghost" size="icon" className={className}>
          <ShoppingCart className="h-5 w-5" />
        </Button>
      );
    }

    const cartDomainService = await resolveService<CartDomainService>(
      SERVICE_TOKENS.CART_DOMAIN_SERVICE
    );
    const cartResult = await cartDomainService.getCartByUserId(userId);

    if (cartResult.isError()) {
      // Fail silently for the badge
      return (
        <Button variant="ghost" size="icon" className={className}>
          <ShoppingCart className="h-5 w-5" />
        </Button>
      );
    }

    const cart = cartResult.getValue();
    const totalItems = cart ? cart.getTotalQuantity().value : 0;

    return (
      <Button variant="ghost" size="icon" className={`relative ${className}`}>
        <ShoppingCart className="h-5 w-5" />
        {totalItems > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
          >
            {totalItems > 99 ? "99+" : totalItems}
          </Badge>
        )}
      </Button>
    );
  } catch (_error) {
    // Fail silently for the badge
    return (
      <Button variant="ghost" size="icon" className={className}>
        <ShoppingCart className="h-5 w-5" />
      </Button>
    );
  }
}

/**
 * Mini cart dropdown component (Server Component)
 */
export async function MiniCart({ userId }: { userId: string }) {
  try {
    const cartDomainService = await resolveService<CartDomainService>(
      SERVICE_TOKENS.CART_DOMAIN_SERVICE
    );
    const cartResult = await cartDomainService.getCartByUserId(userId);

    if (cartResult.isError()) {
      throw new Error(cartResult.getError().message);
    }

    const cart = cartResult.getValue();

    if (!cart || cart.isEmpty()) {
      return (
        <div className="p-4 text-center">
          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm text-gray-600">Votre panier est vide</p>
        </div>
      );
    }

    const items = cart.getItems().slice(0, 3); // Show only first 3 items
    const totalItems = cart.getTotalQuantity().value;
    const subtotal = cart.getSubtotal().amount;

    return (
      <div className="w-80">
        <div className="border-b p-4">
          <h3 className="font-semibold">Panier ({totalItems} articles)</h3>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50">
              {item.productReference.imageUrl && (
                <img
                  src={item.productReference.imageUrl}
                  alt={item.productReference.name}
                  className="h-10 w-10 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productReference.name}</p>
                <p className="text-xs text-gray-500">
                  {item.quantity.value} × {item.productReference.price.amount.toFixed(2)} €
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold">Total:</span>
            <span className="font-bold">{subtotal.toFixed(2)} €</span>
          </div>

          <div className="space-y-2">
            <Button className="w-full" size="sm">
              Voir le panier
            </Button>
            <Button variant="outline" className="w-full" size="sm">
              Commander
            </Button>
          </div>
        </div>
      </div>
    );
  } catch (_error) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">Erreur de chargement</p>
      </div>
    );
  }
}
