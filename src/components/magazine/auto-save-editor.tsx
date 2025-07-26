"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TipTapEditor } from "./tiptap-editor";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TipTapContent } from "@/types/magazine";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveEditorProps {
  content?: TipTapContent;
  onChange?: (content: TipTapContent) => void;
  onAutoSave?: (content: TipTapContent) => Promise<void>;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  autoSaveInterval?: number; // en millisecondes
  storageKey?: string; // pour localStorage
}

export function AutoSaveEditor({
  content,
  onChange,
  onAutoSave,
  placeholder,
  className,
  editable = true,
  autoSaveInterval = 30000, // 30 secondes
  storageKey = "article-draft",
}: AutoSaveEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const contentRef = useRef(content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction de sauvegarde automatique
  const performAutoSave = useCallback(
    async (currentContent: TipTapContent) => {
      if (!currentContent || !onAutoSave) return;

      try {
        setSaveStatus("saving");

        // Sauvegarde locale en premier
        if (storageKey) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              content: currentContent,
              timestamp: new Date().toISOString(),
            })
          );
        }

        // Sauvegarde serveur si fonction fournie
        await onAutoSave(currentContent);

        setSaveStatus("saved");
        setLastSaved(new Date());

        // Retour à idle après 2 secondes
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Erreur lors de la sauvegarde automatique:", error);
        setSaveStatus("error");

        // Retour à idle après 3 secondes
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [onAutoSave, storageKey]
  );

  // Gestion des changements de contenu
  const handleContentChange = useCallback(
    (newContent: TipTapContent) => {
      contentRef.current = newContent;

      // Appel du onChange externe
      if (onChange) {
        onChange(newContent);
      }

      // Programmation de la sauvegarde automatique
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        performAutoSave(newContent);
      }, autoSaveInterval);
    },
    [onChange, performAutoSave, autoSaveInterval]
  );

  // Sauvegarde lors du déchargement de la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (contentRef.current && storageKey) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            content: contentRef.current,
            timestamp: new Date().toISOString(),
          })
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [storageKey]);

  // Restauration du contenu depuis localStorage
  useEffect(() => {
    if (!content && storageKey) {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const { content: _savedContent, timestamp } = JSON.parse(savedData);
          // Vous pouvez ajouter une logique pour demander à l'utilisateur
          // s'il veut restaurer le contenu sauvegardé
          console.log("Contenu sauvegardé trouvé:", { timestamp });
        }
      } catch (error) {
        console.error("Erreur lors de la restauration:", error);
      }
    }
  }, [content, storageKey]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Fonction pour supprimer le brouillon sauvegardé
  const clearSavedDraft = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Formatage de la date de dernière sauvegarde
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "à l'instant";
    if (diffMinutes === 1) return "il y a 1 minute";
    if (diffMinutes < 60) return `il y a ${diffMinutes} minutes`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return "il y a 1 heure";
    if (diffHours < 24) return `il y a ${diffHours} heures`;

    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-2">
      {/* Indicateur de statut de sauvegarde */}
      {editable && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                saveStatus === "saved"
                  ? "default"
                  : saveStatus === "saving"
                    ? "secondary"
                    : saveStatus === "error"
                      ? "destructive"
                      : "outline"
              }
              className={cn("text-xs", saveStatus === "saving" && "animate-pulse")}
            >
              {saveStatus === "saving" && <Clock className="mr-1 h-3 w-3" />}
              {saveStatus === "saved" && <CheckCircle className="mr-1 h-3 w-3" />}
              {saveStatus === "error" && <AlertCircle className="mr-1 h-3 w-3" />}

              {saveStatus === "idle" && "Prêt"}
              {saveStatus === "saving" && "Sauvegarde..."}
              {saveStatus === "saved" && "Sauvegardé"}
              {saveStatus === "error" && "Erreur de sauvegarde"}
            </Badge>

            {lastSaved && saveStatus !== "saving" && (
              <span className="text-xs text-gray-500">Sauvegardé {formatLastSaved(lastSaved)}</span>
            )}
          </div>

          {/* Actions supplémentaires */}
          <div className="flex items-center gap-2">
            {storageKey && (
              <button
                onClick={clearSavedDraft}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                Effacer le brouillon
              </button>
            )}
          </div>
        </div>
      )}

      {/* Éditeur TipTap */}
      <TipTapEditor
        content={content}
        onChange={handleContentChange}
        placeholder={placeholder}
        className={className}
        editable={editable}
      />
    </div>
  );
}

// Hook pour gérer la restauration de brouillons
export function useRestoreDraft(storageKey: string) {
  const [savedDraft, setSavedDraft] = useState<{
    content: TipTapContent;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setSavedDraft(parsedData);
      }
    } catch (error) {
      console.error("Erreur lors de la restauration du brouillon:", error);
    }
  }, [storageKey]);

  const restoreDraft = useCallback(() => {
    return savedDraft?.content || null;
  }, [savedDraft]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSavedDraft(null);
  }, [storageKey]);

  const hasDraft = savedDraft !== null;
  const draftAge = savedDraft ? new Date().getTime() - new Date(savedDraft.timestamp).getTime() : 0;

  return {
    hasDraft,
    draftAge,
    savedDraft,
    restoreDraft,
    clearDraft,
  };
}
