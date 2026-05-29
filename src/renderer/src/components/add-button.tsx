import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useModalStore } from "@/stores/modal-store";

function AddButton() {
  const { setOpenForm } = useModalStore();

  return (
    <Button variant={"outline"} onClick={() => setOpenForm(true)}>
      <Plus />
    </Button>
  );
}

export default AddButton;
