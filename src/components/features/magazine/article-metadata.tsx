import { Calendar, User, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArticleMetadataProps } from "@/types/magazine";

export function ArticleMetadata({
  author,
  publishedDate,
  readingTime,
  viewCount,
  className,
  variant = "default",
}: ArticleMetadataProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-xs text-muted-foreground",
        isCompact && "gap-2",
        className
      )}
    >
      {/* Auteur */}
      {author && (
        <div className="flex min-w-0 items-center gap-1">
          <User className={cn("h-3 w-3 flex-shrink-0", isCompact && "h-2.5 w-2.5")} />
          <span className="max-w-[120px] truncate">
            {author.first_name} {author.last_name}
          </span>
        </div>
      )}

      {/* Date de publication */}
      <div className="flex items-center gap-1">
        <Calendar className={cn("h-3 w-3 flex-shrink-0", isCompact && "h-2.5 w-2.5")} />
        <time dateTime={publishedDate} className="whitespace-nowrap text-xs">
          {publishedDate}
        </time>
      </div>

      {/* Temps de lecture */}
      {readingTime && (
        <div className="flex items-center gap-1">
          <Clock className={cn("h-3 w-3 flex-shrink-0", isCompact && "h-2.5 w-2.5")} />
          <span className="whitespace-nowrap">
            {readingTime} min{!isCompact && " de lecture"}
          </span>
        </div>
      )}

      {/* Nombre de vues */}
      {viewCount && viewCount > 0 && (
        <div className="flex items-center gap-1">
          <Eye className={cn("h-3 w-3 flex-shrink-0", isCompact && "h-2.5 w-2.5")} />
          <span className="whitespace-nowrap">
            {viewCount.toLocaleString()} vue{viewCount > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
