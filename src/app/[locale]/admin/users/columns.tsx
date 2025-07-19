"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { type UserForAdminPanel } from "@/actions/userActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UpdateRoleDialog } from "./update-role-dialog";

export const columns: ColumnDef<UserForAdminPanel>[] = [
  {
    accessorKey: "full_name",
    header: "Nom complet",
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Rôle",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const variant = role === "admin" ? "destructive" : "default";
      return <Badge variant={variant}>{role}</Badge>;
    },
  },
  {
    accessorKey: "created_at",
    header: "Créé le",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <span>{date.toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "last_sign_in_at",
    header: "Dernière connexion",
    cell: ({ row }) => {
      const dateValue = row.getValue("last_sign_in_at") as string | undefined;
      if (!dateValue) return <span>Jamais</span>;
      const date = new Date(dateValue);
      return <span>{date.toLocaleString()}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
              Copier l'ID utilisateur
            </DropdownMenuItem>
            <UpdateRoleDialog user={user}>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Modifier le rôle
              </DropdownMenuItem>
            </UpdateRoleDialog>
            <DropdownMenuItem className="text-red-600">Supprimer l'utilisateur</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
