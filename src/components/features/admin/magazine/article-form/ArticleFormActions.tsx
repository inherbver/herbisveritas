"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Eye, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Globe,
  Archive 
} from "lucide-react";

interface ArticleFormActionsProps {
  mode: "create" | "edit";
  status: "draft" | "published" | "archived";
  isDirty: boolean;
  isPending: boolean;
  previewMode: boolean;
  onStatusChange: (status: "draft" | "published" | "archived") => void;
  onPreviewToggle: () => void;
  onSubmit: () => void;
  onAutoSave?: () => void;
}

const STATUS_CONFIG = {
  draft: {
    label: "Brouillon",
    icon: Clock,
    variant: "secondary" as const,
    description: "Article en cours de rédaction",
  },
  published: {
    label: "Publié",
    icon: Globe,
    variant: "default" as const,
    description: "Article visible publiquement",
  },
  archived: {
    label: "Archivé",
    icon: Archive,
    variant: "outline" as const,
    description: "Article retiré de la publication",
  },
};

export function ArticleFormActions({
  mode,
  status,
  isDirty,
  isPending,
  previewMode,
  onStatusChange,
  onPreviewToggle,
  onSubmit,
  onAutoSave,
}: ArticleFormActionsProps) {
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <aside className="space-y-6" role="complementary" aria-label="Actions et paramètres de l'article">
      {/* Statut de l'article */}
      <section>
        <header>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            Statut de publication
          </h3>
        </header>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {statusConfig.description}
            </span>
          </div>

          <div>
            <label htmlFor="status-select" className="text-sm font-medium">
              Changer le statut :
            </label>
            <Select
              value={status}
              onValueChange={onStatusChange}
              disabled={isPending}
            >
              <SelectTrigger id="status-select" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Brouillon
                  </div>
                </SelectItem>
                <SelectItem value="published">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Publié
                  </div>
                </SelectItem>
                <SelectItem value="archived">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archivé
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* État des modifications */}
      {isDirty && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous avez des modifications non sauvegardées.
            {onAutoSave && status === "draft" && (
              <span className="block mt-1 text-sm">
                Auto-sauvegarde activée pour les brouillons.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions principales */}
      <section>
        <header>
          <h3 className="font-semibold mb-3">Actions</h3>
        </header>

        <div className="space-y-2">
          {/* Aperçu */}
          <Button
            type="button"
            variant="outline"
            onClick={onPreviewToggle}
            className="w-full justify-start"
            aria-pressed={previewMode}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewMode ? "Masquer l'aperçu" : "Aperçu"}
          </Button>

          {/* Sauvegarde manuelle */}
          {onAutoSave && status === "draft" && (
            <Button
              type="button"
              variant="outline"
              onClick={onAutoSave}
              disabled={!isDirty || isPending}
              className="w-full justify-start"
            >
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder le brouillon
            </Button>
          )}

          {/* Soumission principale */}
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={isPending}
            className="w-full justify-start"
          >
            {isPending ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                {mode === "create" ? "Création..." : "Mise à jour..."}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {mode === "create" ? "Créer l'article" : "Mettre à jour"}
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Aide contextuelle */}
      <section className="text-sm text-muted-foreground">
        <header>
          <h4 className="font-medium mb-2">Conseils</h4>
        </header>
        <ul className="space-y-1" role="list">
          <li>• Les brouillons sont sauvegardés automatiquement</li>
          <li>• Utilisez l'aperçu pour vérifier le rendu final</li>
          <li>• Les articles publiés sont immédiatement visibles</li>
          {status === "published" && (
            <li className="text-amber-600">
              • Attention : Modifications visibles immédiatement
            </li>
          )}
        </ul>
      </section>
    </aside>
  );
}