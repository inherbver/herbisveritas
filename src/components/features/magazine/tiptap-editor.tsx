"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import FileHandler from "@tiptap/extension-file-handler";
import { generateHTML } from "@tiptap/html";

import { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TipTapContent } from "@/types/magazine";
import { EditorToolbar } from "./editor/EditorToolbar";
import { createFileUploadHandler } from "./editor/FileUploadHandler";

interface TipTapEditorProps {
  content?: TipTapContent;
  onChange?: (content: TipTapContent) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = "Commencez à écrire votre article...",
  className,
  editable = true,
}: TipTapEditorProps) {
  // Créer le gestionnaire d'upload de fichiers
  const handleFileUpload = createFileUploadHandler({ onChange });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Désactiver les extensions que nous redéfinissons
        link: false,
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto shadow-sm my-4",
        },
        allowBase64: true,
        inline: false,
      }),
      FileHandler.configure({
        allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        onDrop: (currentEditor, files, _pos) => {
          console.log("🎯 [TipTap] FileHandler onDrop déclenché");
          // Convertir File[] vers FileList-like object
          const fileList = {
            ...files,
            item: (index: number) => files[index] || null,
            length: files.length,
          } as FileList;
          handleFileUpload(fileList, currentEditor);
        },
        onPaste: (currentEditor, files, _event) => {
          console.log("📋 [TipTap] FileHandler onPaste déclenché");
          // Convertir File[] vers FileList-like object
          const fileList = {
            ...files,
            item: (index: number) => files[index] || null,
            length: files.length,
          } as FileList;
          handleFileUpload(fileList, currentEditor);
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 hover:text-blue-800 underline",
        },
      }),
      Placeholder.configure({
        placeholder,
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
    content,
    editable,
    immediatelyRender: false, // Fix SSR hydration issues
    onUpdate: ({ editor }) => {
      const currentContent = editor.getJSON();
      console.log(
        "🔄 [TipTap] onUpdate déclenché, contenu:",
        JSON.stringify(currentContent, null, 2)
      );
      if (onChange) {
        console.log("📤 [TipTap] Appel onChange depuis onUpdate");
        onChange(currentContent);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
          "prose-headings:font-bold prose-headings:text-gray-900",
          "prose-p:text-gray-700 prose-p:leading-relaxed",
          "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
          "prose-strong:text-gray-900 prose-strong:font-semibold",
          "prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:rounded",
          "prose-pre:bg-gray-900 prose-pre:text-gray-100",
          "prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4",
          "prose-ul:list-disc prose-ol:list-decimal",
          "prose-li:text-gray-700",
          "prose-img:rounded-lg prose-img:shadow-sm",
          "min-h-[300px] max-w-none w-full p-4",
          className
        ),
      },
      // Removed custom paste handler to avoid conflicts with FileHandler
    },
  });

  // Auto-save functionality (could be enhanced with debouncing)
  useEffect(() => {
    if (!editor || !onChange) return;

    const saveInterval = setInterval(() => {
      const _content = editor.getJSON();
      // Here you could implement auto-save to localStorage or server
      // localStorage.setItem('article-draft', JSON.stringify(content));
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [editor, onChange]);

  const handleImageSelect = useCallback(
    (imageUrl: string, altText?: string) => {
      console.log("🖼️ [TipTap] handleImageSelect appelé avec URL:", imageUrl);
      if (editor && imageUrl) {
        // S'assurer que l'editor a le focus et insérer l'image avec tous les attributs
        console.log("📝 [TipTap] Insertion image via handleImageSelect");
        editor
          .chain()
          .focus()
          .setImage({
            src: imageUrl,
            alt: altText || "",
            title: altText || "",
          })
          .run();

        // Forcer la synchronisation du contenu après l'insertion d'image
        setTimeout(() => {
          if (onChange && editor) {
            const updatedContent = editor.getJSON();
            console.log(
              "💾 [TipTap] handleImageSelect - déclenchement onChange:",
              JSON.stringify(updatedContent, null, 2)
            );
            onChange(updatedContent);
          }
        }, 100);
      }
    },
    [editor, onChange]
  );

  if (!editor) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-md border">
        <div className="text-gray-500">Chargement de l'éditeur...</div>
      </div>
    );
  }

  if (!editable) {
    return (
      <div className={cn("prose prose-sm max-w-none sm:prose-base", className)}>
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <EditorToolbar editor={editor} onImageSelect={handleImageSelect} />
      <EditorContent editor={editor} className="min-h-[300px] focus-within:outline-none" />
    </div>
  );
}

// Utility function to generate HTML from TipTap JSON
export function generateHTMLFromJSON(json: TipTapContent): string {
  return generateHTML(json, [
    StarterKit,
    Image,
    Link,
    TextAlign,
    Highlight,
    Underline,
    Subscript,
    Superscript,
    FileHandler,
  ]);
}

// Utility function to get plain text from TipTap JSON
export function getPlainTextFromJSON(json: TipTapContent): string {
  if (!json || !json.content) return "";

  const extractText = (node: TipTapContent): string => {
    if (node.text) return node.text;
    if (node.content) return node.content.map(extractText).join(" ");
    return "";
  };

  return extractText(json);
}
