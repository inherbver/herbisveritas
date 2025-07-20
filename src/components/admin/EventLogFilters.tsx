"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CalendarIcon, FilterIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { EventLogFilters, EventTypeGroup } from "@/types/event-filters";
import type { EventSeverity } from "@/lib/admin/dashboard";
import { EVENT_TYPE_GROUPS, DATE_RANGE_PRESETS, DEFAULT_FILTERS } from "@/types/event-filters";

interface EventLogFiltersProps {
  filters: EventLogFilters;
  onFiltersChange: (filters: EventLogFilters) => void;
  totalCount: number;
  filteredCount: number;
}

const SEVERITY_CONFIGS = {
  INFO: { label: "Info", variant: "default" as const, color: "text-blue-600" },
  WARNING: { label: "Attention", variant: "secondary" as const, color: "text-orange-600" },
  ERROR: { label: "Erreur", variant: "destructive" as const, color: "text-red-600" },
  CRITICAL: { label: "Critique", variant: "destructive" as const, color: "text-red-800" },
} as const;

export function EventLogFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: EventLogFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onFiltersChange({ ...filters, search: value });
  };

  const handleSeverityToggle = (severity: EventSeverity) => {
    const newSeverity = filters.severity.includes(severity)
      ? filters.severity.filter((s) => s !== severity)
      : [...filters.severity, severity];
    onFiltersChange({ ...filters, severity: newSeverity });
  };

  const handleEventTypeToggle = (eventType: string) => {
    const newEventTypes = filters.eventTypes.includes(eventType as never)
      ? filters.eventTypes.filter((t) => t !== eventType)
      : [...filters.eventTypes, eventType as never];
    onFiltersChange({ ...filters, eventTypes: newEventTypes });
  };

  const handleEventGroupToggle = (group: EventTypeGroup) => {
    const allGroupTypesSelected = group.eventTypes.every((type) =>
      filters.eventTypes.includes(type)
    );

    let newEventTypes;
    if (allGroupTypesSelected) {
      // Décocher tous les types du groupe
      newEventTypes = filters.eventTypes.filter((type) => !group.eventTypes.includes(type));
    } else {
      // Cocher tous les types du groupe
      const typesToAdd = group.eventTypes.filter((type) => !filters.eventTypes.includes(type));
      newEventTypes = [...filters.eventTypes, ...typesToAdd];
    }

    onFiltersChange({ ...filters, eventTypes: newEventTypes });
  };

  const handleDateRangeChange = (range: { start: Date; end: Date } | null) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    onFiltersChange(DEFAULT_FILTERS);
  };

  const activeFiltersCount =
    filters.severity.length +
    filters.eventTypes.length +
    (filters.dateRange ? 1 : 0) +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Barre de recherche et actions rapides */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les événements..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {filteredCount} / {totalCount} événements
          </Badge>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="mr-1 h-4 w-4" />
              Effacer ({activeFiltersCount})
            </Button>
          )}

          {/* Filtres sur desktop */}
          <div className="hidden items-center gap-2 lg:flex">
            <SeverityFilter
              selectedSeverity={filters.severity}
              onSeverityToggle={handleSeverityToggle}
            />
            <DateRangeFilter
              dateRange={filters.dateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>

          {/* Filtres sur mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <FilterIcon className="mr-1 h-4 w-4" />
                Filtres
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtres des événements</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <MobileSeverityFilter
                  selectedSeverity={filters.severity}
                  onSeverityToggle={handleSeverityToggle}
                />
                <MobileDateRangeFilter
                  dateRange={filters.dateRange}
                  onDateRangeChange={handleDateRangeChange}
                />
                <MobileEventTypeFilter
                  selectedEventTypes={filters.eventTypes}
                  onEventTypeToggle={handleEventTypeToggle}
                  onEventGroupToggle={handleEventGroupToggle}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Panneau de filtres desktop pour les types d'événements */}
      <div className="hidden lg:block">
        <EventTypeFilter
          selectedEventTypes={filters.eventTypes}
          onEventTypeToggle={handleEventTypeToggle}
          onEventGroupToggle={handleEventGroupToggle}
        />
      </div>
    </div>
  );
}

