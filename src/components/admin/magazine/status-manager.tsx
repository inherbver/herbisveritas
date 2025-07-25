"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { changeArticleStatus } from "@/actions/magazineActions";
import { ArticleDisplay } from "@/types/magazine";
import { 
  ChevronDown, 
  Send, 
  Archive, 
  FileText, 
  Eye,
  AlertTriangle 
} from "lucide-react";

interface StatusManagerProps {
  article: ArticleDisplay;
  onStatusChange?: () => void;
  compact?: boolean;
}

export function StatusManager({ article, onStatusChange, compact = false }: StatusManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    status: 'draft' | 'published' | 'archived';
    message: string;
  } | null>(null);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'published':
        return {
          label: 'Publié',
          variant: 'default' as const,
          icon: <Eye className="h-3 w-3" />,
          color: 'text-green-600'
        };
      case 'draft':
        return {
          label: 'Brouillon',
          variant: 'secondary' as const,
          icon: <FileText className="h-3 w-3" />,
          color: 'text-gray-600'
        };
      case 'archived':
        return {
          label: 'Archivé',
          variant: 'outline' as const,
          icon: <Archive className="h-3 w-3" />,
          color: 'text-orange-600'
        };
      default:
        return {
          label: 'Inconnu',
          variant: 'secondary' as const,
          icon: <AlertTriangle className="h-3 w-3" />,
          color: 'text-red-600'
        };
    }
  };

  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'archived') => {
    if (newStatus === article.status) return;

    const actions = {
      published: 'publier',
      draft: 'mettre en brouillon',
      archived: 'archiver'
    };

    setPendingAction({
      status: newStatus,
      message: `Êtes-vous sûr de vouloir ${actions[newStatus]} cet article ?`
    });
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = () => {
    if (!pendingAction) return;

    startTransition(async () => {
      try {
        const result = await changeArticleStatus(article.id, pendingAction.status);

        if (result.success) {
          toast.success(result.message);
          onStatusChange?.();
        } else {
          toast.error(result.error);
          if (result.details) {
            // Afficher les détails de validation
            result.details.forEach((detail: string) => {
              toast.error(detail, { duration: 5000 });
            });
          }
        }
      } catch (error) {
        toast.error("Une erreur est survenue");
      } finally {
        setShowConfirmDialog(false);
        setPendingAction(null);
      }
    });
  };

  const currentStatus = getStatusConfig(article.status || 'draft');

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Badge variant={currentStatus.variant} className="flex items-center gap-1">
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                disabled={isPending}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {article.status !== 'published' && (
                <DropdownMenuItem onClick={() => handleStatusChange('published')}>
                  <Send className="h-4 w-4 mr-2" />
                  Publier
                </DropdownMenuItem>
              )}
              {article.status !== 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Brouillon
                </DropdownMenuItem>
              )}
              {article.status !== 'archived' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingAction?.message}
                {pendingAction?.status === 'published' && (
                  <div className="mt-2 text-sm text-amber-600">
                    L'article sera visible publiquement une fois publié.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmStatusChange}
                disabled={isPending}
              >
                {isPending ? "En cours..." : "Confirmer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Version complète (non compact)
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Statut :</span>
          <Badge variant={currentStatus.variant} className="flex items-center gap-1">
            {currentStatus.icon}
            {currentStatus.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {article.status !== 'published' && (
            <Button
              onClick={() => handleStatusChange('published')}
              disabled={isPending}
              size="sm"
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Publier
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isPending}>
                Changer le statut
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {article.status !== 'draft' && (
                <DropdownMenuItem onClick={() => handleStatusChange('draft')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Mettre en brouillon
                </DropdownMenuItem>
              )}
              {article.status !== 'archived' && (
                <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.message}
              {pendingAction?.status === 'published' && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Attention :</span>
                  </div>
                  <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
                    <li>L'article sera visible publiquement</li>
                    <li>Il apparaîtra dans le sitemap</li>
                    <li>Les notifications peuvent être envoyées aux abonnés</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={isPending}
            >
              {isPending ? "En cours..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}