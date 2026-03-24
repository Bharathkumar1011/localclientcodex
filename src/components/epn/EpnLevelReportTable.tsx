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
import type { EpnLevelReportRow } from "@/lib/types";
import {
  formatStageLabel,
  getBucketLabel,
  getRelationshipStatusClass,
  getRelationshipStatusLabel,
} from "./epnReportUtils";
import { PocDetailsCell } from "./PocDetailsCell";
import { EpnLinkActionsDialog } from "./EpnLinkActionsDialog";



type Props = {
  rows: EpnLevelReportRow[];
  isLoading?: boolean;
  totalRowCount?: number;
};

export function EpnLevelReportTable({
  rows,
  isLoading = false,
  totalRowCount,
}: Props) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>EPN Level Report</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Cross-bucket lead and partner linkage view with POC visibility.
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
                    <TableHead className="min-w-[180px]">Lead Name</TableHead>
                    <TableHead className="min-w-[220px]">Lead POC Details</TableHead>
                    <TableHead className="min-w-[180px]">RM / Partner Name</TableHead>
                    <TableHead className="min-w-[150px]">RM Designation</TableHead>
                    <TableHead className="min-w-[220px]">RM POC Details</TableHead>
                    <TableHead className="min-w-[140px]">Bucket</TableHead>
                    <TableHead className="min-w-[160px]">Relationship Status</TableHead>
                    <TableHead className="min-w-[260px]">Link Remarks</TableHead>
                    <TableHead className="min-w-[120px]">Lead Stage</TableHead>
                    <TableHead className="min-w-[120px]">RM Stage</TableHead>
                    <TableHead className="min-w-[130px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    Loading EPN level report...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    No matching EPN level rows found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.epnId}-${row.leadId}`} className="align-top">
                    <TableCell>{row.serialNumber}</TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{row.leadName}</p>
                        {row.leadCity && (
                          <p className="text-xs text-muted-foreground">{row.leadCity}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <PocDetailsCell
                        name={row.leadPocName}
                        designation={row.leadPocDesignation}
                        email={row.leadPocEmail}
                        phone={row.leadPocPhone}
                        emptyLabel="No lead POC"
                      />
                    </TableCell>

                    <TableCell className="font-medium">{row.rmName}</TableCell>

                    <TableCell>{row.rmDesignation || "—"}</TableCell>

                    <TableCell>
                      <PocDetailsCell
                        name={row.rmPocName}
                        designation={row.rmDesignation}
                        email={row.rmEmail}
                        phone={row.rmPhone}
                        emptyLabel="No RM POC"
                      />
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">{getBucketLabel(row.bucket)}</Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getRelationshipStatusClass(row.relationshipStatus)}
                      >
                        {getRelationshipStatusLabel(row.relationshipStatus)}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm">
                      {row.linkRemarks?.trim() ? (
                        row.linkRemarks
                      ) : (
                        <span className="italic text-muted-foreground">No remarks</span>
                      )}
                    </TableCell>

                    <TableCell>{formatStageLabel(row.leadStage)}</TableCell>
                    <TableCell>{formatStageLabel(row.rmStage)}</TableCell>

                    <TableCell className="text-right">
                        <EpnLinkActionsDialog
                            row={{
                            epnId: row.epnId,
                            leadId: row.leadId,
                            rmName: row.rmName,
                            leadName: row.leadName,
                            relationshipStatus: row.relationshipStatus,
                            linkRemarks: row.linkRemarks,
                            leadStage: row.leadStage,
                            rmStage: row.rmStage,
                            }}
                        />
                    </TableCell>
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