import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import LoadingButton from "@/components/ui/loading-button";
import { useVoterStore } from "@/stores/voter-store";

function ImportButton() {
  const [importing, setImporting] = useState(false);
  const fetchVoters = useVoterStore((s) => s.fetchVoters);

  const handleImport = async () => {
    setImporting(true);
    const res = await window.electronAPI.importPDF();

    if (res.success) {
      toast({
        title: res.msg,
        description: "You can manage them now in voters table.",
      });
      await fetchVoters();
    } else if (res.msg !== "Import cancelled.") {
      toast({
        title: "Unable to import PCVL file.",
        description: res.msg,
      });
    }

    setImporting(false);
  };

  return (
    <>
      {importing ? (
        <LoadingButton variant={"outline"} label="Importing" />
      ) : (
        <Button variant={"outline"} onClick={handleImport}>
          Import
        </Button>
      )}
    </>
  );
}

export default ImportButton;
