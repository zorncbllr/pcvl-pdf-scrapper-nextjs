import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "./data-table";
import type { Voter } from "@/types/electron";
import ExcelDropzone from "./excel-dropzone";
import { SearchIcon, CheckCheck } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface SheetPreview {
  headers: string[];
  rows: string[][];
  merges: { row: number; col: number; rowspan: number; colspan: number }[];
}

export default function SplitView({
  voters,
  loading,
  sheets,
  activeSheet,
  preview,
  loadingSheet,
  fileName,
  resetKey,
  onFileSelect,
  onSheetClick,
}: {
  voters: Voter[];
  loading: boolean;
  sheets: string[];
  activeSheet: string | null;
  preview: SheetPreview | null;
  loadingSheet: boolean;
  fileName: string | null;
  resetKey: number;
  onFileSelect: (file: File | null) => Promise<void>;
  onSheetClick: (sheet: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [markKey, setMarkKey] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || voters.length === 0) return;
    initialized.current = true;
    setSelectedIndices(
      voters.reduce((acc, v, i) => {
        if (v.isGiven) acc.push(i);
        return acc;
      }, [] as number[]),
    );
  }, [voters]);

  const handleMark = useCallback(() => {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    const idx = voters.findIndex(
      (v) => v.name && v.name.toLowerCase().includes(q),
    );
    if (idx === -1) return;
    setSelectedIndices((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx],
    );
    setMarkKey((k) => k + 1);
  }, [searchQuery, voters]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center flex-1">
            <div className="relative w-full max-w-sm rounded-md border border-input bg-background ring-offset-background transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-0">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-0 bg-transparent pl-8 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleMark}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
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
        </CardContent>
      </Card>

      <div className="flex gap-4 w-full h-[calc(100vh-20rem)] min-h-0">
        <Card className="w-1/2 flex flex-col min-h-0">
          <CardHeader>
            {fileName ? (
              <>
                <div className="flex items-center justify-between">
                  <CardTitle>{fileName}</CardTitle>
                  <button
                    onClick={() => onFileSelect(null)}
                    className="text-muted-foreground hover:text-foreground leading-none p-0 border-0 bg-transparent cursor-pointer h-4 w-4 inline-flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
                <CardDescription>
                  {sheets?.length ?? 0} sheet(s)
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle>Record</CardTitle>
                <CardDescription>Uploaded excel file records.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-6 pt-0">
            <ExcelDropzone
              key={resetKey}
              onFileSelect={onFileSelect}
              sheets={sheets}
              activeSheet={activeSheet}
              preview={preview}
              onSheetClick={onSheetClick}
              loadingSheet={loadingSheet}
              searchQuery={searchQuery}
              selectedIndices={selectedIndices}
            />
          </CardContent>
        </Card>
        <Card className="w-1/2 flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Registered Voters</CardTitle>
            <CardDescription>
              Official list of registered voters from PCVL.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {loading ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                Loading voters...
              </div>
            ) : (
              <DataTable
                data={voters}
                simple
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                toggleHighlightedRow={markKey}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
