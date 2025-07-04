// src/components/admin/role-manager.tsx

"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type AppRole = "user" | "dev" | "admin";

interface RoleManagerProps {
  initialUsers: User[];
}

export function RoleManager({ initialUsers }: RoleManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRoleChange = async () => {
    if (!selectedUser) return;
    setIsLoading(true);

    const supabase = createClient();

    try {
      const { data: result, error } = await supabase.functions.invoke("set-user-role", {
        body: { userId: selectedUser.id, role: newRole, reason },
      });

      if (error) {
        throw new Error(error.message || "Une erreur est survenue.");
      }

      // Mettre à jour l'état local
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id
            ? { ...u, app_metadata: { ...u.app_metadata, role: newRole } }
            : u
        )
      );
      toast.success(result.message);
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
      toast.error(`Échec de la mise à jour: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openDialogForUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.app_metadata.role || "user");
    setReason("");
    setIsDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "dev":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Rôle Actuel</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={getRoleBadgeVariant(user.app_metadata.role as string)}>
                  {(user.app_metadata.role as string) || "user"}
                </Badge>
              </TableCell>
              <TableCell>
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Jamais"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => openDialogForUser(user)}>
                  Modifier
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle de {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              onValueChange={(value: AppRole) => setNewRole(value)}
              defaultValue={selectedUser?.app_metadata.role || "user"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utilisateur</SelectItem>
                <SelectItem value="dev">Développeur</SelectItem>
                <SelectItem value="admin">Administrateur</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Justification du changement (recommandé)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Annuler</Button>
            </DialogClose>
            <Button onClick={handleRoleChange} disabled={isLoading}>
              {isLoading ? "Confirmation..." : "Confirmer le changement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
