import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "./components/data-table";
import DeleteModal from "./components/delete-modal";
import VoterFormModal from "./components/voter-form-modal";
import EditVoterModal from "./components/edit-voter-modal";
import DeleteVoterModal from "./components/delete-voter-modal";
import { Toaster } from "@/components/ui/toaster";
import { useVoterStore } from "@/stores/voter-store";

export default function App() {
  const { voters, loading, fetchVoters } = useVoterStore();

  useEffect(() => {
    fetchVoters();
  }, []);

  return (
    <div className="flex justify-center pt-12 bg-secondary w-full h-screen">
      <Toaster />

      <div className="w-4/5">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Manage Voters</CardTitle>
            <CardDescription>
              View, search, and manage registered voters. You can import pcvl pdf
              file or export data as excel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8 text-muted-foreground">
                Loading voters...
              </div>
            ) : (
              <DataTable data={voters} />
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteModal />
      <VoterFormModal />
      <EditVoterModal />
      <DeleteVoterModal />
    </div>
  );
}
