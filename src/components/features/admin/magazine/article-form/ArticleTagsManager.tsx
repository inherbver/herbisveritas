"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Hash } from "lucide-react";
import { Tag } from "@/types/magazine";

interface ArticleTagsManagerProps {
  tags: Tag[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function ArticleTagsManager({
  tags,
  selectedTags,
  onTagsChange,
}: ArticleTagsManagerProps) {
  const [selectedTag, setSelectedTag] = useState<string>("");

  const addTag = (tagId: string) => {
    if (tagId && !selectedTags.includes(tagId)) {
      const newTags = [...selectedTags, tagId];
      onTagsChange(newTags);
      setSelectedTag("");
    }
  };

  const removeTag = (tagId: string) => {
    const newTags = selectedTags.filter((id) => id !== tagId);
    onTagsChange(newTags);
  };

  const availableTags = tags.filter((tag) => !selectedTags.includes(tag.id));

  return (
    <section aria-label="Gestion des tags">
      <fieldset className="space-y-4">
        <legend className="text-lg font-semibold flex items-center gap-2">
          <Hash className="h-5 w-5" />
          Tags
        </legend>

        {/* Sélecteur de tags */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="tag-select" className="sr-only">
              Ajouter un tag
            </Label>
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger id="tag-select" aria-describedby="tag-help">
                <SelectValue placeholder="Ajouter un tag..." />
              </SelectTrigger>
              <SelectContent>
                {availableTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => addTag(selectedTag)}
            disabled={!selectedTag}
            variant="outline"
            aria-label="Ajouter le tag sélectionné"
          >
            Ajouter
          </Button>
        </div>

        <p id="tag-help" className="text-sm text-muted-foreground">
          Les tags aident à catégoriser et rechercher les articles
        </p>

        {/* Tags sélectionnés */}
        {selectedTags.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Tags sélectionnés :</Label>
            <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Tags sélectionnés">
              {selectedTags.map((tagId) => {
                const tag = tags.find((t) => t.id === tagId);
                if (!tag) return null;

                return (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="flex items-center gap-1"
                    role="listitem"
                  >
                    <Hash className="h-3 w-3" />
                    {tag.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeTag(tagId)}
                      aria-label={`Supprimer le tag ${tag.name}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Affichage quand aucun tag */}
        {selectedTags.length === 0 && (
          <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun tag sélectionné</p>
            <p className="text-sm">Les tags améliorent la découvrabilité de vos articles</p>
          </div>
        )}
      </fieldset>
    </section>
  );
}