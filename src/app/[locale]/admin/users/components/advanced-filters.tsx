"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface FilterState {
  search: string;
  role: string;
  status: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onResetFilters: () => void;
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onResetFilters,
}: AdvancedFiltersProps) {
  const [isDateFromOpen, setIsDateFromOpen] = React.useState(false);
  const [isDateToOpen, setIsDateToOpen] = React.useState(false);

  const updateFilter = (key: keyof FilterState, value: string | Date | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.role && filters.role !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  };

  const clearFilter = (key: keyof FilterState) => {
    updateFilter(
      key,
      key === "role" || key === "status" ? "all" : key === "search" ? "" : undefined
    );
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">Filtres</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Réinitialiser
          </Button>
        )}
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Recherche globale */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Recherche</label>
          <div className="relative">
            <Input
              placeholder="Nom ou email..."
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pr-8"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                onClick={() => clearFilter("search")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Filtre par rôle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rôle</label>
          <Select value={filters.role} onValueChange={(value) => updateFilter("role", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              <SelectItem value="admin">Administrateur</SelectItem>
              <SelectItem value="editor">Éditeur</SelectItem>
              <SelectItem value="user">Utilisateur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtre par statut */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Statut</label>
          <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="suspended">Suspendu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtre date de création (début) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Créé après</label>
          <Popover open={isDateFromOpen} onOpenChange={setIsDateFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? (
                  format(filters.dateFrom, "dd/MM/yyyy", { locale: fr })
                ) : (
                  <span className="text-muted-foreground">Date de début</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => {
                  updateFilter("dateFrom", date);
                  setIsDateFromOpen(false);
                }}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtre date de création (fin) */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Créé avant</label>
          <Popover open={isDateToOpen} onOpenChange={setIsDateToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? (
                  format(filters.dateTo, "dd/MM/yyyy", { locale: fr })
                ) : (
                  <span className="text-muted-foreground">Date de fin</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => {
                  updateFilter("dateTo", date);
                  setIsDateToOpen(false);
                }}
                initialFocus
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 border-t pt-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Recherche: {filters.search}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
                onClick={() => clearFilter("search")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.role && filters.role !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Rôle: {filters.role}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
                onClick={() => clearFilter("role")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.status && filters.status !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Statut: {filters.status}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
                onClick={() => clearFilter("status")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Après: {format(filters.dateFrom, "dd/MM/yyyy", { locale: fr })}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
                onClick={() => clearFilter("dateFrom")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Avant: {format(filters.dateTo, "dd/MM/yyyy", { locale: fr })}
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-4 w-4 p-0"
                onClick={() => clearFilter("dateTo")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </section>
  );
}
