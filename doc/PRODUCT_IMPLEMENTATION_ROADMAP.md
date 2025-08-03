# 🚀 FEUILLE DE ROUTE D'IMPLÉMENTATION - SYSTÈME D'AFFICHAGE DES PRODUITS

## Phase 1: Optimisations Performance Immédiates (1 semaine)

### Jour 1-2: Optimisation Images et LCP

#### Actions Prioritaires
```bash
# 1. Configuration next/image optimisée
# 2. Génération de placeholders blur
# 3. WebP conversion automatique
# 4. Sizing strategy pour grid responsive

# Commandes
npm install sharp @plaiceholder/next
```

#### Implémentation ProductCard V2
```typescript
// src/components/products/product-card-optimized.tsx
export function ProductCardOptimized({ 
  product, 
  priority = false,
  index 
}: ProductCardOptimizedProps) {
  // Priority pour les 8 premiers produits (above-fold)
  const shouldPrioritize = priority || index < 8;
  
  return (
    <article className="group product-card-v2">
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={product.image_url || '/placeholder-product.webp'}
          alt={product.name}
          fill
          priority={shouldPrioritize}
          placeholder="blur"
          blurDataURL={product.blurDataURL}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Badges optimisés */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {product.is_new && <Badge variant="default">Nouveau</Badge>}
          {product.is_on_promotion && <Badge variant="secondary">Promo</Badge>}
        </div>
      </div>
      
      {/* Content section */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
        
        {product.short_description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary">
            {product.price.toFixed(2)} €
          </span>
          
          <OptimisticAddToCartButton 
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}
```

#### Script de Génération de Placeholders
```typescript
// scripts/generate-placeholders.ts
import { getPlaiceholder } from 'plaiceholder';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function generateProductPlaceholders() {
  const supabase = await createSupabaseServerClient();
  
  const { data: products } = await supabase
    .from('products')
    .select('id, image_url')
    .not('image_url', 'is', null);

  for (const product of products || []) {
    try {
      const { base64 } = await getPlaiceholder(product.image_url);
      
      await supabase
        .from('products')
        .update({ blur_data_url: base64 })
        .eq('id', product.id);
        
      console.log(`✅ Placeholder généré pour ${product.id}`);
    } catch (error) {
      console.error(`❌ Erreur pour ${product.id}:`, error);
    }
  }
}
```

### Jour 3-4: Optimisation Queries et Cache

#### Query Optimization
```typescript
// src/lib/queries/products-optimized.ts
export const getProductsForShop = cache(async (
  locale: Locale,
  page = 1,
  limit = 20
): Promise<ProductShopResult> => {
  const supabase = await createSupabaseServerClient();
  const offset = (page - 1) * limit;

  // Parallel queries avec Promise.all
  const [productsResult, totalCountResult] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id,
        slug,
        price,
        image_url,
        blur_data_url,
        is_new,
        is_on_promotion,
        unit,
        product_translations!left (
          name,
          short_description
        )
      `)
      .eq("is_active", true)
      .eq("product_translations.locale", locale)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false }),
      
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
  ]);

  return {
    products: productsResult.data || [],
    totalCount: totalCountResult.count || 0,
    hasMore: (totalCountResult.count || 0) > offset + limit,
    currentPage: page
  };
});

// Cache Redis pour queries fréquentes
export class ProductCacheService {
  private redis = new Redis(process.env.REDIS_URL);
  private TTL = 3600; // 1 heure

