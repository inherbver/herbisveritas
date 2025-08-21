import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <header className="text-center">
        <Skeleton className="mx-auto mb-4 h-12 w-64" />
        <Skeleton className="mx-auto h-4 w-96" />
      </header>

      {/* Filters */}
      <section className="flex flex-wrap gap-4 border-b pb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-36" />
        <div className="ml-auto">
          <Skeleton className="h-10 w-40" />
        </div>
      </section>

      {/* Product grid */}
      <main>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Load more button */}
      <footer className="text-center pt-8">
        <Skeleton className="mx-auto h-10 w-32" />
      </footer>
    </div>
  );
}
