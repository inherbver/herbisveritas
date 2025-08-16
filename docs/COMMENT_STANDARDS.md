# Standards de Commentaires HerbisVeritas

## Vue d'ensemble

Ce guide définit les standards de commentaires pour le projet HerbisVeritas, incluant les templates JSDoc, les guidelines pour différents types de commentaires, et des exemples Before/After pour améliorer la qualité de la documentation du code.

## Table des matières

- [Principes généraux](#principes-généraux)
- [Standards JSDoc](#standards-jsdoc)
- [Templates par type de fonction](#templates-par-type-de-fonction)
- [Commentaires de sécurité](#commentaires-de-sécurité)
- [Commentaires de performance](#commentaires-de-performance)
- [TODO et FIXME](#todo-et-fixme)
- [Exemples Before/After](#exemples-beforeafter)
- [Checklist de validation](#checklist-de-validation)

## Principes généraux

### ✅ Bons commentaires
- **Expliquent le POURQUOI**, pas le QUOI
- **Documentent les décisions métier**
- **Préviennent des pièges et effets de bord**
- **Facilitent la maintenance**

### ❌ Commentaires à éviter
- Commentaires évidents qui répètent le code
- Documentation obsolète
- Commentaires vagues ou incomplets
- Mélange français/anglais

### Règles de base
1. **Langue**: Français pour les commentaires métier, anglais accepté pour les termes techniques
2. **Format**: JSDoc pour toutes les fonctions publiques
3. **Mise à jour**: Les commentaires doivent évoluer avec le code
4. **Concision**: Privilégier la clarté à la longueur

## Standards JSDoc

### Structure générale

```typescript
/**
 * [Description courte de la fonction]
 * 
 * [Description longue optionnelle avec contexte métier]
 * 
 * @param {Type} paramName - Description du paramètre
 * @returns {Type} Description du retour
 * 
 * @throws {ErrorType} Conditions d'erreur
 * @example
 * // Exemple d'utilisation
 * const result = await functionName(param);
 * 
 * @since v1.2.0
 * @see {@link RelatedFunction} pour plus d'informations
 */
```

### Tags obligatoires par contexte

| Contexte | Tags obligatoires | Tags optionnels |
|----------|-------------------|-----------------|
| Server Actions | `@description`, `@param`, `@returns` | `@throws`, `@example` |
| Fonctions publiques | `@description`, `@param`, `@returns` | `@example`, `@since` |
| Utilitaires | `@description`, `@param`, `@returns` | `@example` |
| Hooks React | `@description`, `@returns` | `@param`, `@example` |

## Templates par type de fonction

### Server Actions

```typescript
/**
 * Server Action: Connexion utilisateur avec gestion du panier invité
 * 
 * Authentifie un utilisateur et migre automatiquement son panier
 * depuis une session invité vers son compte utilisateur.
 * 
 * @param {ActionResult<null> | undefined} prevState - État précédent de l'action
 * @param {FormData} formData - Données du formulaire contenant email et password
 * @returns {Promise<ActionResult<null>>} Résultat de l'authentification
 * 
 * @throws {ValidationError} Si les données du formulaire sont invalides
 * @throws {AuthenticationError} Si les identifiants sont incorrects
 * 
 * @example
 * ```typescript
 * const result = await loginAction(undefined, formData);
 * if (result.success) {
 *   // Redirection automatique vers /profile/account
 * } else {
 *   // Afficher result.error à l'utilisateur
 * }
 * ```
 */
```

### Fonctions de service

```typescript
/**
 * Valide et traite une adresse de livraison
 * 
 * Vérifie la validité de l'adresse via l'API Colissimo et calcule
 * les frais de port selon les zones de livraison.
 * 
 * @param {Address} address - Adresse à valider
 * @param {boolean} [isDefault=false] - Si c'est l'adresse par défaut
 * @returns {Promise<ValidationResult>} Résultat avec adresse normalisée et frais
 * 
 * @throws {AddressValidationError} Si l'adresse est introuvable
 * 
 * @example
 * ```typescript
 * const result = await validateAddress({
 *   street: "123 rue de la Paix",
 *   city: "Paris",
 *   zipCode: "75001"
 * });
 * ```
 */
```

### Hooks React

```typescript
/**
 * Hook pour la synchronisation automatique du panier
 * 
 * Synchronise le panier local avec le serveur lors des changements
 * d'état d'authentification et gère les erreurs de réseau.
 * 
 * @returns {Object} État et actions du panier
 * @returns {CartItem[]} returns.items - Articles du panier
 * @returns {boolean} returns.isLoading - État de chargement
 * @returns {Function} returns.addItem - Ajouter un article
 * @returns {Function} returns.removeItem - Retirer un article
 * 
 * @example
 * ```typescript
 * const { items, addItem, isLoading } = useCartSync();
 * 
 * const handleAddToCart = useCallback(() => {
 *   addItem({ productId: '123', quantity: 1 });
 * }, [addItem]);
 * ```
 */
```

### Composants React

```typescript
/**
 * Composant de carte produit avec gestion du panier
 * 
 * Affiche les informations d'un produit avec actions d'ajout au panier.
 * Optimisé pour les performances avec React.memo et gestion tactile mobile.
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Product} props.product - Données du produit
 * @param {boolean} [props.showActions=true] - Afficher les boutons d'action
 * @param {Function} [props.onAddToCart] - Callback d'ajout au panier
 * 
 * @example
 * ```tsx
 * <ProductCard 
 *   product={product}
 *   onAddToCart={(item) => console.log('Added:', item)}
 * />
 * ```
 */
```

## Commentaires de sécurité

### Format standardisé

```typescript
/**
 * SÉCURITÉ: [Description du risque et de la protection]
 * 
 * @security-context [Contexte où le risque apparaît]
 * @mitigation [Mesures de protection mises en place]
 * @verification [Comment vérifier que la protection fonctionne]
 */
```

### Exemples

```typescript
/**
 * SÉCURITÉ: Validation stricte des permissions administrateur
 * 
 * Cette fonction vérifie que l'utilisateur possède le rôle admin
 * en base de données, pas seulement dans le token JWT.
 * 
 * @security-context Accès aux fonctions d'administration
 * @mitigation Vérification en base + audit logging
 * @verification Tests d'intrusion + logs de sécurité
 */
const checkAdminPermission = async (userId: string) => {
  // Vérification en base obligatoire pour éviter les bypasses JWT
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (profile?.role !== 'admin') {
    // Log des tentatives d'accès non autorisées
    await logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', userId);
    throw new UnauthorizedError('Accès administrateur requis');
  }
};
```

## Commentaires de performance

### Format standardisé

```typescript
/**
 * PERFORMANCE: [Description de l'optimisation]
 * 
 * @perf-impact [Impact mesuré ou estimé]
 * @benchmark [Résultats de tests de performance]
 * @alternative [Autres approches considérées]
 */
```

### Exemples

```typescript
/**
 * PERFORMANCE: Cache en mémoire pour les données de configuration
 * 
 * Les paramètres de configuration sont rarement modifiés mais
 * fréquemment consultés. Le cache réduit les appels DB de 95%.
 * 
 * @perf-impact -300ms temps de réponse moyen sur /admin
 * @benchmark 1000 req/s vs 50 req/s sans cache
 * @alternative Redis évalué mais overkill pour ce volume
 */
const configCache = new Map<string, ConfigValue>();

/**
 * PERFORMANCE: Pagination virtualisée pour les grandes listes
 * 
 * Au-delà de 100 produits, le rendu devient lent sur mobile.
 * La virtualisation maintient des performances constantes.
 * 
 * @perf-impact Temps de rendu constant même avec 10k+ produits
 * @benchmark FCP < 500ms vs 3s+ sans virtualisation
 * @alternative Pagination serveur mais UX dégradée
 */
```

## TODO et FIXME

### Standards

```typescript
// ✅ BON: TODO avec contexte et échéance
// TODO(alice): Implémenter cache Redis pour session store
// Échéance: Sprint 12 - Nécessaire pour la montée en charge
// Voir: https://github.com/company/project/issues/456

// ✅ BON: FIXME avec impact et solution temporaire
// FIXME(bob): Race condition sur updateCart() 
// Impact: Double ajout produit possible sous forte charge
// Workaround: Debounce côté client pour mitiger
// Issue: #789

// ❌ MAUVAIS: Sans contexte
// TODO: Fix this
// FIXME: Bug here
```

### Template standardisé

```typescript
// TODO(author): [Description claire de ce qui doit être fait]
// Context: [Pourquoi c'est nécessaire]
// Priority: [HIGH/MEDIUM/LOW]
// Deadline: [Sprint/Date si applicable]
// Issue: [Lien vers ticket si applicable]

// FIXME(author): [Description du problème]
// Impact: [Conséquences du bug]
// Workaround: [Solution temporaire si applicable]
// Root cause: [Cause probable si connue]
// Issue: [Lien vers ticket]
```

## Exemples Before/After

### 1. Server Action évidente

#### ❌ Before
```typescript
// Action de connexion
export async function loginAction(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  // Valider les données
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  // Vérifier si valide
  if (!validatedFields.success) {
    throw new ValidationError("Invalid data");
  }

  // Se connecter
  const { error } = await supabase.auth.signInWithPassword({
    email: validatedFields.data.email,
    password: validatedFields.data.password
  });
}
```

#### ✅ After
```typescript
/**
 * Server Action: Authentification utilisateur avec migration panier
 * 
 * Connecte un utilisateur et migre automatiquement son panier invité
 * vers son compte utilisateur. Gère les cas d'erreur et l'audit sécurité.
 * 
 * @param {ActionResult<null> | undefined} prevState - État précédent de l'action
 * @param {FormData} formData - email et password de connexion
 * @returns {Promise<ActionResult<null>>} Résultat avec redirection automatique
 * 
 * @throws {ValidationError} Données manquantes ou format email invalide
 * @throws {AuthenticationError} Identifiants incorrects ou compte non confirmé
 * 
 * @example
 * ```typescript
 * // Usage dans un formulaire avec useActionState
 * const [state, formAction] = useActionState(loginAction, undefined);
 * ```
 */
export async function loginAction(
  prevState: ActionResult<null> | undefined,
  formData: FormData
): Promise<ActionResult<null>> {
  const context = LogUtils.createUserActionContext("unknown", "login", "auth");
  LogUtils.logOperationStart("login", context);

  try {
    const supabase = await createSupabaseServerClient();

    const validatedFields = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!validatedFields.success) {
      throw new ValidationError("Données de connexion invalides", undefined, {
        validationErrors: validatedFields.error.flatten().fieldErrors,
      });
    }

    // Récupérer l'utilisateur invité AVANT connexion pour migration panier
    let guestUserId: string | undefined;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.is_anonymous) {
      guestUserId = currentUser.id;
      context.guestUserId = guestUserId;
    }

    const { email, password } = validatedFields.data;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message === "Email not confirmed") {
        throw new AuthenticationError(
          "Email non confirmé. Veuillez vérifier votre boîte de réception."
        );
      }
      throw new AuthenticationError("L'email ou le mot de passe est incorrect.");
    }

    // Migration du panier invité si nécessaire
    if (guestUserId) {
      await this.migrateGuestCart(guestUserId, context);
    }

    LogUtils.logOperationSuccess("login", { ...context, email });
    redirect("/fr/profile/account");
  } catch (error) {
    return this.handleAuthError(error, context);
  }
}
```

### 2. Composant avec commentaires évidents

#### ❌ Before
```typescript
// Composant bouton
const Button = ({ children, onClick, variant = "default" }) => {
  // Créer les classes CSS
  const classes = cn(
    "px-4 py-2 rounded", // Classes de base
    variant === "primary" && "bg-blue-500", // Si primary
    variant === "secondary" && "bg-gray-500" // Si secondary
  );

  // Retourner le bouton
  return (
    <button className={classes} onClick={onClick}>
      {children} {/* Contenu du bouton */}
    </button>
  );
};
```

#### ✅ After
```typescript
/**
 * Composant bouton avec variants optimisés pour l'accessibilité mobile
 * 
 * Bouton réutilisable avec gestion des variants, tailles tactiles mobiles,
 * et états d'interaction. Respecte les guidelines WCAG pour l'accessibilité.
 * 
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.children - Contenu du bouton
 * @param {Function} [props.onClick] - Gestionnaire de clic
 * @param {"default"|"primary"|"secondary"|"mobile-touch"} [props.variant="default"] - Style du bouton
 * @param {"sm"|"default"|"lg"} [props.size="default"] - Taille du bouton
 * @param {boolean} [props.disabled=false] - État désactivé
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="mobile-touch" onClick={handleSubmit}>
 *   Valider la commande
 * </Button>
 * ```
 */
const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick, 
  variant = "default",
  size = "default",
  disabled = false,
  ...props 
}) => {
  const classes = cn(
    // Classes de base avec focus visible pour l'accessibilité
    "inline-flex items-center justify-center transition-all",
    "focus-visible:ring-2 focus-visible:ring-primary/40",
    "disabled:pointer-events-none disabled:opacity-50",
    
    // Variants avec considération du contraste et du dark mode
    buttonVariants({ variant, size }),
    
    // Classes personnalisées
    props.className
  );

  return (
    <button 
      className={classes} 
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
```

### 3. Hook avec logique métier

#### ❌ Before
```typescript
// Hook pour le panier
function useCart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ajouter un item
  const addItem = useCallback((item) => {
    setLoading(true);
    // Logique d'ajout
    setItems(prev => [...prev, item]);
    setLoading(false);
  }, []);

  // Retourner les données
  return { items, addItem, loading };
}
```

#### ✅ After
```typescript
/**
 * Hook de gestion du panier avec synchronisation serveur
 * 
 * Gère l'état local du panier, la synchronisation avec le serveur,
 * et la migration automatique entre sessions invité/authentifié.
 * Optimisé pour éviter les re-renders inutiles.
 * 
 * @returns {Object} État et actions du panier
 * @returns {CartItem[]} returns.items - Articles du panier avec quantités
 * @returns {number} returns.totalPrice - Prix total en centimes
 * @returns {boolean} returns.isLoading - Chargement en cours
 * @returns {boolean} returns.hasChanges - Modifications non sauvegardées
 * @returns {Function} returns.addItem - Ajouter un article au panier
 * @returns {Function} returns.updateQuantity - Modifier la quantité
 * @returns {Function} returns.removeItem - Retirer un article
 * @returns {Function} returns.syncWithServer - Forcer la synchronisation
 * 
 * @example
 * ```typescript
 * const { items, addItem, totalPrice, isLoading } = useCart();
 * 
 * const handleAddProduct = useCallback((productId: string) => {
 *   addItem({ productId, quantity: 1 });
 * }, [addItem]);
 * 
 * // Le hook gère automatiquement:
 * // - Persistance locale (localStorage)
 * // - Synchronisation serveur  
 * // - Migration panier invité → authentifié
 * // - Gestion des conflits réseau
 * ```
 */
function useCart(): CartHookReturn {
  const [state, setState] = useState<CartState>({
    items: [],
    totalPrice: 0,
    isLoading: false,
    hasChanges: false,
    lastSyncTimestamp: null
  });

  const { user } = useAuth();
  const debouncedSync = useDebouncedCallback(syncWithServer, 2000);

  const addItem = useCallback((newItem: CartItemInput) => {
    setState(prev => {
      const existingItem = prev.items.find(item => item.productId === newItem.productId);
      
      if (existingItem) {
        // Incrémenter la quantité existante
        return updateCartState(prev, {
          ...existingItem,
          quantity: existingItem.quantity + (newItem.quantity || 1)
        });
      }
      
      // Ajouter nouvel article
      return addNewItemToState(prev, newItem);
    });

    // Synchronisation différée pour éviter les appels multiples
    debouncedSync();
  }, [debouncedSync]);

  // Synchronisation automatique lors des changements d'auth
  useEffect(() => {
    if (user && state.hasChanges) {
      syncWithServer();
    }
  }, [user?.id, state.hasChanges]);

  return {
    items: state.items,
    totalPrice: state.totalPrice,
    isLoading: state.isLoading,
    hasChanges: state.hasChanges,
    addItem,
    updateQuantity,
    removeItem,
    syncWithServer
  };
}
```

## Checklist de validation

### Avant commit
- [ ] Toutes les fonctions publiques ont une JSDoc complète
- [ ] Aucun commentaire évident (Set, Get, Create sans contexte)
- [ ] Les TODO/FIXME ont un contexte et un responsable
- [ ] Les commentaires de sécurité suivent le format standardisé
- [ ] Aucun mélange français/anglais inapproprié
- [ ] Les exemples de code compilent et fonctionnent

### Review checklist
- [ ] Les commentaires expliquent le POURQUOI, pas le QUOI
- [ ] La documentation JSDoc est cohérente avec l'implémentation
- [ ] Les cas d'erreur sont documentés avec `@throws`
- [ ] Les exemples d'usage sont pratiques et réalistes
- [ ] Les commentaires de performance incluent des métriques
- [ ] Les décisions d'architecture sont justifiées

### Métriques cibles
- **Couverture JSDoc**: > 95% pour les Server Actions
- **Commentaires évidents**: < 5% du total des commentaires
- **TODOs documentés**: 100% avec contexte et responsable
- **Commentaires obsolètes**: 0 (vérification automatique)

## Outils de validation

### Scripts disponibles
```bash
# Audit complet avec rapport HTML
node scripts/comment-audit.js --report=html

# Analyse rapide
./scripts/quick-comment-check.sh --summary

# Corrections automatiques (TODOs vides, etc.)
node scripts/comment-audit.js --fix

# Validation ESLint des commentaires
npm run lint:comments
```

### Intégration CI/CD
```yaml
# .github/workflows/comment-quality.yml
- name: Vérifier qualité des commentaires
  run: |
    node scripts/comment-audit.js
    if [ $? -ne 0 ]; then
      echo "❌ Standards de commentaires non respectés"
      exit 1
    fi
```

---

**Maintenu par**: Équipe DevEx HerbisVeritas  
**Dernière mise à jour**: 2025-08-15  
**Version**: 1.0