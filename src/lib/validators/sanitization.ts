/**
 * Input Sanitization Utilities for Security Hardening
 * Prevents XSS, HTML injection, and other input-based attacks
 */

import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(
  input: string,
  allowedTags: string[] = [],
): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: ["href", "title", "alt", "src"],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ["script", "object", "embed", "form", "input"],
    STRIP_COMMENTS: true,
  });
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

/**
 * Zod transformer for automatic HTML sanitization
 */
export const sanitizedString = (allowedTags: string[] = []) =>
  z.string().transform((val) => sanitizeHtml(val, allowedTags));

/**
 * Zod transformer for plain text sanitization
 */
export const sanitizedText = () =>
  z.string().transform((val) => sanitizeText(val));

/**
 * Advanced validation for specific content types
 */
export const validationSchemas = {
  // Product names, descriptions (allow basic formatting)
  productContent: sanitizedString(["b", "i", "em", "strong", "p", "br"]),

  // User input (strict - no HTML)
  userInput: sanitizedText(),

  // Email addresses (with additional validation)
  email: z
    .string()
    .email("Invalid email format")
    .transform((val) => val.toLowerCase().trim())
    .refine(
      (val) => !val.includes("<") && !val.includes(">"),
      "Invalid characters in email",
    ),

  // URLs (strict validation)
  url: z
    .string()
    .url("Invalid URL format")
    .refine((val) => {
      try {
        const url = new URL(val);
        return ["http:", "https:"].includes(url.protocol);
      } catch {
        return false;
      }
    }, "Only HTTP/HTTPS URLs allowed"),
};

/**
 * File upload security validation
 */
export const fileValidation = {
  // Image files
  image: z
    .custom<File>()
    .refine(
      (file) => file.size <= 4 * 1024 * 1024,
      "File must be less than 4MB",
    )
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ),
      "Only JPEG, PNG, WebP, and GIF files are allowed",
    )
    .refine(
      (file) => !/[<>:"\\|?*]/.test(file.name),
      "Filename contains invalid characters",
    ),

  // Document files
  document: z
    .custom<File>()
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      "File must be less than 10MB",
    )
    .refine(
      (file) => ["application/pdf", "text/plain"].includes(file.type),
      "Only PDF and text files are allowed",
    ),
};

/**
 * SQL injection prevention helpers
 */
export const sqlSafeValidation = {
  // Database identifiers (table names, column names)
  identifier: z
    .string()
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Invalid identifier format")
    .max(63, "Identifier too long"),

  // Search terms (prevent SQL injection in LIKE queries)
  searchTerm: z
    .string()
    .transform((val) => val.replace(/[%_\\]/g, "\\$&"))
    .max(100, "Search term too long"),
};
