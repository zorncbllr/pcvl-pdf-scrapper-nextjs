import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  DragEvent,
  ChangeEvent,
  MouseEvent,
} from "react";
import { FileSpreadsheet, AlertCircle, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, wordsMatch } from "@/lib/utils";

const ACCEPTED_EXT = [".xlsx", ".xls", ".csv"];

interface SheetPreview {
  headers: string[];
  rows: string[][];
  rowIds: number[];
  merges: { row: number; col: number; rowspan: number; colspan: number }[];
  headerRows: boolean[];
}

interface ExcelDropzoneProps {
  onFileSelect?: (file: File | null) => void;
  sheets?: string[];
  activeSheet?: string | null;
  preview?: SheetPreview | null;
  onSheetClick?: (sheet: string) => void;
  loadingSheet?: boolean;
  searchQuery?: string;
  statusFilter?: string;
  selectedRowIds?: number[];
  onCellSearch?: (value: string) => void;
}

function isExcelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => name.endsWith(ext));
}

export default function ExcelDropzone({
  onFileSelect,
  sheets,
  activeSheet,
  preview,
  onSheetClick,
  loadingSheet,
  searchQuery,
  statusFilter,
  selectedRowIds,
  onCellSearch,
}: ExcelDropzoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback(
    (f: File | null | undefined) => {
      if (!f) return;
      if (!isExcelFile(f)) {
        setError("Only .xlsx, .xls, or .csv files are supported.");
        setFile(null);
        return;
      }
      setError("");
      setFile(f);
      onFileSelect?.(f);
    },
    [onFileSelect],
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    validateAndSet(dropped);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    validateAndSet(selected);
    e.target.value = "";
  };

  const openPicker = () => inputRef.current?.click();

  const showContent = (file && !error) || !!preview || (!!sheets && sheets.length > 0);

  return (
    <div className="w-full h-full">
      <div
        role={showContent ? undefined : "button"}
        tabIndex={showContent ? undefined : 0}
        onClick={showContent ? undefined : openPicker}
        onKeyDown={
          showContent
            ? undefined
            : (e: KeyboardEvent<HTMLDivElement>) =>
                (e.key === "Enter" || e.key === " ") && openPicker()
        }
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        className={cn(
          "rounded-lg border shadow-none transition-colors",
          !showContent &&
            "flex h-full w-full flex-col items-center justify-center gap-4 border-dashed p-8 text-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "border-primary bg-muted/50",
          error && !file && "border-destructive/40 bg-destructive/5",
          !isDragging && !error && !file && "border-border hover:bg-muted/40",
          showContent && "h-full border-0 p-0",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleInputChange}
        />

        {!showContent && !file && !error && (
          <>
            <FileSpreadsheet />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {isDragging
                  ? "Drop your file here"
                  : "Drag & drop your Excel file"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse from your device
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                openPicker();
              }}
            >
              Browse files
            </Button>
          </>
        )}

        {!showContent && error && !file && (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
              <AlertCircle
                className="h-5 w-5 text-destructive"
                strokeWidth={1.75}
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-sm text-muted-foreground">
                Choose a different file to continue
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                setError("");
                openPicker();
              }}
            >
              Try again
            </Button>
          </>
        )}

        {showContent && (
          <div className="space-y-3 w-full flex flex-col h-full min-h-0">

            {loadingSheet && (
              <p className="text-sm text-muted-foreground">
                Loading sheet data...
              </p>
            )}

            {preview && (
              <div className="overflow-auto border rounded-md flex-1 min-h-0">
                {(() => {
                  const q = (searchQuery ?? "").toLowerCase();
                  const selectedSet = new Set(
                    selectedRowIds ?? [],
                  );
                  const filteredEntries = Array.from(preview.rows.entries())
                    .filter(([, row]) =>
                      !q || row.some((cell) => wordsMatch(cell, searchQuery!)),
                    )
                    .filter(([ri]) =>
                      !statusFilter || statusFilter === "all" ||
                      (statusFilter === "selected" && selectedSet.has(preview.rowIds[ri])) ||
                      (statusFilter === "unselected" && !selectedSet.has(preview.rowIds[ri])),
                    );
                  if (filteredEntries.length === 0) {
                    return (
                      <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                        No results.
                      </div>
                    );
                  }
                  return (
                    <table
                      className="w-full text-sm"
                      style={{ tableLayout: "fixed" }}
                    >

                      <tbody className="[&_tr:last-child]:border-0">
                        {(() => {
                          const consumed = new Set<string>();
                          return filteredEntries.map(([ri, row]) => {
                            const isColHeaderRow = ri === preview.headerRow - 1;
                            const rowHighlighted =
                              q && filteredEntries.length > 0 && ri === filteredEntries[0][0];
                            const rowSelected = selectedSet.size > 0 && preview && selectedSet.has(preview.rowIds[ri]);
                            return (
                              <tr
                                key={ri}
                                className={cn(
                                  "border-b transition-colors",
                                  isColHeaderRow && "bg-muted/50 font-semibold",
                                  rowHighlighted && "bg-primary text-primary-foreground",
                                  !rowHighlighted && rowSelected && "bg-muted",
                                  !rowHighlighted && !rowSelected && "hover:bg-muted/50",
                                )}
                                style={{ height: "36px" }}
                              >
                                <td
                                  className={cn(
                                    "p-2 align-middle border-r whitespace-nowrap w-8",
                                    rowHighlighted
                                      ? "text-primary-foreground"
                                      : "text-muted-foreground",
                                  )}
                                  style={{ height: "36px" }}
                                >
                                  {!preview.headerRows?.[ri] && rowSelected && (
                                    <Check className="h-4 w-4 mx-auto" />
                                  )}
                                </td>
                                {row.map((cell, ci) => {
                                  const key = `${ri}-${ci}`;
                                  if (consumed.has(key)) return null;
                                  const merge = preview.merges.find(
                                    (m) => m.row === ri + (preview.headerRow ? 1 : 2) && m.col === ci + 1,
                                  );
                                  if (merge) {
                                    for (
                                      let r = ri;
                                      r < ri + merge.rowspan &&
                                      r < filteredEntries.length;
                                      r++
                                    ) {
                                      for (
                                        let c = ci;
                                        c < ci + merge.colspan;
                                        c++
                                      ) {
                                        if (r !== ri || c !== ci)
                                          consumed.add(`${r}-${c}`);
                                      }
                                    }
                                    return (
                                      <td
                                        key={ci}
                                        colSpan={merge.colspan}
                                        rowSpan={merge.rowspan}
                                        className={cn(
                                          "p-2 align-middle border-r last:border-r-0 whitespace-nowrap group relative",
                                          isColHeaderRow && "font-medium text-muted-foreground",
                                        )}
                                      >
                                        <span className="truncate block">{cell}</span>
                                        {onCellSearch && cell && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); onCellSearch(cell.trim()); }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted-foreground/20"
                                          >
                                            <Search className="h-3 w-3 text-muted-foreground" />
                                          </button>
                                        )}
                                      </td>
                                    );
                                  }
                                  return (
                                    <td
                                      key={ci}
                                      className={cn(
                                        "p-2 align-middle border-r last:border-r-0 whitespace-nowrap group relative",
                                        isColHeaderRow && "font-medium text-muted-foreground",
                                      )}
                                      style={{
                                        height: "36px",
                                        overflow: "hidden",
                                      }}
                                    >
                                      <span className="truncate block">{cell}</span>
                                      {onCellSearch && cell && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onCellSearch(cell.trim()); }}
                                          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted-foreground/20"
                                        >
                                          <Search className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}

            {sheets && sheets.length > 0 && (
              <div className="flex flex-wrap gap-2 flex-none">
                {sheets.map((s) => (
                  <Button
                    key={s}
                    variant={activeSheet === s ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSheetClick?.(s);
                    }}
                    disabled={loadingSheet}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