  async getShopProducts(locale: Locale, page: number): Promise<ProductShopResult | null> {
    const key = `products:shop:${locale}:${page}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setShopProducts(locale: Locale, page: number, data: ProductShopResult): Promise<void> {
    const key = `products:shop:${locale}:${page}`;
    await this.redis.setex(key, this.TTL, JSON.stringify(data));
  }

  async invalidateShopCache(): Promise<void> {
    const keys = await this.redis.keys('products:shop:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Shop Page avec Streaming
```typescript
// src/app/[locale]/shop/page.tsx - Version optimisée
export default async function ShopPageOptimized({ params, searchParams }: ShopPageProps) {
  const { locale } = await params;
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page);

  // Cache check d'abord
  const cache = new ProductCacheService();
  let productsData = await cache.getShopProducts(locale, currentPage);

  if (!productsData) {
    // Parallel data fetching
    const [heroResult, productsResult] = await Promise.all([
      getActiveFeaturedHeroItem(),
      getProductsForShop(locale, currentPage)
    ]);

    productsData = productsResult;
    
    // Cache le résultat
    await cache.setShopProducts(locale, currentPage, productsData);
  }

  return (
    <MainLayout>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>
      
      <div className="container py-8">
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGridStreaming 
            initialData={productsData}
            locale={locale}
            currentPage={currentPage}
          />
        </Suspense>
      </div>
    </MainLayout>
  );
}
```

### Jour 5: Monitoring et Métriques

#### Web Vitals Tracking
```typescript
// src/lib/analytics/web-vitals.ts
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const { name, startTime, duration } = entry;
      
      // Send to analytics
      gtag('event', name, {
        event_category: 'Web Vitals',
        value: Math.round(startTime + duration),
        non_interaction: true,
      });
    });
  }).observe({ entryTypes: ['largest-contentful-paint', 'cumulative-layout-shift'] });

  // Track custom metrics
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name === 'product-grid-render') {
        analytics.track('Product Grid Render Time', {
          duration: entry.duration,
          page: window.location.pathname
        });
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
}

// Hook pour mesurer les composants
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    performance.mark(`${componentName}-start`);
    
    return () => {
      performance.mark(`${componentName}-end`);
      performance.measure(
        `${componentName}-render`,
        `${componentName}-start`,
        `${componentName}-end`
      );
    };
  }, [componentName]);
}
```

---

## Phase 2: Améliorations UX/UI (2 semaines)

### Semaine 1: Loading States Avancés

#### Smart Skeletons
```typescript
// src/components/loading/product-skeletons.tsx
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

