import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import LoadingButton from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";

function ExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (onlySelected: boolean) => {
    setExporting(true);
    const res = await window.electronAPI.exportExcel({ onlySelected });

    if (res.success) {
      toast({
        title: res.msg,
        description: "File has been saved successfully.",
        action: res.filePath ? (
          <ToastAction
            altText="Open exported file"
            onClick={() => window.electronAPI.openPath(res.filePath!)}
          >
            Open
          </ToastAction>
        ) : undefined,
      });
    } else if (res.msg !== "Export cancelled.") {
      toast({
        title: res.msg,
        description: onlySelected
          ? "Mark voters as given first to export only the selected ones."
          : "Try importing PCVL files first to populate the table.",
      });
    }

    setExporting(false);
  };

  if (exporting) {
    return <LoadingButton variant={"default"} label="Exporting" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          Export <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport(false)}>
          Export All
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(true)}>
          Export Selected
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportButton;
