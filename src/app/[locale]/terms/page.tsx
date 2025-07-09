import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section } from "@/components/layout/section";

// Revalidate the page every hour to fetch potential updates
export const revalidate = 3600;

/**
 * Fetches the content for a legal document from Supabase.
 * @param slug The slug of the document to fetch (e.g., 'terms').
 * @returns The document data or null if not found.
 */
async function getLegalDocument(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("title, content")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(`Error fetching legal document '${slug}':`, error.message);
    return null;
  }

  return data;
}

export default async function TermsPage() {
  const terms = await getLegalDocument("terms");

  if (!terms || !terms.content) {
    notFound();
  }

  return (
    <main className="py-12 md:py-24">
      <Section>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl dark:text-gray-100">
          {terms.title}
        </h1>
        <article className="prose prose-lg mx-auto mt-8 max-w-none dark:prose-invert md:mt-12">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{terms.content}</ReactMarkdown>
        </article>
      </Section>
    </main>
  );
}
