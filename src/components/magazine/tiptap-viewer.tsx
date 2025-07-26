"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

import { cn } from "@/lib/utils";
import { TipTapContent } from "@/types/magazine";

interface TipTapViewerProps {
  content: TipTapContent | string; // Accepter aussi les chaînes JSON
  className?: string;
}

export function TipTapViewer({ content, className }: TipTapViewerProps) {
  // Assurer que le contenu est un objet JSON et non une chaîne
  let parsedContent: TipTapContent;
  try {
    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = content;
    }
  } catch (error) {
    console.error("Erreur lors du parsing du contenu TipTap:", error);
    parsedContent = { type: "doc", content: [] };
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto shadow-sm my-4",
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline transition-colors",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "bg-yellow-200 px-1 rounded",
        },
      }),
      Underline,
      Subscript,
      Superscript,
    ],
    content: parsedContent,
    editable: false,
    immediatelyRender: false, // Fix SSR hydration issues
    editorProps: {
      attributes: {
        class: cn(
          // Base prose styles
          "prose prose-lg max-w-none",
          // Headings
          "prose-headings:font-bold prose-headings:text-gray-900 prose-headings:tracking-tight",
          "prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8",
          "prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8",
          "prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6",
          // Paragraphs
          "prose-p:text-gray-700 prose-p:leading-relaxed prose-p:text-lg prose-p:mb-4",
          // Links
          "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:transition-colors",
          // Strong and emphasis
          "prose-strong:text-gray-900 prose-strong:font-semibold",
          "prose-em:text-gray-700 prose-em:italic",
          // Code
          "prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm",
          "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto",
          // Blockquotes
          "prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-6 prose-blockquote:py-4 prose-blockquote:my-6 prose-blockquote:rounded-r-lg",
          "prose-blockquote:text-gray-700 prose-blockquote:italic",
          // Lists
          "prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4",
          "prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4",
          "prose-li:text-gray-700 prose-li:mb-2 prose-li:leading-relaxed",
          // Images
          "prose-img:rounded-lg prose-img:shadow-sm prose-img:my-6",
          // Tables (if needed)
          "prose-table:w-full prose-table:border-collapse prose-table:my-6",
          "prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-3 prose-th:text-left prose-th:font-semibold",
          "prose-td:border prose-td:border-gray-300 prose-td:p-3",
          // HR
          "prose-hr:border-gray-300 prose-hr:my-8",
          // Custom spacing
          "space-y-4",
          className
        ),
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="text-gray-500">Chargement du contenu...</div>
      </div>
    );
  }

  return (
    <div className="article-content">
      <EditorContent editor={editor} />
    </div>
  );
}

// Hook pour extraire du texte simple depuis le JSON TipTap
export function useExtractPlainText(content: TipTapContent | string): string {
  let parsedContent: TipTapContent;
  try {
    if (typeof content === "string") {
      parsedContent = JSON.parse(content);
    } else {
      parsedContent = content;
    }
  } catch (_error) {
    return "";
  }

  if (!parsedContent || !parsedContent.content) return "";

  const extractText = (node: TipTapContent): string => {
    if (node.text) return node.text;
    if (node.content) return node.content.map(extractText).join(" ");
    return "";
  };

  return extractText(parsedContent);
}

// Hook pour extraire le premier paragraphe comme extrait
export function useExtractExcerpt(
  content: TipTapContent | string,
  maxLength: number = 160
): string {
  const plainText = useExtractPlainText(content);

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.substring(0, maxLength).trim() + "...";
}

// Composant léger pour afficher juste un extrait
interface ArticleExcerptProps {
  content: TipTapContent | string;
  maxLength?: number;
  className?: string;
}

export function ArticleExcerpt({ content, maxLength = 160, className }: ArticleExcerptProps) {
  const excerpt = useExtractExcerpt(content, maxLength);

  return <p className={cn("leading-relaxed text-gray-600", className)}>{excerpt}</p>;
}
