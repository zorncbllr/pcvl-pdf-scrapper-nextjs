import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { useModalStore } from "@/stores/modal-store";

function ClearButton() {
  const { setOpenClear } = useModalStore();

  return (
    <Button variant={"outline"} onClick={() => setOpenClear(true)}>
      <Trash />
    </Button>
  );
}

export default ClearButton;