// Composant filtre de sévérité (desktop)
function SeverityFilter({
  selectedSeverity,
  onSeverityToggle,
}: {
  selectedSeverity: EventSeverity[];
  onSeverityToggle: (severity: EventSeverity) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Sévérité
          {selectedSeverity.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {selectedSeverity.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="start">
        <div className="space-y-2">
          {Object.entries(SEVERITY_CONFIGS).map(([severity, config]) => (
            <div key={severity} className="flex items-center space-x-2">
              <Checkbox
                id={`severity-${severity}`}
                checked={selectedSeverity.includes(severity as EventSeverity)}
                onCheckedChange={() => onSeverityToggle(severity as EventSeverity)}
              />
              <Label htmlFor={`severity-${severity}`} className="flex items-center gap-2">
                <Badge variant={config.variant} className={config.color}>
                  {config.label}
                </Badge>
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Composant filtre de plage de dates (desktop)
function DateRangeFilter({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon className="mr-1 h-4 w-4" />
          {dateRange
            ? `${format(dateRange.start, "dd/MM")} - ${format(dateRange.end, "dd/MM")}`
            : "Dates"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateRangeContent dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
      </PopoverContent>
    </Popover>
  );
}

// Contenu du sélecteur de dates
function DateRangeContent({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Raccourcis</Label>
        <div className="grid gap-1">
          {DATE_RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="ghost"
              size="sm"
              className="h-8 justify-start"
              onClick={() => onDateRangeChange(preset.getValue())}
            >
              {preset.label}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-start"
            onClick={() => onDateRangeChange(null)}
          >
            Toutes les dates
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Sélection personnalisée</Label>
        <Calendar
          mode="range"
          selected={dateRange ? { from: dateRange.start, to: dateRange.end } : undefined}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onDateRangeChange({ start: range.from, end: range.to });
            }
          }}
          locale={fr}
          className="rounded-md border"
        />
      </div>
    </div>
  );
}

// Version mobile des filtres de sévérité
function MobileSeverityFilter({
  selectedSeverity,
  onSeverityToggle,
}: {
  selectedSeverity: EventSeverity[];
  onSeverityToggle: (severity: EventSeverity) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Sévérité</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {Object.entries(SEVERITY_CONFIGS).map(([severity, config]) => (
          <div key={severity} className="flex items-center space-x-2">
            <Checkbox
              id={`mobile-severity-${severity}`}
              checked={selectedSeverity.includes(severity as EventSeverity)}
              onCheckedChange={() => onSeverityToggle(severity as EventSeverity)}
            />
            <Label htmlFor={`mobile-severity-${severity}`} className="flex items-center gap-2">
              <Badge variant={config.variant} className={config.color}>
                {config.label}
              </Badge>
            </Label>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Version mobile du filtre de dates
function MobileDateRangeFilter({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: { start: Date; end: Date } | null;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Période</CardTitle>
      </CardHeader>
      <CardContent>
        <DateRangeContent dateRange={dateRange} onDateRangeChange={onDateRangeChange} />
      </CardContent>
    </Card>
  );
}

// Filtre par types d'événements (desktop)
function EventTypeFilter({
  selectedEventTypes,
  onEventTypeToggle,
  onEventGroupToggle: _onEventGroupToggle,
}: {
  selectedEventTypes: string[];
  onEventTypeToggle: (eventType: string) => void;
  onEventGroupToggle: (group: EventTypeGroup) => void;
}) {
  const hasSelectedTypes = selectedEventTypes.length > 0;

  if (!hasSelectedTypes) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Types d'événements sélectionnés</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {selectedEventTypes.map((eventType) => (
            <Badge
              key={eventType}
              variant="secondary"
              className="hover:bg-secondary/80 cursor-pointer"
              onClick={() => onEventTypeToggle(eventType)}
            >
              {eventType}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Version mobile du filtre par types d'événements
function MobileEventTypeFilter({
  selectedEventTypes,
  onEventTypeToggle,
  onEventGroupToggle,
}: {
  selectedEventTypes: string[];
  onEventTypeToggle: (eventType: string) => void;
  onEventGroupToggle: (group: EventTypeGroup) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Types d'événements</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {EVENT_TYPE_GROUPS.map((group) => {
            const selectedInGroup = group.eventTypes.filter((type) =>
              selectedEventTypes.includes(type)
            );
            const allSelected = selectedInGroup.length === group.eventTypes.length;
            const someSelected = selectedInGroup.length > 0;

            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger className="text-sm">
                  <div className="mr-2 flex w-full items-center justify-between">
                    <span>{group.label}</span>
                    {someSelected && (
                      <Badge variant="secondary" className="h-5 w-5 p-0 text-xs">
                        {selectedInGroup.length}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <div className="flex items-center space-x-2 border-b pb-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onCheckedChange={() => onEventGroupToggle(group)}
                    />
                    <Label htmlFor={`group-${group.id}`} className="text-sm font-medium">
                      Tous sélectionner
                    </Label>
                  </div>

                  {group.eventTypes.map((eventType) => (
                    <div key={eventType} className="ml-4 flex items-center space-x-2">
                      <Checkbox
                        id={`mobile-event-${eventType}`}
                        checked={selectedEventTypes.includes(eventType)}
                        onCheckedChange={() => onEventTypeToggle(eventType)}
                      />
                      <Label htmlFor={`mobile-event-${eventType}`} className="text-sm">
                        {eventType}
                      </Label>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
