# 📋 CONVENTIONS DE CODE - ARCHITECTURE PRAGMATIQUE

## 🏗️ PRINCIPES ARCHITECTURAUX

### 1. **Pragmatic over Pure**

- Choisir la simplicité quand ça marche
- Ajouter de la complexité uniquement quand nécessaire
- Préférer les solutions Next.js natives

### 2. **Server-First Architecture**

- Server Components par défaut
- Client Components uniquement pour l'interactivité
- Server Actions pour toutes les mutations

### 3. **Co-location des Concerns**

- Un service = toute la logique d'un domaine
- Un repository = tous les accès data d'une entité
- Un action = toute l'orchestration d'un use case

## 📁 ORGANISATION DES FICHIERS

### Structure Standard

```
src/lib/
├── actions/              # Server Actions (orchestration)
│   ├── magazine-actions.ts
│   ├── cart-actions.ts
│   └── user-actions.ts
├── services/             # Business Logic (domaine métier)
│   ├── magazine.service.ts
│   ├── cart.service.ts
│   └── user.service.ts
├── repositories/         # Data Access (Supabase)
│   ├── magazine.repository.ts
│   ├── cart.repository.ts
│   └── user.repository.ts
├── types/               # Business Types
└── validators/          # Zod Schemas
```

### Nommage des Fichiers

- **Services**: `[domain].service.ts`
- **Actions**: `[domain]-actions.ts`
- **Repositories**: `[domain].repository.ts`
- **Types**: `[domain].types.ts`
- **Validators**: `[domain].validator.ts`

## 🔧 PATTERNS DE CODE

### 1. Service Pattern

```typescript
// ✅ BON - Service unifié
export class MagazineService {
  // Toute la logique métier des articles
  async createArticle(data: CreateArticleData): Promise<Article>;
  async updateArticle(id: string, data: UpdateArticleData): Promise<Article>;
  async publishArticle(id: string): Promise<Article>;
  async searchArticles(query: string): Promise<Article[]>;
  async incrementViewCount(id: string): Promise<void>;
}

// ❌ MAUVAIS - Services micro-découpés
export class ArticleCrudService {
  /* 50 lignes */
}
export class ArticleSearchService {
  /* 30 lignes */
}
export class ArticleAnalyticsService {
  /* 25 lignes */
}
export class ArticleSeoService {
  /* 40 lignes */
}
// ... 8 services pour une seule entité !
```

### 2. Server Action Pattern

```typescript
// ✅ BON - Action avec validation et orchestration
"use server";

export async function createArticleAction(
  prevState: any,
  formData: FormData
): Promise<ActionResult> {
  try {
    // 1. Authentication
    const user = await getUser();
    if (!user) return { success: false, message: "Non connecté" };

    // 2. Validation
    const result = CreateArticleSchema.safeParse(formData);
    if (!result.success) return { success: false, errors: result.error };

    // 3. Business Logic
    const article = await magazineService.createArticle(user.id, result.data);

    // 4. Cache Revalidation
    revalidateTag("articles");

    return { success: true, data: article };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
```

### 3. Repository Pattern

```typescript
// ✅ BON - Repository avec méthodes métier
export class MagazineRepository {
  async create(data: CreateArticleData): Promise<Article>;
  async getById(id: string): Promise<Article | null>;
  async search(query: string, filters: ArticleFilters): Promise<Article[]>;
  async incrementCounter(id: string, field: string): Promise<void>;
}

// ❌ MAUVAIS - Repository générique abstrait
export interface IRepository<T> {
  create(entity: T): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## 📝 CONVENTIONS DE CODE

### 1. **Naming Conventions**

```typescript
// Variables et fonctions: camelCase
const articleService = new ArticleService();
const publishedArticles = await getPublishedArticles();

// Classes et Types: PascalCase
class MagazineService {}
interface Article {}
type ArticleStatus = "draft" | "published";

// Constants: SCREAMING_SNAKE_CASE
const MAX_ARTICLES_PER_PAGE = 20;
const DEFAULT_ARTICLE_STATUS = "draft";

// Files: kebab-case
magazine - actions.ts;
article.service.ts;
user - profile.component.tsx;
```

### 2. **Function Signatures**

```typescript
// ✅ BON - Paramètres explicites
async function createArticle(authorId: string, data: CreateArticleData): Promise<Article>;

async function searchArticles(
  query?: string,
  options: SearchOptions = {}
): Promise<{ articles: Article[]; total: number }>;

// ❌ MAUVAIS - Paramètres flous
async function create(data: any): Promise<any>;
async function search(...args: any[]): Promise<any>;
```

### 3. **Error Handling**

```typescript
// ✅ BON - Erreurs métier typées
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// Dans le service
if (article.status === "archived") {
  throw new BusinessError("Article archivé non modifiable");
}

// Dans l'action
try {
  const article = await magazineService.createArticle(data);
  return { success: true, data: article };
} catch (error) {
  if (error instanceof BusinessError) {
    return { success: false, message: error.message };
  }
  console.error("Unexpected error:", error);
  return { success: false, message: "Erreur technique" };
}
```

### 4. **Validation avec Zod**

```typescript
// ✅ BON - Schémas réutilisables
const CreateArticleSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(100),
  type: z.enum(["blog", "news", "guide"]),
  status: z.enum(["draft", "published"]).default("draft"),
  tags: z.array(z.string()).max(10).optional(),
});

