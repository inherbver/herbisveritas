// src/components/admin/role-manager.tsx

"use client";

import { useState } from "react";
import { setUserRole } from "@/actions/adminActions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type AppRole = "user" | "dev" | "admin";

interface RoleManagerProps {
  userId: string;
  initialRole: string;
  onRoleUpdated?: () => void;
}

export function RoleManager({ userId, initialRole, onRoleUpdated }: RoleManagerProps) {
  const [newRole, setNewRole] = useState<AppRole>(initialRole as AppRole);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await setUserRole({
      userId,
      newRole,
      reason,
    });

    if (result.success) {
      if (result.data.error) {
        toast.error(result.data.error);
      } else {
        toast.success("Rôle mis à jour avec succès !");
        if (onRoleUpdated) {
          onRoleUpdated();
        }
      }
    } else {
      // result.error est un string ici, pas un objet Error
      toast.error(result.error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <Label htmlFor="role-select">Nouveau rôle</Label>
        <Select value={newRole} onValueChange={(value: AppRole) => setNewRole(value)}>
          <SelectTrigger id="role-select">
            <SelectValue placeholder="Sélectionner un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Utilisateur</SelectItem>
            <SelectItem value="dev">Développeur</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="reason">Raison de la modification</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Promotion au poste d'administrateur"
          required
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading || !reason}>
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}
