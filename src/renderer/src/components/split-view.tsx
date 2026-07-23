import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
import { SearchIcon, CheckCheck, Zap, Loader2, Eye, CircleMinus } from "lucide-react";
import { cn, wordsMatch } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface SheetPreview {
  headers: string[];
  rows: string[][];
  rowIds: number[];
  merges: { row: number; col: number; rowspan: number; colspan: number }[];
  headerRows: boolean[];
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const initialized = useRef(false);
  const pairMapRef = useRef<Map<number, number>>(new Map());
  const searchRef = useRef<HTMLInputElement>(null);

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

    const voterIdx = voters.findIndex(
      (v) => v.name && wordsMatch(v.name, searchQuery),
    );
    if (voterIdx === -1) return;

    const excelIdx = preview.rows.findIndex((row, i) =>
      !preview.headerRows?.[i] && row.some((cell) => wordsMatch(cell, searchQuery)),
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

  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

  const levenshtein = (a: string, b: string): number => {
    if (a.length < b.length) return levenshtein(b, a);
    if (b.length === 0) return a.length;
    let prev = new Uint8Array(b.length + 1);
    let curr = new Uint8Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 0; i < a.length; i++) {
      curr[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        curr[j + 1] = Math.min(
          curr[j] + 1,
          prev[j + 1] + 1,
          prev[j] + cost,
        );
      }
      [prev, curr] = [curr, prev];
    }
    return prev[b.length];
  };

  const reviewData = useMemo(() => {
    if (!preview) return [];
    const pairs: {
      voterId: number;
      excelRowId: number;
      voterName: string;
      excelCell: string;
      exact: boolean;
      barangay: string;
      precinct: string;
      sheet: string;
      row: string[];
    }[] = [];
    const seenVoters = new Set<number>();
    for (const [voterId, excelRowId] of pairMapRef.current) {
      if (seenVoters.has(voterId)) continue;
      seenVoters.add(voterId);

      const voter = voters.find((v) => v.voterId === voterId);
      if (!voter || !voter.isGiven) continue;

      const ri = preview.rowIds.indexOf(excelRowId);
      if (ri === -1) continue;
      const row = preview.rows[ri];

      let matchedCell = "";
      let exact = false;
      const vn = norm(voter.name);
      for (const cell of row) {
        if (!cell) continue;
        const cn = norm(cell);
        if (cn === vn) { matchedCell = cell; exact = true; break; }
        if (!matchedCell && levenshtein(cn, vn) <= 1) matchedCell = cell;
      }

      pairs.push({
        voterId: voter.voterId,
        excelRowId,
        voterName: voter.name,
        excelCell: matchedCell || row[0] || "",
        exact,
        barangay: voter.barangay,
        precinct: voter.precinct,
        sheet: activeSheet || "",
        row,
      });
    }
    pairs.sort((a, b) => a.voterName.localeCompare(b.voterName));
    return pairs;
  }, [voters, preview, selectedRowIds, activeSheet]);

  const handleRemovePair = useCallback((voterId: number, excelRowId: number) => {
    const voter = voters.find((v) => v.voterId === voterId);
    if (!voter) return;
    voter.isGiven = false;
    window.electronAPI.updateStatus({ voterId, value: false });
    setSelectedRowIds((prev) => prev.filter((id) => id !== excelRowId));
    setSelectionSyncKey((k) => k + 1);
  }, [voters]);

  const handleAutoMatch = useCallback(async () => {
    if (!preview || voters.length === 0 || !activeSheet || autoMatching) return;
    setAutoMatching(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const matchedVoterIds: number[] = [];
      const matchedRowIds: number[] = [];

      const voterNames = voters.map((v) => (v.name ? norm(v.name) : ""));

      for (const [ri, row] of preview.rows.entries()) {
        if (preview.headerRows?.[ri]) continue;
        const excelRowId = preview.rowIds[ri];
        
        let bestVoter: (typeof voters)[0] | null = null;
        let bestDist = 0;
        for (const cell of row) {
          if (!cell) continue;
          const cellValue = norm(cell);

          for (let vi = 0; vi < voters.length; vi++) {
            if (!voters[vi].name) continue;
            if (voterNames[vi] === cellValue) {
              bestVoter = voters[vi];
              bestDist = 0;
              break;
            }
            const vn = voterNames[vi];
            if (Math.abs(vn.length - cellValue.length) > 2) continue;
            const dist = levenshtein(vn, cellValue);
            if (dist <= 1 && (bestDist === 0 || dist < bestDist)) {
              bestDist = dist;
              bestVoter = voters[vi];
            }
          }
          if (bestVoter && bestDist === 0) break;
        }
        if (!bestVoter) continue;

        pairMapRef.current.set(bestVoter.voterId, excelRowId);
        bestVoter.isGiven = true;
        matchedVoterIds.push(bestVoter.voterId);
        matchedRowIds.push(excelRowId);
        window.electronAPI.savePair({ voterId: bestVoter.voterId, excelRowId });
      }

      if (matchedVoterIds.length === 0) {
        toast({ title: "No matching voters found." });
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
                  ref={searchRef}
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
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setReviewOpen(true)}
            >
              <Eye className="h-4 w-4" />
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
            <div className="h-full flex flex-col">
              {loading ? (
                <div className="flex justify-center py-8 text-muted-foreground">
                  Loading voters...
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <DataTable
                    data={voters}
                    simple
                    searchQuery={searchQuery}
                    statusFilter={statusFilter}
                    toggleHighlightedRow={markKey}
                    selectionSyncKey={selectionSyncKey}
                    onSelectionChange={handleSelectionChange}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 flex-none">
                {voters.filter((v) => v.isGiven).length} of {voters.length} row(s) selected.
              </p>
            </div>
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
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
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
                  onCellSearch={(value) => { setSearchQuery(value); searchRef.current?.focus(); }}
                />
              </div>
              {preview && (
                <p className="text-sm text-muted-foreground mt-4 flex-none">
                  {selectedRowIds.length} of {preview.rows.filter((_, i) => !preview.headerRows?.[i]).length} row(s) selected.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Review Matched Pairs ({reviewData.length})</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="w-10 h-10 px-2 font-medium text-muted-foreground">#</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Voter Name</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Excel Row</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Match</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Sheet</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Barangay</th>
                  <th className="h-10 px-2 font-medium text-muted-foreground">Precinct</th>
                  <th className="w-8 h-10 px-2 font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {reviewData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="h-24 text-center text-muted-foreground">
                      No pairs to review.
                    </td>
                  </tr>
                ) : (
                  reviewData.map((p, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b",
                        !p.exact && "bg-yellow-50 dark:bg-yellow-950/20",
                      )}
                    >
                      <td className="p-2 align-middle text-muted-foreground text-xs text-center">{i + 1}</td>
                      <td className="p-2 align-middle">{p.voterName}</td>
                      <td className="p-2 align-middle whitespace-nowrap">{p.excelCell}</td>
                      <td className="p-2 align-middle">
                        {p.exact ? (
                          <span className="text-green-600 dark:text-green-400">Exact</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Fuzzy</span>
                        )}
                      </td>
                      <td className="p-2 align-middle">{p.sheet}</td>
                      <td className="p-2 align-middle">{p.barangay}</td>
                      <td className="p-2 align-middle">{p.precinct}</td>
                      <td className="p-2 align-middle">
                        <button
                          onClick={() => handleRemovePair(p.voterId, p.excelRowId)}
                          className="text-muted-foreground hover:text-destructive leading-none p-0 border-0 bg-transparent cursor-pointer inline-flex items-center justify-center"
                        >
                          <CircleMinus className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
