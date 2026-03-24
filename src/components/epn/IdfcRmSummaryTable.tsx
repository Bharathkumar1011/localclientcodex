import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IdfcRmSummaryRow } from "@/lib/types";
import { formatStageLabel } from "./epnReportUtils";

type Props = {
  rows: IdfcRmSummaryRow[];
  isLoading?: boolean;
  totalRowCount?: number;
};

export function IdfcRmSummaryTable({
  rows,
  isLoading = false,
  totalRowCount,
}: Props) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>IDFC RM Summary</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            RM-wise summary of linked leads across outreach, pitching, and mandates.
          </p>
        </div>

        <Badge variant="secondary">
          Showing {rows.length}
          {typeof totalRowCount === "number" ? ` / ${totalRowCount}` : ""}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">S.No.</TableHead>
                <TableHead className="min-w-[180px]">RM Name</TableHead>
                <TableHead className="min-w-[160px]">Designation</TableHead>
                <TableHead className="min-w-[120px]">City</TableHead>
                <TableHead>Total Linked Leads</TableHead>
                <TableHead>Active Leads Linked</TableHead>
                <TableHead>Outreach Count</TableHead>
                <TableHead>Pitching Count</TableHead>
                <TableHead>Mandate Count</TableHead>
                <TableHead>RM Stage</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Loading IDFC RM summary...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No matching IDFC RM summary rows found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.epnId}>
                    <TableCell>{row.serialNumber}</TableCell>
                    <TableCell className="font-medium">{row.rmName}</TableCell>
                    <TableCell>{row.designation || "—"}</TableCell>
                    <TableCell>{row.city || "—"}</TableCell>
                    <TableCell>{row.totalLinkedLeads}</TableCell>
                    <TableCell>{row.activeLinkedLeads}</TableCell>
                    <TableCell>{row.outreachCount}</TableCell>
                    <TableCell>{row.pitchingCount}</TableCell>
                    <TableCell>{row.mandateCount}</TableCell>
                    <TableCell>{formatStageLabel(row.rmStage)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}