"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
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

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Highlighter as HighlightIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo,
  Redo,
} from "lucide-react";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TipTapContent } from "@/types/magazine";
import { ImageUpload } from "./image-upload";
import { uploadMagazineImage } from "@/actions/magazineActions";

interface TipTapEditorProps {
  content?: TipTapContent;
  onChange?: (content: TipTapContent) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

// Fonction utilitaire pour convertir un blob en base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export function TipTapEditor({
  content,
  onChange,
  placeholder = "Commencez à écrire votre article...",
  className,
  editable = true,
}: TipTapEditorProps) {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // Fonction pour gérer l'upload d'images via drag/drop ou paste
  // Note: Cette fonction sera redéfinie après l'initialisation de l'editor
  const handleFileUpload = useCallback(
    async (files: FileList, editorInstance?: Editor) => {
      const file = files[0];
      console.log("🔄 [TipTap] handleFileUpload appelé avec:", {
        fileName: file?.name,
        fileType: file?.type,
      });

      if (!file || !file.type.startsWith("image/")) {
        console.warn("⚠️ [TipTap] Fichier invalide ou pas une image");
        return;
      }

      const currentEditor = editorInstance;
      if (!currentEditor) {
        console.error("❌ [TipTap] Editor non disponible");
        return;
      }

      try {
        // Upload direct vers le serveur sans base64 temporaire
        console.log("☁️ [TipTap] Upload direct vers serveur");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileName", file.name.split(".")[0]);

        const result = await uploadMagazineImage(formData);
        console.log("✅ [TipTap] Résultat upload serveur:", result);

        if (result.success && result.data?.url) {
          console.log("📝 [TipTap] Insertion image avec URL serveur:", result.data.url);

          // Insérer directement l'image avec l'URL du serveur
          currentEditor
            .chain()
            .focus()
            .setImage({
              src: result.data.url,
              alt: file.name.split(".")[0],
              title: file.name.split(".")[0],
            })
            .run();

          // Forcer la synchronisation avec un délai minimal
          setTimeout(() => {
            if (currentEditor && onChange) {
              const currentContent = currentEditor.getJSON();
              console.log(
                "💾 [TipTap] Contenu final après upload:",
                JSON.stringify(currentContent, null, 2)
              );
              onChange(currentContent);
            }
          }, 100);
        } else {
          console.error("❌ [TipTap] Échec upload serveur:", result);
          // En cas d'erreur, on peut optionnellement afficher l'image en base64
          const base64 = await blobToBase64(file);
          currentEditor
            .chain()
            .focus()
            .setImage({
              src: base64,
              alt: file.name.split(".")[0] + " (erreur upload)",
              title: "Image non sauvegardée - réessayez",
            })
            .run();
        }
      } catch (error) {
        console.error("💥 [TipTap] Erreur lors de l'upload d'image:", error);
        // En cas d'erreur, afficher en base64 avec indication d'erreur
        try {
          const base64 = await blobToBase64(file);
          currentEditor
            .chain()
            .focus()
            .setImage({
              src: base64,
              alt: file.name.split(".")[0] + " (erreur upload)",
              title: "Image non sauvegardée - réessayez",
            })
            .run();
        } catch {
          console.error("❌ [TipTap] Impossible de traiter l'image");
        }
      }
    },
    [onChange]
  );

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

  const addLink = useCallback(() => {
    if (!linkUrl) return;

    if (editor) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }

    setLinkUrl("");
    setIsLinkDialogOpen(false);
  }, [editor, linkUrl]);

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

  const removeLink = useCallback(() => {
    if (editor) {
      editor.chain().focus().unsetLink().run();
    }
  }, [editor]);

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
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b p-2">
        {/* Text formatting */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bold")}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Gras"
        >
          <Bold className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("italic")}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italique"
        >
          <Italic className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("underline")}
          onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
          aria-label="Souligné"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("strike")}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          aria-label="Barré"
        >
          <Strikethrough className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("code")}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("highlight")}
          onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
          aria-label="Surligner"
        >
          <HighlightIcon className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-8" />

        {/* Headings */}
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label="Titre 1"
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label="Titre 2"
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          aria-label="Titre 3"
        >
          <Heading3 className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-8" />

        {/* Lists and Quote */}
        <Toggle
          size="sm"
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Liste à puces"
        >
          <List className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
          aria-label="Liste numérotée"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("blockquote")}
          onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
          aria-label="Citation"
        >
          <Quote className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-8" />

        {/* Text alignment */}
        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "left" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
          aria-label="Aligner à gauche"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "center" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
          aria-label="Centrer"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "right" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
          aria-label="Aligner à droite"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive({ textAlign: "justify" })}
          onPressedChange={() => editor.chain().focus().setTextAlign("justify").run()}
          aria-label="Justifier"
        >
          <AlignJustify className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-8" />

        {/* Subscript/Superscript */}
        <Toggle
          size="sm"
          pressed={editor.isActive("subscript")}
          onPressedChange={() => editor.chain().focus().toggleSubscript().run()}
          aria-label="Indice"
        >
          <SubscriptIcon className="h-4 w-4" />
        </Toggle>

        <Toggle
          size="sm"
          pressed={editor.isActive("superscript")}
          onPressedChange={() => editor.chain().focus().toggleSuperscript().run()}
          aria-label="Exposant"
        >
          <SuperscriptIcon className="h-4 w-4" />
        </Toggle>

        <Separator orientation="vertical" className="h-8" />

        {/* Link */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(editor.isActive("link") && "bg-gray-200")}
              aria-label="Lien"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un lien</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addLink} disabled={!linkUrl}>
                  Ajouter
                </Button>
                {editor.isActive("link") && (
                  <Button variant="outline" onClick={removeLink}>
                    Supprimer le lien
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image Upload */}
        <ImageUpload
          onImageSelect={handleImageSelect}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              aria-label="Image"
              type="button"
              onClick={() => {}} // Le onClick sera géré par DialogTrigger
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          }
          maxSizeInMB={4}
        />

        <Separator orientation="vertical" className="h-8" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Annuler"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Refaire"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor Content */}
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
