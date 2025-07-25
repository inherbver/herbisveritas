import Link from "next/link";
import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TagListProps } from "@/types/magazine";

export function TagList({ 
  tags, 
  maxVisible = 3, 
  variant = 'default',
  onTagClick,
  className 
}: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;
  
  const renderTag = (tag: typeof tags[0], _index: number) => {
    const content = (
      <Badge 
        key={tag.id}
        variant={variant === 'badges' ? 'default' : 'secondary'} 
        className={cn(
          "text-xs cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground",
          variant === 'compact' && "text-[10px] px-1.5 py-0.5"
        )}
        onClick={onTagClick ? () => onTagClick(tag) : undefined}
      >
        {variant !== 'compact' && <Hash className="h-3 w-3 mr-1" />}
        {tag.name}
      </Badge>
    );

    // Si onTagClick est fourni, on ne wrappe pas dans un Link pour éviter les conflits
    if (onTagClick) {
      return content;
    }

    return (
      <Link
        key={tag.id}
        href={`/magazine/tag/${tag.slug}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-block hover:opacity-80 transition-opacity"
      >
        {content}
      </Link>
    );
  };

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visibleTags.map(renderTag)}
      
      {remainingCount > 0 && (
        <Badge 
          variant="secondary" 
          className={cn(
            "text-xs pointer-events-none",
            variant === 'compact' && "text-[10px] px-1.5 py-0.5"
          )}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}