export function ProductCardSkeleton({ index }: { index: number }) {
  // Staggered animation pour effet de vague
  const delay = (index % 4) * 100;
  
  return (
    <div 
      className="animate-pulse space-y-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="aspect-square bg-muted rounded-lg" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="flex justify-between items-center">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-8 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// Progressive loading avec Intersection Observer
export function ProgressiveProductGrid({ products }: ProgressiveGridProps) {
  const [visibleProducts, setVisibleProducts] = useState(8);
  const { ref, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (inView && visibleProducts < products.length) {
      setVisibleProducts(prev => Math.min(prev + 4, products.length));
    }
  }, [inView, visibleProducts, products.length]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.slice(0, visibleProducts).map((product, index) => (
          <ProductCardOptimized
            key={product.id}
            product={product}
            index={index}
            priority={index < 8}
          />
        ))}
      </div>
      
      {visibleProducts < products.length && (
        <div ref={ref} className="mt-6">
          <ProductGridSkeleton count={4} />
        </div>
      )}
    </>
  );
}
```

#### Optimistic UI pour Add to Cart
```typescript
// src/hooks/use-optimistic-cart.ts
export function useOptimisticCart() {
  const [optimisticItems, setOptimisticItems] = useState<Map<string, number>>(new Map());
  const { addItem, isLoading } = useCartStore();

  const addToCartOptimistic = useCallback(async (product: ProductInfo) => {
    // 1. Update optimistic state immediately
    setOptimisticItems(prev => new Map(prev).set(product.id, 1));
    
    try {
      // 2. Server action
      const result = await addItem(product);
      
      if (result.success) {
        // 3. Success: remove from optimistic, show toast
        setOptimisticItems(prev => {
          const next = new Map(prev);
          next.delete(product.id);
          return next;
        });
        
        toast.success(`${product.name} ajouté au panier`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      // 4. Error: rollback optimistic state
      setOptimisticItems(prev => {
        const next = new Map(prev);
        next.delete(product.id);
        return next;
      });
      
      toast.error('Erreur lors de l\'ajout au panier');
    }
  }, [addItem]);

  return {
    addToCartOptimistic,
    isOptimisticAdding: (productId: string) => optimisticItems.has(productId),
    isLoading
  };
}

// Composant bouton optimisé
export function OptimisticAddToCartButton({ 
  productId, 
  productName, 
  productPrice,
  size = "default" 
}: AddToCartButtonProps) {
  const { addToCartOptimistic, isOptimisticAdding } = useOptimisticCart();
  const isAdding = isOptimisticAdding(productId);

  const handleClick = () => {
    addToCartOptimistic({
      id: productId,
      name: productName,
      price: productPrice
    });
  };

  return (
    <Button
      size={size}
      onClick={handleClick}
      disabled={isAdding}
      className={cn(
        "transition-all duration-200",
        isAdding && "bg-green-500 hover:bg-green-600"
      )}
    >
      {isAdding ? (
        <>
          <CheckIcon className="w-4 h-4 mr-1" />
          Ajouté
        </>
      ) : (
        <>
          <PlusIcon className="w-4 h-4 mr-1" />
          Ajouter
        </>
      )}
    </Button>
  );
}
```

### Semaine 2: Product Detail Amélioré

#### Image Gallery Component
```typescript
// src/components/products/product-image-gallery.tsx
export function ProductImageGallery({ 
  images, 
  productName 
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square group">
        <Image
          src={images[activeIndex].src}
          alt={`${productName} - Image ${activeIndex + 1}`}
          fill
          className={cn(
            "object-cover transition-transform duration-300",
            isZoomed && "scale-150 cursor-zoom-out"
          )}
          priority
          onClick={() => setIsZoomed(!isZoomed)}
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Image précédente"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Image suivante"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </>
        )}
        
        {/* Zoom indicator */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          Cliquer pour zoomer
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                activeIndex === index 
                  ? "border-primary" 
                  : "border-transparent hover:border-muted-foreground"
              )}
            >
              <Image
                src={image.src}
                alt={`${productName} - Miniature ${index + 1}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Enhanced Product Detail Page
```typescript
// src/components/products/product-detail-enhanced.tsx
export function ProductDetailEnhanced({ 
  product 
}: ProductDetailEnhancedProps) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const { addToCartOptimistic, isOptimisticAdding } = useOptimisticCart();

  // Breadcrumb navigation
  const breadcrumbs = [
    { label: "Accueil", href: "/" },
    { label: "Boutique", href: "/shop" },
    { label: product.category, href: `/shop?category=${product.category}` },
    { label: product.name, href: `/products/${product.slug}` }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Fil d'ariane" className="mb-8">
        <ol className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && <ChevronRightIcon className="w-4 h-4 mx-2 text-muted-foreground" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          <ProductImageGallery 
            images={product.images} 
            productName={product.name}
          />
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <header>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            {product.unit && (
              <p className="text-muted-foreground">{product.unit}</p>
            )}
          </header>

          {/* Price */}
          <div className="text-2xl font-bold text-primary">
            {selectedVariant.price.toFixed(2)} €
            {selectedVariant.originalPrice && (
              <span className="text-lg text-muted-foreground line-through ml-2">
                {selectedVariant.originalPrice.toFixed(2)} €
              </span>
            )}
          </div>

          {/* Description */}
          <div className="prose prose-sm max-w-none">
            <p>{product.shortDescription}</p>
          </div>

          {/* Variants */}
          {product.variants.length > 1 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Variantes</h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => setSelectedVariant(variant)}
                    className={cn(
                      "px-3 py-2 border rounded-lg transition-colors",
                      selectedVariant.id === variant.id
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-muted-foreground"
                    )}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="flex items-center space-x-4">
            <QuantityInput
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={selectedVariant.stock}
            />
            
            <Button
              size="lg"
              onClick={() => addToCartOptimistic({
                id: selectedVariant.id,
                name: product.name,
                price: selectedVariant.price,
                quantity
              })}
              disabled={isOptimisticAdding(selectedVariant.id) || selectedVariant.stock === 0}
              className="flex-1"
            >
              {selectedVariant.stock === 0 ? (
                "Rupture de stock"
              ) : isOptimisticAdding(selectedVariant.id) ? (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Ajouté au panier
                </>
              ) : (
                `Ajouter au panier • ${(selectedVariant.price * quantity).toFixed(2)} €`
              )}
            </Button>
          </div>

          {/* Product Features */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm">Livraison gratuite dès 50€</span>
            </div>
            <div className="flex items-center space-x-2">
              <TruckIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Expédition 24-48h</span>
            </div>
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="w-5 h-5 text-purple-600" />
              <span className="text-sm">Retour 30 jours</span>
            </div>
            <div className="flex items-center space-x-2">
              <HeartIcon className="w-5 h-5 text-red-600" />
              <span className="text-sm">Fabriqué en France</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information */}
      <ProductDetailTabs 
        description={product.description}
        properties={product.properties}
        composition={product.composition}
        usage={product.usage}
      />

      {/* Recommendations */}
      <div className="mt-16">
        <ProductRecommendations productId={product.id} />
      </div>
    </div>
  );
}
```

---

## Phase 3: Features Avancées (1 mois)

### Semaine 1-2: Search et Filtering

#### Faceted Search avec Algolia
```typescript
// src/lib/search/algolia-client.ts
import { algoliasearch } from 'algoliasearch';

const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY!
);

