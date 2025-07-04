"use client";

import * as React from "react";
import { type UserForAdminPanel } from "@/actions/userActions";
import { RoleManager } from "@/components/admin/role-manager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UpdateRoleDialogProps {
  user: UserForAdminPanel;
  children: React.ReactNode;
}

export function UpdateRoleDialog({ user, children }: UpdateRoleDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Modifier le rôle de {user.full_name || user.email}</DialogTitle>
          <DialogDescription>
            Sélectionnez un nouveau rôle pour l'utilisateur. La modification sera enregistrée dans les journaux d'audit.
          </DialogDescription>
        </DialogHeader>
        <RoleManager
          userId={user.id}
          initialRole={user.role || 'user'}
          onRoleUpdated={() => setIsOpen(false)} // Close dialog on success
        />
      </DialogContent>
    </Dialog>
  );
}
