import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Check, ChevronDown, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn, wordsMatch } from "@/lib/utils";
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
import ActionsCell from "./actions-cell";

function colFlex(id: string): string {
  switch (id) {
    case "select": return "0 0 40px";
    case "voterId": return "0 0 100px";
    case "barangay": return "0 0 160px";
    case "precinct": return "0 0 100px";
    default: return "1 1 0";
  }
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
    cell: ({ row, table }) => {
      const raw = row.original;
      const gf = table.getState().globalFilter;
      const highlighted =
        gf &&
        wordsMatch(String(row.getValue("name") ?? ""), String(gf));

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
            table.setColumnFilters((prev) => [...prev]);
          }}
          aria-label="Select row"
          className={
            highlighted
              ? "border-primary-foreground/70 data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
              : undefined
          }
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
      const selectedPrecinct = table.getColumn("precinct")?.getFilterValue() as
        | string
        | undefined;
      const barangayOptions = selectedPrecinct
        ? (meta.precinctToBarangays[selectedPrecinct] ?? [])
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
                      table.getColumn("precinct")?.setFilterValue(undefined);
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
      const selectedBarangay = table.getColumn("barangay")?.getFilterValue() as
        | string
        | undefined;
      const precinctOptions = selectedBarangay
        ? (meta.barangayToPrecincts[selectedBarangay] ?? [])
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
                        ?.setFilterValue(meta.precinctToBarangays[p]?.[0]);
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
    accessorKey: "isGiven",
    enableSorting: false,
    enableGlobalFilter: false,
    filterFn: (row, _columnId, filterValue: string) => {
      if (filterValue === "selected") return row.getIsSelected();
      if (filterValue === "unselected") return !row.getIsSelected();
      return true;
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

export function DataTable({
  data,
  showActions = true,
  simple,
  searchQuery,
  statusFilter,
  toggleHighlightedRow,
  markTargetIndex,
  onSelectionChange,
  selectionSyncKey,
  onBarangayChange,
  onRowFocus,
}: {
  data: Voter[];
  showActions?: boolean;
  simple?: boolean;
  searchQuery?: string;
  statusFilter?: string;
  toggleHighlightedRow?: number;
  markTargetIndex?: number | null;
  onSelectionChange?: (indices: number[]) => void;
  selectionSyncKey?: number;
  onBarangayChange?: (barangay: string | null) => void;
  onRowFocus?: (voterId: number) => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [focusedMatchIndex, setFocusedMatchIndex] = React.useState<number | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];
    if (statusFilter && statusFilter !== "all") {
      filters.push({ id: "isGiven", value: statusFilter });
    }
    return filters;
  });
  const [globalFilter, setGlobalFilter] = React.useState(searchQuery ?? "");
  React.useEffect(() => {
    if (searchQuery !== undefined) setGlobalFilter(searchQuery);
    setFocusedMatchIndex(null);
  }, [searchQuery]);
  React.useEffect(() => {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== "isGiven");
      if (statusFilter && statusFilter !== "all") {
        return [...filtered, { id: "isGiven", value: statusFilter }];
      }
      return filtered;
    });
  }, [statusFilter]);
  React.useEffect(() => {
    const brgy = columnFilters.find((f) => f.id === "barangay")?.value as
      | string
      | undefined;
    onBarangayChange?.(brgy ?? null);
  }, [columnFilters, onBarangayChange]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({ isGiven: false });
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
      if (!map[v.barangay].includes(v.precinct))
        map[v.barangay].push(v.precinct);
    });
    return map;
  }, [data]);

  const precinctToBarangays = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    data.forEach((v) => {
      if (!v.barangay || !v.precinct) return;
      if (!map[v.precinct]) map[v.precinct] = [];
      if (!map[v.precinct].includes(v.barangay))
        map[v.precinct].push(v.barangay);
    });
    return map;
  }, [data]);

  const simpleColumns = React.useMemo(
    () => columns.filter((c) => c.id !== "actions"),
    [],
  );

  const table = useReactTable({
    data,
    columns: simple
      ? simpleColumns
      : showActions
        ? columns
        : columns.filter((c) => c.id !== "actions"),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    ...(simple
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
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
        setColumnFilters((prev) => [...prev]);
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
      return wordsMatch(String(row.getValue("name") ?? ""), String(filterValue));
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  React.useEffect(() => {
    if (!toggleHighlightedRow || !globalFilter || markTargetIndex == null) return;
    const filteredRows = table.getRowModel().rows;
    if (filteredRows.length === 0) return;
    const row = filteredRows.find((r) => parseInt(r.id) === markTargetIndex) ?? filteredRows[0];
    const newValue = !row.getIsSelected();
    setRowSelection((prev) => {
      const next = { ...prev };
      if (newValue) {
        next[row.id] = true;
      } else {
        delete next[row.id];
      }
      return next;
    });
    row.original.isGiven = newValue;
    window.electronAPI.updateStatus({
      voterId: row.original.voterId,
      value: newValue,
    });
    setColumnFilters((prev) => [...prev]);
  }, [toggleHighlightedRow]);

  React.useEffect(() => {
    if (selectionSyncKey === undefined) return;
    const sel: Record<string, boolean> = {};
    data.forEach((voter, index) => {
      if (voter.isGiven) sel[index] = true;
    });
    setRowSelection(sel);
    setColumnFilters((prev) => [...prev]);
  }, [selectionSyncKey]);

  const prevSelectionRef = React.useRef(rowSelection);
  React.useEffect(() => {
    if (!onSelectionChange) return;
    const current = Object.keys(rowSelection).filter((k) => rowSelection[k]).map(Number);
    const prev = Object.keys(prevSelectionRef.current).filter((k) => prevSelectionRef.current[k]).map(Number);
    if (current.length !== prev.length || current.some((v, i) => v !== prev[i])) {
      onSelectionChange(current.sort((a, b) => a - b));
    }
    prevSelectionRef.current = rowSelection;
  }, [rowSelection, onSelectionChange]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 5,
  });

  if (simple) {
    const virtualRows = virtualizer.getVirtualItems();
    const headerGroup = table.getHeaderGroups()[0];
    return (
      <div className="w-full h-full text-sm">
        <div ref={parentRef} className="rounded-md border h-full overflow-auto">
          <div className="sticky top-0 z-10 bg-background flex border-b min-w-0">
            {headerGroup.headers.map((header) => (
              <div
                key={header.id}
                className="h-10 px-2 flex items-center font-medium text-muted-foreground whitespace-nowrap border-r last:border-r-0 min-w-0"
                style={{ flex: colFlex(header.column.id) }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
              </div>
            ))}
          </div>
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}
          >
            {rows.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                No results.
              </div>
            ) : (
              virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                const matchIdx = globalFilter
                  ? rows.findIndex((r) =>
                      wordsMatch(String(r.getValue("name") ?? ""), String(globalFilter)),
                    )
                  : -1;
                const isMatch = matchIdx === virtualRow.index;
                const isHighlighted =
                  globalFilter &&
                  (focusedMatchIndex !== null
                    ? focusedMatchIndex === virtualRow.index
                    : isMatch);
                return (
                  <div
                    key={row.id}
                    onClick={() => {
                      if (globalFilter) {
                        setFocusedMatchIndex(virtualRow.index);
                        onRowFocus?.(row.original.voterId);
                      }
                    }}
                    className={cn(
                      "flex border-b transition-colors",
                      row.getIsSelected() && !isHighlighted && "bg-muted",
                      isHighlighted
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted/50",
                      globalFilter && "cursor-pointer",
                    )}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "36px",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        className={cn(
                          "p-2 flex items-center border-r last:border-r-0 whitespace-nowrap min-w-0",
                          cell.column.id === "select" && "justify-center",
                        )}
                        style={{ flex: colFlex(cell.column.id) }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <Select
            value={
              (table.getColumn("isGiven")?.getFilterValue() as string) ??
              "all"
            }
            onValueChange={(value) =>
              table
                .getColumn("isGiven")
                ?.setFilterValue(value === "all" ? undefined : value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="selected">Selected</SelectItem>
              <SelectItem value="unselected">Unselected</SelectItem>
            </SelectContent>
          </Select>
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
                .map((column) => (
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
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
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
      <div className="flex items-center justify-between py-4">
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
