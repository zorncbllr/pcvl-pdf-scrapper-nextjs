import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DefaultView from "./components/default-view";
import SplitView from "./components/split-view";
import DeleteModal from "./components/delete-modal";
import VoterFormModal from "./components/voter-form-modal";
import EditVoterModal from "./components/edit-voter-modal";
import DeleteVoterModal from "./components/delete-voter-modal";
import { Toaster } from "@/components/ui/toaster";
import { useVoterStore } from "@/stores/voter-store";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function App() {
  const { voters, loading, fetchVoters } = useVoterStore();
  const [view, setView] = useState("default");

  const [fileBuffer, setFileBuffer] = useState<number[] | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: string[][];
    rowIds: number[];
    merges: { row: number; col: number; rowspan: number; colspan: number }[];
    headerRows: boolean[];
    headerRow: number;
  } | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const loadSheet = useCallback(async (data: number[], sheetName: string) => {
    setLoadingSheet(true);
    setActiveSheet(sheetName);
    try {
      const result = await window.electronAPI.readExcelSheet({
        data,
        sheetName,
      });
      setPreview(result);
    } catch {
      toast({
        title: "Failed to read sheet data.",
        variant: "destructive",
      });
    }
    setLoadingSheet(false);
  }, []);

  const handleFileSelect = useCallback(
    async (file: File | null) => {
      if (!file) {
        await window.electronAPI.deleteExcelFile();
        setFileBuffer(null);
        setSheets([]);
        setActiveSheet(null);
        setPreview(null);
        setFileName(null);
        setResetKey((k) => k + 1);
        return;
      }
      setActiveSheet(null);
      setPreview(null);
      setFileName(file.name);
      try {
        const buf = await file.arrayBuffer();
        const data = Array.from(new Uint8Array(buf));
        setFileBuffer(data);
        const result = await window.electronAPI.readExcel(data);
        setSheets(result.sheets);
        if (result.sheets.length > 0) {
          await loadSheet(data, result.sheets[0]);
        }
        await window.electronAPI.saveExcelFile({
          buffer: data,
          fileName: file.name,
          sheets: result.sheets,
          activeSheet: result.sheets[0] ?? "",
        });
      } catch {
        toast({
          title: "Failed to read Excel file.",
          variant: "destructive",
        });
        setFileBuffer(null);
      }
    },
    [loadSheet],
  );

  const handleSheetClick = useCallback(
    async (sheetName: string) => {
      if (!fileBuffer) return;
      await loadSheet(fileBuffer, sheetName);
      if (fileName && sheets.length > 0) {
        await window.electronAPI.saveExcelFile({
          buffer: fileBuffer,
          fileName,
          sheets,
          activeSheet: sheetName,
        });
      }
    },
    [fileBuffer, loadSheet, fileName, sheets],
  );

  useEffect(() => {
    fetchVoters();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await window.electronAPI.loadExcelFile();
      if (!saved) {
        console.log("[excel-persist] No saved Excel file found.");
        return;
      }
      console.log("[excel-persist] Restoring:", saved.fileName, saved.sheets, saved.activeSheet);
      setFileBuffer(saved.buffer);
      setSheets(saved.sheets);
      setFileName(saved.fileName);
      if (!saved.activeSheet) {
        console.log("[excel-persist] No active sheet, skipping preview load.");
        return;
      }
      setLoadingSheet(true);
      setActiveSheet(saved.activeSheet);
      try {
        const result = await window.electronAPI.readExcelSheet({
          data: saved.buffer,
          sheetName: saved.activeSheet,
        });
        setPreview(result);
        toast({
          title: `Excel file restored: ${saved.fileName}`,
        });
      } catch (e) {
        console.error("[excel-persist] Failed to restore preview", e);
        toast({
          title: "Failed to restore Excel preview.",
          variant: "destructive",
        });
      }
      setLoadingSheet(false);
    })();
  }, []);

  return (
    <div className="flex justify-center pt-12 bg-secondary w-full h-screen">
      <Toaster />

      <div
        className={cn(
          "w-full px-4",
          view === "default" && "w-4/5 px-0 mx-auto",
        )}
      >
        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="default">Default</TabsTrigger>
            <TabsTrigger value="split">Split</TabsTrigger>
          </TabsList>
          <TabsContent value="default" forceMount>
            <div hidden={view !== "default"}>
              <DefaultView voters={voters} loading={loading} />
            </div>
          </TabsContent>
          <TabsContent value="split" forceMount>
            <div hidden={view !== "split"}>
              <SplitView
                voters={voters}
                loading={loading}
                sheets={sheets}
                activeSheet={activeSheet}
                preview={preview}
                loadingSheet={loadingSheet}
                fileName={fileName}
                resetKey={resetKey}
                onFileSelect={handleFileSelect}
                onSheetClick={handleSheetClick}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DeleteModal />
      <VoterFormModal />
      <EditVoterModal />
      <DeleteVoterModal />
    </div>
  );
}
