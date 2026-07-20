import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "./data-table";
import type { Voter } from "@/types/electron";

export default function DefaultView({
  voters,
  loading,
}: {
  voters: Voter[];
  loading: boolean;
}) {
  return (
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
  );
}
