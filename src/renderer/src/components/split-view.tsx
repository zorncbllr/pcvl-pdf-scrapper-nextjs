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
import { SearchIcon, CheckCheck, Zap, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";
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
  rowIds: number[];
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
  const [selectedRowIds, setSelectedRowIds] = useState<number[]>([]);
  const [selectionSyncKey, setSelectionSyncKey] = useState(0);
  const [autoMatching, setAutoMatching] = useState(false);
  const initialized = useRef(false);
  const pairMapRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    window.electronAPI.getPairs().then((pairs) => {
      const map = new Map<number, number>();
      for (const p of pairs) {
        map.set(p.voterId, p.excelRowId);
      }
      pairMapRef.current = map;
    });
  }, []);

  useEffect(() => {
    pairMapRef.current = new Map();
    window.electronAPI.clearPairs();
  }, [preview]);

  useEffect(() => {
    if (initialized.current || voters.length === 0) return;
    initialized.current = true;
    const ids = voters.reduce((acc, v, i) => {
      if (v.isGiven) {
        const rowId = pairMapRef.current.get(v.voterId);
        if (rowId !== undefined) acc.push(rowId);
      }
      return acc;
    }, [] as number[]);
    setSelectedRowIds(ids);
  }, [voters]);

  const handleSelectionChange = useCallback(
    (voterIndices: number[]): void => {
      if (!preview) {
        setSelectedRowIds(voterIndices);
        return;
      }
      const seen = new Set<number>();
      const result: number[] = [];
      const map = pairMapRef.current;
      for (const vi of voterIndices) {
        const voter = voters[vi];
        if (!voter) continue;
        const rowId = map.get(voter.voterId);
        if (rowId !== undefined) {
          seen.add(rowId);
          result.push(rowId);
        }
      }
      for (const voter of voters) {
        if (voter.isGiven) {
          const rowId = map.get(voter.voterId);
          if (rowId !== undefined && !seen.has(rowId)) {
            seen.add(rowId);
            result.push(rowId);
          }
        }
      }
      setSelectedRowIds(result);
    },
    [voters, preview],
  );

  const handleMark = useCallback(() => {
    if (!searchQuery || !preview) return;
    const q = searchQuery.toLowerCase();

    const voterIdx = voters.findIndex(
      (v) => v.name && v.name.toLowerCase().includes(q),
    );
    if (voterIdx === -1) return;

    const excelIdx = preview.rows.findIndex((row) =>
      row.some((cell) => cell.toLowerCase().includes(q)),
    );
    if (excelIdx === -1) return;

    const voter = voters[voterIdx];
    const excelRowId = preview.rowIds[excelIdx];

    pairMapRef.current.set(voter.voterId, excelRowId);
    window.electronAPI.savePair({ voterId: voter.voterId, excelRowId });

    const newValue = !voter.isGiven;
    voter.isGiven = newValue;
    window.electronAPI.updateStatus({
      voterId: voter.voterId,
      value: newValue,
    });

    setSelectedRowIds((prev) =>
      prev.includes(excelRowId)
        ? prev.filter((id) => id !== excelRowId)
        : [...prev, excelRowId],
    );

    setMarkKey((k) => k + 1);
    setSelectionSyncKey((k) => k + 1);
  }, [searchQuery, voters, preview]);

  const handleAutoMatch = useCallback(async () => {
    if (!preview || voters.length === 0 || !activeSheet || autoMatching) return;
    setAutoMatching(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const matchedVoterIds: number[] = [];
      const matchedRowIds: number[] = [];

      const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

      for (const [ri, row] of preview.rows.entries()) {
        const excelRowId = preview.rowIds[ri];

        let bestVoter: (typeof voters)[0] | null = null;
        for (const cell of row) {
          if (!cell) continue;
          const cellValue = norm(cell);
          const vi = voters.findIndex(
            (v) => v.name && norm(v.name) === cellValue,
          );
          if (vi !== -1) {
            bestVoter = voters[vi];
            break;
          }
        }
        if (!bestVoter) continue;

        pairMapRef.current.set(bestVoter.voterId, excelRowId);
        bestVoter.isGiven = true;
        matchedVoterIds.push(bestVoter.voterId);
        matchedRowIds.push(excelRowId);
        window.electronAPI.savePair({ voterId: bestVoter.voterId, excelRowId });
      }

      if (matchedVoterIds.length === 0) {
        toast({ title: "No exact name matches found." });
        return;
      }

      await window.electronAPI.updateAllStatus({
        voterIds: matchedVoterIds,
        value: true,
      });

      const merged = new Set([...selectedRowIds, ...matchedRowIds]);
      setSelectedRowIds(Array.from(merged));
      setSelectionSyncKey((k) => k + 1);

      toast({ title: `Auto-matched ${matchedVoterIds.length} voter(s).` });
    } finally {
      setAutoMatching(false);
    }
  }, [voters, preview, activeSheet, selectedRowIds, autoMatching]);

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
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleAutoMatch}
              disabled={!preview || !activeSheet || autoMatching}
            >
              {autoMatching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
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
                selectionSyncKey={selectionSyncKey}
                onSelectionChange={handleSelectionChange}
              />
            )}
          </CardContent>
        </Card>
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
              statusFilter={statusFilter}
              selectedRowIds={selectedRowIds}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
