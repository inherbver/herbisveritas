/**
 * Example component showing how to use the refactored cart system
 * 
 * This component demonstrates:
 * - Using the new cart store with optimistic updates
 * - Using the cart operations hooks
 * - Proper error handling and loading states
 * - Auto-sync functionality
 */

'use client';

import React, { useEffect } from 'react';
import { 
  useCartItems, 
  useCartLoading, 
  useCartErrors, 
  useCartSummary 
} from '@/stores/cart-store-refactored';
import { useCartOperations, useCartAutoSync } from '@/lib/store-sync/cart-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react';

/**
 * Cart item component with optimistic updates
 */
interface CartItemProps {
  item: {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
  };
}

function CartItemComponent({ item }: CartItemProps) {
  const loading = useCartLoading();
  const errors = useCartErrors();
  const { updateItemQuantity, removeItem } = useCartOperations();

  const handleQuantityChange = async (newQuantity: number) => {
    await updateItemQuantity(item.id, newQuantity);
  };

  const handleRemove = async () => {
    await removeItem(item.id);
  };

  const isUpdating = loading.update || loading.remove;
  const hasError = errors.update || errors.remove;

  return (
    <Card className="mb-4">
      <CardContent className="flex items-center space-x-4 p-4">
        {item.image && (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-16 h-16 object-cover rounded"
          />
        )}
        
        <div className="flex-1">
          <h3 className="font-medium">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.price.toFixed(2)} €</p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdating || item.quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>

          <Input
            type="number"
            min="1"
            max="99"
            value={item.quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value, 10);
              if (!isNaN(newQuantity) && newQuantity > 0) {
                handleQuantityChange(newQuantity);
              }
            }}
            className="w-16 text-center"
            disabled={isUpdating}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdating || item.quantity >= 99}
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>

      {hasError && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            {errors.update || errors.remove}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}

/**
 * Add to cart component with validation
 */
interface AddToCartProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image?: string;
    slug?: string;
  };
}

function AddToCartComponent({ product }: AddToCartProps) {
  const [quantity, setQuantity] = React.useState(1);
  const loading = useCartLoading();
  const errors = useCartErrors();
  const { addItem } = useCartOperations();

  const handleAddToCart = async () => {
    await addItem(product.id, quantity, {
      name: product.name,
      price: product.price,
      image: product.image,
      slug: product.slug,
    });
    
    // Reset quantity on success
    if (!errors.add) {
      setQuantity(1);
    }
  };

  const isAdding = loading.add;
  const addError = errors.add;
  const canAdd = product.stock > 0 && quantity <= product.stock;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
        <p className="text-lg font-semibold">{product.price.toFixed(2)} €</p>
        <p className="text-sm text-gray-600">Stock: {product.stock}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <label htmlFor="quantity" className="text-sm font-medium">
            Quantité:
          </label>
          <Input
            id="quantity"
            type="number"
            min="1"
            max={Math.min(product.stock, 99)}
            value={quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value, 10);
              if (!isNaN(newQuantity) && newQuantity > 0) {
                setQuantity(Math.min(newQuantity, product.stock));
              }
            }}
            className="w-20"
            disabled={isAdding}
          />
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={isAdding || !canAdd}
          className="w-full"
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ajout en cours...
            </>
          ) : (
            'Ajouter au panier'
          )}
        </Button>

        {!canAdd && product.stock === 0 && (
          <Alert>
            <AlertDescription>
              Produit en rupture de stock
            </AlertDescription>
          </Alert>
        )}

        {!canAdd && product.stock > 0 && quantity > product.stock && (
          <Alert>
            <AlertDescription>
              Stock insuffisant. Maximum disponible: {product.stock}
            </AlertDescription>
          </Alert>
        )}

        {addError && (
          <Alert variant="destructive">
            <AlertDescription>
              {addError}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Cart summary component
 */
function CartSummaryComponent() {
  const summary = useCartSummary();
  const loading = useCartLoading();
  const { clearCart } = useCartOperations();

  const handleClearCart = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider votre panier ?')) {
      await clearCart();
    }
  };

  if (summary.isEmpty) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-600">Votre panier est vide</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Résumé du panier</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Articles:</span>
          <span>{summary.totalItems}</span>
        </div>

        <div className="flex justify-between">
          <span>Produits différents:</span>
          <span>{summary.itemCount}</span>
        </div>

        <div className="flex justify-between font-semibold">
          <span>Sous-total:</span>
          <span>{summary.subtotal.toFixed(2)} €</span>
        </div>

        <Button
          variant="outline"
          onClick={handleClearCart}
          disabled={loading.clear}
          className="w-full"
        >
          {loading.clear ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vidage en cours...
            </>
          ) : (
            'Vider le panier'
          )}
        </Button>

        <Button className="w-full">
          Procéder au paiement
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Main cart page component
 */
