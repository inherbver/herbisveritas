"use client";

import * as React from "react";
import { type UserForAdminPanel, deleteUser } from "@/actions/userActions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DeleteUserDialogProps {
  user: UserForAdminPanel;
  children: React.ReactNode;
}

export function DeleteUserDialog({ user, children }: DeleteUserDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [confirmText, setConfirmText] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const expectedConfirmText = `SUPPRIMER ${user.email}`;
  const isConfirmValid = confirmText === expectedConfirmText;
  const canDelete = reason.trim().length >= 10 && isConfirmValid;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsLoading(true);

    const result = await deleteUser({
      userId: user.id,
      reason: reason.trim(),
    });

    if (result.success) {
      toast.success("Utilisateur supprimé avec succès");
      setIsOpen(false);
      setReason("");
      setConfirmText("");
      // Refresh the page to update the user list
      window.location.reload();
    } else {
      toast.error(result.error || "Erreur lors de la suppression");
    }

    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      setConfirmText("");
    }
    setIsOpen(open);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            ⚠️ Supprimer l&apos;utilisateur
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 text-left">
            <div className="bg-destructive/10 border-destructive/20 rounded-md border p-4">
              <p className="mb-2 font-medium text-destructive">
                Attention : Cette action est irréversible !
              </p>
              <p className="text-sm text-muted-foreground">
                Vous allez supprimer définitivement l&apos;utilisateur{" "}
                <strong>{user.full_name || "Sans nom"}</strong> (<strong>{user.email}</strong>).
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                • Toutes ses données seront perdues
                <br />
                • Ses commandes resteront dans l&apos;historique
                <br />• Cette action sera auditée
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="delete-reason" className="text-sm font-medium">
              Raison de la suppression (minimum 10 caractères) *
            </Label>
            <Input
              id="delete-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compte spam, violation des conditions d'utilisation..."
              className="mt-1"
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="mt-1 text-xs text-destructive">
                {10 - reason.length} caractères minimum requis
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Tapez exactement :{" "}
              <code className="rounded bg-muted px-1 text-xs">{expectedConfirmText}</code>
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expectedConfirmText}
              className="mt-1 font-mono text-sm"
            />
            {confirmText.length > 0 && !isConfirmValid && (
              <p className="mt-1 text-xs text-destructive">Le texte ne correspond pas</p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || isLoading}
            className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
          >
            {isLoading ? "Suppression..." : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
