import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useModalStore } from "@/stores/modal-store";
import type { Voter } from "@/types/electron";

export default function ActionsCell({ voter }: { voter: Voter }) {
  const { setEditVoter, setDeleteVoter } = useModalStore();

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" onClick={() => setEditVoter(voter)}>
        <Pencil className="size-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleteVoter(voter)}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