export default function CartPageRefactored() {
  const items = useCartItems();
  const loading = useCartLoading();
  const errors = useCartErrors();
  
  // Auto-sync every 30 seconds
  useCartAutoSync(30000);

  // Clear errors on mount
  useEffect(() => {
    // This would be handled by the store's error clearing mechanism
  }, []);

  const hasGeneralError = errors.general || errors.sync;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Votre panier</h1>

      {hasGeneralError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            {errors.general || errors.sync}
          </AlertDescription>
        </Alert>
      )}

      {loading.sync && (
        <Alert className="mb-6">
          <AlertDescription>
            <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
            Synchronisation en cours...
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Articles</h2>
          
          {items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-600">Aucun article dans votre panier</p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {items.map((item) => (
                <CartItemComponent key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div>
          <CartSummaryComponent />
        </div>
      </div>

      {/* Example add to cart for demonstration */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Exemple d'ajout de produit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AddToCartComponent
            product={{
              id: '123e4567-e89b-12d3-a456-426614174000',
              name: 'Produit Exemple 1',
              price: 29.99,
              stock: 10,
              image: 'https://via.placeholder.com/150',
              slug: 'produit-exemple-1',
            }}
          />
          <AddToCartComponent
            product={{
              id: '123e4567-e89b-12d3-a456-426614174001',
              name: 'Produit Exemple 2',
              price: 49.99,
              stock: 5,
              slug: 'produit-exemple-2',
            }}
          />
          <AddToCartComponent
            product={{
              id: '123e4567-e89b-12d3-a456-426614174002',
              name: 'Produit Épuisé',
              price: 19.99,
              stock: 0,
              slug: 'produit-epuise',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Usage examples for different scenarios
 */
export const CartUsageExamples = {
  /**
   * Simple add to cart button
   */
  SimpleAddButton: ({ productId, productName, price }: {
    productId: string;
    productName: string;
    price: number;
  }) => {
    const { addItem } = useCartOperations();
    const loading = useCartLoading();

    return (
      <Button
        onClick={() => addItem(productId, 1, { name: productName, price })}
        disabled={loading.add}
      >
        {loading.add ? 'Ajout...' : 'Ajouter au panier'}
      </Button>
    );
  },

  /**
   * Cart icon with item count
   */
  CartIcon: () => {
    const summary = useCartSummary();

    return (
      <div className="relative">
        <Button variant="ghost" size="icon">
          {/* Cart icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l1.5-6M7 13v6a2 2 0 002 2h6a2 2 0 002-2v-6M7 13H5" />
          </svg>
        </Button>
        
        {summary.totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {summary.totalItems}
          </span>
        )}
      </div>
    );
  },

  /**
   * Quick quantity updater
   */
  QuickQuantityUpdater: ({ cartItemId, currentQuantity }: {
    cartItemId: string;
    currentQuantity: number;
  }) => {
    const { updateItemQuantity } = useCartOperations();
    const loading = useCartLoading();

    return (
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateItemQuantity(cartItemId, currentQuantity - 1)}
          disabled={loading.update || currentQuantity <= 1}
        >
          -
        </Button>
        <span className="mx-2 min-w-[2ch] text-center">{currentQuantity}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateItemQuantity(cartItemId, currentQuantity + 1)}
          disabled={loading.update}
        >
          +
        </Button>
      </div>
    );
  },
};