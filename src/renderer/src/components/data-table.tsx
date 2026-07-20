import * as React from "react";
import type { Row } from "@tanstack/react-table";
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
import { Check, ChevronDown, Pencil, SearchIcon, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Voter } from "@/types/electron";

import ExportButton from "./export-button";
import ClearButton from "./clear-button";
import { Checkbox } from "@/components/ui/checkbox";
import ImportButton from "./import-button";
import AddButton from "./add-button";
import { useModalStore } from "@/stores/modal-store";

function ActionsCell({ voter }: { voter: Voter }) {
  const { setEditVoter, setDeleteVoter } = useModalStore();

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditVoter(voter)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleteVoter(voter)}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

const columns: ColumnDef<Voter>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const rows = table.getFilteredRowModel().rows;
      const allSelected =
        rows.length > 0 && rows.every((r) => r.getIsSelected());
      return (
        <Checkbox
          checked={
            allSelected ||
            (rows.some((r) => r.getIsSelected()) && "indeterminate")
          }
          onCheckedChange={(value) => {
            const onSelectAll = (
              table.options.meta as {
                onSelectAll: (value: boolean, rows: Row<Voter>[]) => void;
              }
            ).onSelectAll;
            onSelectAll(!!value, rows);
          }}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => {
      const raw = row.original;

      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected();
            raw.isGiven = !!value;
            window.electronAPI.updateStatus({
              voterId: raw.voterId,
              value: !!value,
            });
          }}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
  },
  {
    accessorKey: "voterId",
    header: "Voter ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "barangay",
    header: ({ column, table }) => {
      const meta = table.options.meta as {
        barangayOptions: string[];
        barangayToPrecincts: Record<string, string[]>;
        precinctToBarangays: Record<string, string[]>;
      };
      const selectedPrecinct = table
        .getColumn("precinct")
        ?.getFilterValue() as string | undefined;
      const barangayOptions = selectedPrecinct
        ? meta.precinctToBarangays[selectedPrecinct] ?? []
        : meta.barangayOptions;
      const [open, setOpen] = React.useState(false);
      const value = column.getFilterValue() as string | undefined;
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className="px-0"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
            >
              {value ?? "Barangay"} <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search barangay..." />
              <CommandList>
                <CommandEmpty>No barangay found.</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => {
                    column.setFilterValue(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  All
                </CommandItem>
                {barangayOptions.map((b) => (
                  <CommandItem
                    key={b}
                    value={b}
                    onSelect={() => {
                      column.setFilterValue(b);
                      table
                        .getColumn("precinct")
                        ?.setFilterValue(undefined);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === b ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {b}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    },
  },
  {
    accessorKey: "precinct",
    header: ({ column, table }) => {
      const meta = table.options.meta as {
        precinctOptions: string[];
        barangayToPrecincts: Record<string, string[]>;
        precinctToBarangays: Record<string, string[]>;
      };
      const selectedBarangay = table
        .getColumn("barangay")
        ?.getFilterValue() as string | undefined;
      const precinctOptions = selectedBarangay
        ? meta.barangayToPrecincts[selectedBarangay] ?? []
        : meta.precinctOptions;
      const [open, setOpen] = React.useState(false);
      const value = column.getFilterValue() as string | undefined;
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              className="px-0"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
            >
              {value ?? "Precinct"} <ChevronDown />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search precinct..." />
              <CommandList>
                <CommandEmpty>No precinct found.</CommandEmpty>
                <CommandItem
                  value=""
                  onSelect={() => {
                    column.setFilterValue(undefined);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  All
                </CommandItem>
                {precinctOptions.map((p) => (
                  <CommandItem
                    key={p}
                    value={p}
                    onSelect={() => {
                      column.setFilterValue(p);
                      table
                        .getColumn("barangay")
                        ?.setFilterValue(
                          meta.precinctToBarangays[p]?.[0],
                        );
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === p ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {p}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <ActionsCell voter={row.original} />,
    enableSorting: false,
    enableHiding: false,
    enableGlobalFilter: false,
  },
];

export function DataTable({ data }: { data: Voter[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    data.forEach((voter, index) => {
      if (voter.isGiven) {
        initial[index] = true;
      }
    });
    return initial;
  });

  const barangayOptions = React.useMemo(() => {
    const unique = new Set(data.map((v) => v.barangay).filter(Boolean));
    return Array.from(unique).sort();
  }, [data]);

  const precinctOptions = React.useMemo(() => {
    const unique = new Set(data.map((v) => v.precinct).filter(Boolean));
    return Array.from(unique).sort();
  }, [data]);

  const barangayToPrecincts = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    data.forEach((v) => {
      if (!v.barangay || !v.precinct) return;
      if (!map[v.barangay]) map[v.barangay] = [];
      if (!map[v.barangay].includes(v.precinct)) map[v.barangay].push(v.precinct);
    });
    return map;
  }, [data]);

  const precinctToBarangays = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    data.forEach((v) => {
      if (!v.barangay || !v.precinct) return;
      if (!map[v.precinct]) map[v.precinct] = [];
      if (!map[v.precinct].includes(v.barangay)) map[v.precinct].push(v.barangay);
    });
    return map;
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    meta: {
      barangayOptions,
      precinctOptions,
      barangayToPrecincts,
      precinctToBarangays,
      onSelectAll: (value: boolean, rows: Row<Voter>[]) => {
        if (value) {
          const sel: Record<string, boolean> = {};
          rows.forEach((row) => {
            row.original.isGiven = true;
            sel[row.id] = true;
          });
          setRowSelection(sel);
        } else {
          setRowSelection((prev) => {
            const next = { ...prev };
            rows.forEach((row) => {
              row.original.isGiven = false;
              delete next[row.id];
            });
            return next;
          });
        }
        window.electronAPI.updateAllStatus({
          voterIds: rows.map((r) => r.original.voterId),
          value,
        });
      },
    } as {
      barangayOptions: string[];
      precinctOptions: string[];
      barangayToPrecincts: Record<string, string[]>;
      precinctToBarangays: Record<string, string[]>;
      onSelectAll: (value: boolean, rows: Row<Voter>[]) => void;
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true;
      const search = String(filterValue).toLowerCase();
      const value = String(row.getValue("name") ?? "").toLowerCase();
      return value.includes(search);
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <div className="flex gap-2 items-center flex-1">
          <div className="relative w-full max-w-sm rounded-md border border-input bg-background ring-offset-background transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-0">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full border-0 bg-transparent pl-8 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <ExportButton />

          <ImportButton />

          <AddButton />

          <ClearButton />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Columns <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between pt-6">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Pagination className="mr-0 ml-auto w-fit">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => table.previousPage()}
                className={
                  !table.getCanPreviousPage()
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            {(() => {
              const current = table.getState().pagination.pageIndex;
              const total = table.getPageCount();
              const siblings = 1;
              const pages: (number | "ellipsis")[] = [0];
              const rangeStart = Math.max(1, current - siblings);
              const rangeEnd = Math.min(total - 2, current + siblings);
              if (rangeStart > 1) pages.push("ellipsis");
              for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
              if (rangeEnd < total - 2) pages.push("ellipsis");
              if (total > 1) pages.push(total - 1);
              return pages.map((page, idx) =>
                page === "ellipsis" ? (
                  <PaginationItem key={`e${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === current}
                      onClick={() => table.setPageIndex(page)}
                      className="cursor-pointer"
                    >
                      {page + 1}
                    </PaginationLink>
                  </PaginationItem>
                ),
              );
            })()}
            <PaginationItem>
              <PaginationNext
                onClick={() => table.nextPage()}
                className={
                  !table.getCanNextPage()
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