const index = client.initIndex('products');

export async function searchProducts(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult> {
  const searchParams = {
    query,
    filters: buildFilters(filters),
    facets: ['category', 'brand', 'price_range', 'in_stock'],
    hitsPerPage: 20,
    page: filters.page || 0
  };

  const result = await index.search(searchParams);
  
  return {
    hits: result.hits,
    facets: result.facets,
    totalHits: result.nbHits,
    totalPages: result.nbPages
  };
}

function buildFilters(filters: SearchFilters): string {
  const conditions = [];
  
  if (filters.categories?.length) {
    conditions.push(`category:${filters.categories.join(' OR category:')}`);
  }
  
  if (filters.priceRange) {
    conditions.push(`price:${filters.priceRange.min} TO ${filters.priceRange.max}`);
  }
  
  if (filters.inStock) {
    conditions.push('stock > 0');
  }
  
  return conditions.join(' AND ');
}
```

#### Search UI avec InstantSearch
```typescript
// src/components/search/product-search.tsx
export function ProductSearch() {
  return (
    <InstantSearch searchClient={searchClient} indexName="products">
      <div className="max-w-7xl mx-auto px-4">
        {/* Search Box */}
        <div className="mb-8">
          <SearchBox
            placeholder="Rechercher des produits..."
            className="w-full max-w-lg mx-auto"
          />
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-64 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Catégories</h3>
              <RefinementList attribute="category" />
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Prix</h3>
              <RangeInput attribute="price" />
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Marque</h3>
              <RefinementList attribute="brand" />
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Disponibilité</h3>
              <ToggleRefinement 
                attribute="in_stock" 
                label="En stock seulement"
              />
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <Stats />
              <SortBy
                items={[
                  { label: 'Pertinence', value: 'products' },
                  { label: 'Prix croissant', value: 'products_price_asc' },
                  { label: 'Prix décroissant', value: 'products_price_desc' },
                  { label: 'Nouveautés', value: 'products_date_desc' }
                ]}
              />
            </div>

            <Hits hitComponent={SearchResultCard} />
            
            <div className="mt-8 flex justify-center">
              <Pagination />
            </div>
          </main>
        </div>
      </div>
    </InstantSearch>
  );
}

function SearchResultCard({ hit }: { hit: any }) {
  return (
    <article className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <Image
          src={hit.image_url}
          alt={hit.name}
          width={80}
          height={80}
          className="rounded-lg object-cover"
        />
        
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold">
            <Highlight attribute="name" hit={hit} />
          </h3>
          
          <p className="text-sm text-muted-foreground">
            <Highlight attribute="short_description" hit={hit} />
          </p>
          
          <div className="flex justify-between items-center">
            <span className="font-bold text-primary">
              {hit.price.toFixed(2)} €
            </span>
            
            <OptimisticAddToCartButton
              productId={hit.objectID}
              productName={hit.name}
              productPrice={hit.price}
              size="sm"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
```

### Semaine 3-4: Recommendations et Analytics

#### ML-based Recommendations
```typescript
// src/lib/recommendations/recommendation-engine.ts
export class RecommendationEngine {
  private supabase = createSupabaseServerClient();

  async getRecommendations(
    userId?: string,
    productId?: string,
    type: 'similar' | 'frequently_bought' | 'personalized' = 'similar'
  ): Promise<Product[]> {
    switch (type) {
      case 'similar':
        return this.getSimilarProducts(productId!);
      case 'frequently_bought':
        return this.getFrequentlyBoughtTogether(productId!);
      case 'personalized':
        return this.getPersonalizedRecommendations(userId!);
      default:
        return [];
    }
  }

  private async getSimilarProducts(productId: string): Promise<Product[]> {
    // Vector similarity search
    const { data } = await this.supabase.rpc('get_similar_products', {
      target_product_id: productId,
      similarity_threshold: 0.7,
      limit_count: 8
    });

    return data || [];
  }

  private async getFrequentlyBoughtTogether(productId: string): Promise<Product[]> {
    // Market basket analysis
    const { data } = await this.supabase.rpc('get_frequently_bought_together', {
      target_product_id: productId,
      min_confidence: 0.1,
      limit_count: 4
    });

    return data || [];
  }

  private async getPersonalizedRecommendations(userId: string): Promise<Product[]> {
    // Collaborative filtering
    const { data } = await this.supabase.rpc('get_personalized_recommendations', {
      target_user_id: userId,
      limit_count: 12
    });

    return data || [];
  }
}

// Analytics tracking
export function trackProductInteraction(
  event: 'view' | 'add_to_cart' | 'purchase',
  productId: string,
  metadata?: Record<string, any>
) {
  // Track for ML model training
  analytics.track(`Product ${event}`, {
    productId,
    timestamp: Date.now(),
    ...metadata
  });

  // Store in database for recommendations
  fetch('/api/analytics/product-interaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      productId,
      metadata
    })
  });
}
```

#### Advanced Analytics Dashboard
```typescript
// src/components/admin/product-analytics.tsx
export function ProductAnalyticsDashboard() {
  const { data: analytics, isLoading } = useSWR(
    'product-analytics',
    () => getProductAnalytics()
  );

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          title="Vues produits"
          value={analytics.totalViews}
          change={analytics.viewsChange}
          icon={EyeIcon}
        />
        <MetricCard
          title="Taux conversion"
          value={`${analytics.conversionRate}%`}
          change={analytics.conversionChange}
          icon={TrendingUpIcon}
        />
        <MetricCard
          title="Panier moyen"
          value={`${analytics.averageOrderValue}€`}
          change={analytics.aovChange}
          icon={ShoppingCartIcon}
        />
        <MetricCard
          title="Produits populaires"
          value={analytics.trendingCount}
          change={analytics.trendingChange}
          icon={FireIcon}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vues par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={analytics.viewsByCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance des recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={analytics.recommendationPerformance} />
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produits les plus performants</CardTitle>
        </CardHeader>
        <CardContent>
          <TopProductsTable products={analytics.topProducts} />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Database Optimizations

### Indexes pour Performance
```sql
-- Indexes pour queries produits
CREATE INDEX CONCURRENTLY idx_products_active_price ON products(is_active, price) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_products_category_active ON products(category, is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_product_translations_locale_product ON product_translations(locale, product_id);

-- Full-text search
CREATE INDEX CONCURRENTLY idx_products_search ON products USING gin(to_tsvector('french', name || ' ' || coalesce(description, '')));

-- Analytics indexes
CREATE INDEX CONCURRENTLY idx_product_views_date ON product_views(product_id, created_at);
CREATE INDEX CONCURRENTLY idx_order_items_product ON order_items(product_id, created_at);

-- Vector similarity (pour recommendations)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX CONCURRENTLY idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops);
```

### Materialized Views pour Analytics
```sql
-- Vue des métriques produits
CREATE MATERIALIZED VIEW product_metrics AS
SELECT 
  p.id,
  p.name,
  p.category,
  COUNT(DISTINCT pv.id) as total_views,
  COUNT(DISTINCT ci.id) as times_added_to_cart,
  COUNT(DISTINCT oi.id) as times_purchased,
  COALESCE(COUNT(DISTINCT oi.id)::float / NULLIF(COUNT(DISTINCT ci.id), 0), 0) as cart_to_purchase_rate,
  AVG(r.rating) as average_rating,
  COUNT(DISTINCT r.id) as review_count
FROM products p
LEFT JOIN product_views pv ON p.id = pv.product_id AND pv.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN cart_items ci ON p.id = ci.product_id AND ci.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN order_items oi ON p.id = oi.product_id AND oi.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN reviews r ON p.id = r.product_id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.category;

CREATE UNIQUE INDEX idx_product_metrics_id ON product_metrics(id);

-- Refresh automatique
CREATE OR REPLACE FUNCTION refresh_product_metrics()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_metrics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour refresh
CREATE TRIGGER refresh_metrics_on_view
  AFTER INSERT ON product_views
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_product_metrics();
```

---

## Monitoring et Alerting

### Performance Monitoring
```typescript
// src/lib/monitoring/product-monitor.ts
export class ProductPerformanceMonitor {
  private static instance: ProductPerformanceMonitor;
  
  static getInstance(): ProductPerformanceMonitor {
    if (!this.instance) {
      this.instance = new ProductPerformanceMonitor();
    }
    return this.instance;
  }

  trackPageLoad(page: string, duration: number) {
    // Send to monitoring service
    fetch('/api/monitoring/page-load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        duration,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        connection: (navigator as any).connection?.effectiveType
      })
    });
  }

  trackProductInteraction(productId: string, action: string, duration?: number) {
    analytics.track('Product Interaction', {
      productId,
      action,
      duration,
      page: window.location.pathname
    });
  }

  async checkHealthMetrics(): Promise<HealthStatus> {
    const [
      avgLoadTime,
      errorRate,
      conversionRate
    ] = await Promise.all([
      this.getAverageLoadTime(),
      this.getErrorRate(),
      this.getConversionRate()
    ]);

    return {
      avgLoadTime,
      errorRate,
      conversionRate,
      status: this.calculateOverallHealth(avgLoadTime, errorRate, conversionRate)
    };
  }
}

// Alerting rules
export const ALERT_THRESHOLDS = {
  PAGE_LOAD_TIME: 3000, // 3s
  ERROR_RATE: 0.05, // 5%
  CONVERSION_DROP: 0.2, // 20% drop
  SEARCH_LATENCY: 500 // 500ms
};

export function setupProductAlerting() {
  // Check metrics every 5 minutes
  setInterval(async () => {
    const monitor = ProductPerformanceMonitor.getInstance();
    const health = await monitor.checkHealthMetrics();
    
    if (health.avgLoadTime > ALERT_THRESHOLDS.PAGE_LOAD_TIME) {
      sendAlert('High page load time', health);
    }
    
    if (health.errorRate > ALERT_THRESHOLDS.ERROR_RATE) {
      sendAlert('High error rate', health);
    }
  }, 5 * 60 * 1000);
}
```

---

## Checklist de Déploiement

### Phase 1 ✅
- [ ] Image optimization (WebP, blur placeholders)
- [ ] Query optimization et pagination
- [ ] Cache Redis implémenté
- [ ] Core Web Vitals < seuils target
- [ ] Bundle analysis et optimisation

### Phase 2 ✅
- [ ] Loading states avancés
- [ ] Optimistic UI pour add-to-cart
- [ ] Image gallery multi-images
- [ ] Enhanced product detail page
- [ ] Mobile UX optimisé

### Phase 3 ✅
- [ ] Search Algolia intégré
- [ ] Filtering faceted
- [ ] Recommendation engine
- [ ] Analytics dashboard
- [ ] A/B testing setup

### Production ✅
- [ ] Performance tests validés
- [ ] Accessibility audit WCAG 2.1 AA
- [ ] SEO audit (Schema.org, meta tags)
- [ ] Security scan passé
- [ ] Monitoring et alerting actifs

---

## ROI et Métriques Finales

### Objectifs Business
- **Conversion Rate**: +25% (8% → 10%)
- **Average Order Value**: +15% 
- **Page Load Time**: -60% (2.5s → 1.0s)
- **User Satisfaction**: +40% (NPS score)
- **Mobile Conversion**: +50%

### ROI Estimé
- **Investissement**: 45 jours-homme
- **Retour annuel**: +200k€ revenue
- **Payback period**: 3 mois

Cette roadmap garantit une transformation complète du système d'affichage produits avec des gains mesurables en performance, UX et business metrics.