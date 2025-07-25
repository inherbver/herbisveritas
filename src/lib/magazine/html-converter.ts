import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";

// Extensions compatibles serveur (sans TextAlign qui pose problème)
const extensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    // Désactiver les extensions en doublon dans StarterKit
    link: false, // On utilise notre propre Link
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
  Highlight.configure({
    HTMLAttributes: {
      class: "bg-yellow-200 px-1 rounded",
    },
  }),
  Underline,
  Subscript,
  Superscript,
];

/**
 * Convertit le JSON TipTap en HTML
 * Utilisable côté serveur dans les Server Actions
 */
export function convertTipTapToHTML(content: any): string {
  if (!content || !content.content) return "";
  
  // Utilisation temporaire du fallback pour éviter les erreurs d'extensions serveur
  // TODO: Réactiver generateHTML une fois les extensions serveur corrigées
  try {
    return convertToBasicHTML(content);
  } catch (error) {
    console.error("Erreur lors de la conversion TipTap → HTML:", error);
    return "";
  }
  
  /* Version avec generateHTML (à réactiver plus tard)
  try {
    return generateHTML(content, extensions);
  } catch (error) {
    console.error("Erreur lors de la conversion TipTap → HTML:", error);
    
    // Fallback vers conversion basique
    return convertToBasicHTML(content);
  }
  */
}

/**
 * Conversion basique en cas d'erreur avec TipTap
 */
function convertToBasicHTML(content: any): string {
  if (!content || !content.content) return "";
  
  const renderNode = (node: any): string => {
    if (node.text) {
      let text = node.text;
      
      // Application des marques (formatage)
      if (node.marks) {
        node.marks.forEach((mark: any) => {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code class="bg-purple-50 text-purple-600 px-1 rounded">${text}</code>`;
              break;
            case "highlight":
              text = `<mark class="bg-yellow-200 px-1 rounded">${text}</mark>`;
              break;
            case "link":
              const href = mark.attrs?.href || "#";
              text = `<a href="${href}" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
              break;
          }
        });
      }
      
      return text;
    }
    
    const innerContent = node.content ? node.content.map(renderNode).join("") : "";
    
    switch (node.type) {
      case "paragraph":
        const alignment = node.attrs?.textAlign;
        const alignClass = alignment ? ` style="text-align: ${alignment}"` : "";
        return `<p${alignClass}>${innerContent}</p>`;
        
      case "heading":
        const level = node.attrs?.level || 1;
        const headingAlign = node.attrs?.textAlign;
        const headingAlignClass = headingAlign ? ` style="text-align: ${headingAlign}"` : "";
        return `<h${level}${headingAlignClass}>${innerContent}</h${level}>`;
        
      case "bulletList":
        return `<ul>${innerContent}</ul>`;
        
      case "orderedList":
        return `<ol>${innerContent}</ol>`;
        
      case "listItem":
        return `<li>${innerContent}</li>`;
        
      case "blockquote":
        return `<blockquote class="border-l-4 border-blue-500 bg-blue-50 pl-6 py-4 my-6 rounded-r-lg italic">${innerContent}</blockquote>`;
        
      case "codeBlock":
        return `<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto"><code>${innerContent}</code></pre>`;
        
      case "hardBreak":
        return "<br>";
        
      case "horizontalRule":
        return '<hr class="border-gray-300 my-8">';
        
      case "image":
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";
        return `<img src="${src}" alt="${alt}" class="rounded-lg max-w-full h-auto shadow-sm my-4">`;
        
      default:
        return innerContent;
    }
  };
  
  return content.content.map(renderNode).join("");
}

/**
 * Extrait le texte brut du JSON TipTap
 */
export function extractPlainText(content: any): string {
  if (!content || !content.content) return "";
  
  const extractText = (node: any): string => {
    if (node.text) return node.text;
    if (node.content) return node.content.map(extractText).join(" ");
    return "";
  };
  
  return extractText(content).replace(/\s+/g, " ").trim();
}

/**
 * Calcule le temps de lecture depuis le JSON TipTap
 */
export function calculateReadingTime(content: any, wordsPerMinute: number = 200): number {
  const text = extractPlainText(content);
  const words = text.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/**
 * Extrait un résumé depuis le JSON TipTap
 */
export function extractExcerpt(content: any, maxLength: number = 160): string {
  const plainText = extractPlainText(content);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Coupe au dernier mot complet
  const truncated = plainText.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }
  
  return truncated + "...";
}