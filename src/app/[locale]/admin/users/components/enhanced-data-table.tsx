"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvancedFilters, FilterState } from "./advanced-filters";
import { type UserForAdminPanel } from "@/actions/userActions";
import { ChevronDown } from "lucide-react";

interface EnhancedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function EnhancedDataTable<TData extends UserForAdminPanel, TValue>({
  columns,
  data,
}: EnhancedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [filters, setFilters] = React.useState<FilterState>({
    search: "",
    role: "all",
    status: "all",
    dateFrom: undefined,
    dateTo: undefined,
  });

  // Filter data client-side based on our custom filters
  const filteredData = React.useMemo(() => {
    const filtered = data.filter((item) => {
      const user = item as UserForAdminPanel;

      // Search filter (name or email)
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const fullName = user.full_name?.toLowerCase() || "";
        const email = user.email.toLowerCase();

        if (!fullName.includes(searchTerm) && !email.includes(searchTerm)) {
          return false;
        }
      }

      // Role filter
      if (filters.role && filters.role !== "all") {
        if (user.role !== filters.role) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status !== "all") {
        const userStatus = user.status || "active";
        if (userStatus !== filters.status) {
          return false;
        }
      }

      // Date filters
      const createdAt = new Date(user.created_at);

      if (filters.dateFrom && createdAt < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && createdAt > filters.dateTo) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [data, filters]);

  const resetFilters = () => {
    setFilters({
      search: "",
      role: "all",
      status: "all",
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        onResetFilters={resetFilters}
      />

      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredData.length} utilisateur(s) sur {data.length}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ChevronDown className="ml-2 h-4 w-4" />
              Colonnes
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()} (
          {filteredData.length} résultats)
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