export type CreateArticleData = z.infer<typeof CreateArticleSchema>;

// Usage dans action
const validation = CreateArticleSchema.safeParse(formData);
if (!validation.success) {
  return {
    success: false,
    errors: validation.error.flatten().fieldErrors,
  };
}
```

## 🎨 COMPOSANTS REACT

### 1. **Server Components par défaut**

```tsx
// ✅ BON - Server Component
export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await magazineService.getArticleBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <div>
      <h1>{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
      <LikeButton articleId={article.id} initialLikes={article.like_count} />
    </div>
  );
}
```

### 2. **Client Components ciblés**

```tsx
// ✅ BON - Client Component minimal
"use client";

import { useFormState } from "react-dom";
import { likeArticleAction } from "@/lib/actions/magazine-actions";

export function LikeButton({
  articleId,
  initialLikes,
}: {
  articleId: string;
  initialLikes: number;
}) {
  const [state, formAction] = useFormState(likeArticleAction, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={articleId} />
      <button type="submit">❤️ {state?.data?.likes ?? initialLikes}</button>
    </form>
  );
}
```

### 3. **Formulaires avec Server Actions**

```tsx
// ✅ BON - Formulaire Server Action
"use client";

import { useFormState } from "react-dom";
import { createArticleAction } from "@/lib/actions/magazine-actions";

export function ArticleForm() {
  const [state, formAction] = useFormState(createArticleAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input
        name="title"
        placeholder="Titre de l'article"
        required
        className={state?.errors?.title ? "border-red-500" : ""}
      />
      {state?.errors?.title && <p className="text-sm text-red-500">{state.errors.title[0]}</p>}

      <textarea
        name="content"
        placeholder="Contenu de l'article"
        required
        className="min-h-[300px]"
      />

      <div className="flex gap-2">
        <button type="submit" name="action" value="draft">
          Sauvegarder brouillon
        </button>
        <button type="submit" name="action" value="published">
          Publier
        </button>
      </div>

      {state?.message && (
        <div className={state.success ? "text-green-600" : "text-red-600"}>{state.message}</div>
      )}
    </form>
  );
}
```

## 🧪 PATTERNS DE TEST

### 1. **Tests de Service**

```typescript
// tests/services/magazine.service.test.ts
describe("MagazineService", () => {
  let service: MagazineService;
  let mockRepo: jest.Mocked<MagazineRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new MagazineService(mockRepo);
  });

  describe("createArticle", () => {
    it("should create article with generated slug", async () => {
      const articleData = {
        title: "Mon Article Test",
        content: "Contenu de test...",
        type: "blog" as const,
      };

      mockRepo.create.mockResolvedValue(mockArticle);

      const result = await service.createArticle("user-id", articleData);

      expect(result.slug).toBe("mon-article-test");
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...articleData,
          slug: "mon-article-test",
          author_id: "user-id",
        })
      );
    });

    it("should throw ValidationError for short title", async () => {
      const articleData = {
        title: "Test",
        content: "Contenu de test...",
        type: "blog" as const,
      };

      await expect(service.createArticle("user-id", articleData)).rejects.toThrow(
        "Le titre doit contenir au moins 5 caractères"
      );
    });
  });
});
```

### 2. **Tests d'Actions**

```typescript
// tests/actions/magazine-actions.test.ts
describe("createArticleAction", () => {
  it("should create article successfully", async () => {
    const formData = new FormData();
    formData.append("title", "Mon Article Test");
    formData.append("content", "Contenu de test très long...");
    formData.append("type", "blog");

    mockGetUser.mockResolvedValue({ id: "user-id" });
    mockMagazineService.createArticle.mockResolvedValue(mockArticle);

    const result = await createArticleAction(null, formData);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockArticle);
  });

  it("should return error for unauthenticated user", async () => {
    const formData = new FormData();
    mockGetUser.mockResolvedValue(null);

    const result = await createArticleAction(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Vous devez être connecté pour créer un article");
  });
});
```

## 🚀 BONNES PRATIQUES

### 1. **Cache Strategy**

```typescript
// ✅ BON - Tags de cache granulaires
revalidateTag("articles"); // Toutes les listes
revalidateTag(`article-${article.id}`); // Article spécifique par ID
revalidateTag(`article-${article.slug}`); // Article spécifique par slug
```

### 2. **Error Boundaries**

```tsx
// components/shared/ErrorBoundary.tsx
"use client";

export function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 text-center">
      <h2>Une erreur est survenue</h2>
      <p className="text-gray-600">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded bg-blue-500 px-4 py-2 text-white">
        Réessayer
      </button>
    </div>
  );
}
```

### 3. **Loading States**

```tsx
// app/admin/magazine/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 animate-pulse rounded bg-gray-200" />
      <div className="h-32 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
```

## 📊 MÉTRIQUES DE QUALITÉ

### Code Quality Targets

- **Cyclomatic Complexity**: < 10 par fonction
- **File Size**: < 300 lignes par fichier
- **Function Size**: < 50 lignes par fonction
- **Dependencies**: < 5 services par action
- **Test Coverage**: > 80% sur services et actions critiques

### Architecture Metrics

- **Services par domaine**: 1 service principal max
- **Methods par service**: 5-15 methods max
- **Abstractions layers**: 3 layers max (Action → Service → Repository)
- **Import depth**: < 3 levels
