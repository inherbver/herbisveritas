import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserDetailLoading() {
  return (
    <main className="container mx-auto space-y-6 py-8">
      <header className="flex items-center justify-between">
        <nav className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <hgroup>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </hgroup>
        </nav>
        <section className="flex items-center gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </section>
      </header>

      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <Skeleton className="mb-2 h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <article className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </article>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
