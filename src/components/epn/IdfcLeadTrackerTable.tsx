import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IdfcLeadTrackerRow } from "@/lib/types";
import {
  formatStageLabel,
  getRelationshipStatusClass,
  getRelationshipStatusLabel,
} from "./epnReportUtils";
import { EpnLinkActionsDialog } from "./EpnLinkActionsDialog";

type Props = {
  rows: IdfcLeadTrackerRow[];
  isLoading?: boolean;
  totalRowCount?: number;
};

type IdfcLeadTrackerFilters = {
  serialNumber: string;
  rmName: string;
  designation: string;
  rmCity: string;
  leadName: string;
  leadCity: string;
  leadStage: string;
  relationshipStatus: string;
  linkRemarks: string;
  rmStage: string;
};

const INITIAL_FILTERS: IdfcLeadTrackerFilters = {
  serialNumber: "",
  rmName: "",
  designation: "",
  rmCity: "",
  leadName: "",
  leadCity: "",
  leadStage: "all",
  relationshipStatus: "all",
  linkRemarks: "",
  rmStage: "all",
};

const LEAD_STAGE_OPTIONS = [
  { value: "all", label: "All lead stages" },
  { value: "outreach", label: "Outreach" },
  { value: "pitching", label: "Pitching" },
  { value: "mandates", label: "Mandates" },
  { value: "hold", label: "Hold" },
  { value: "dropped", label: "Dropped" },
  { value: "rejected", label: "Rejected" },
];

const RELATIONSHIP_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "yet_to_contact", label: "Yet to Contact" },
  { value: "positive", label: "Positive" },
  { value: "hold", label: "Hold" },
  { value: "no_response", label: "No Response" },
  { value: "rejected", label: "Rejected" },
  { value: "dropped", label: "Dropped" },
];

const RM_STAGE_OPTIONS = [
  { value: "all", label: "All RM stages" },
  { value: "outreach", label: "Outreach" },
  { value: "active", label: "Active" },
  { value: "rainmaking", label: "Rainmaking" },
];

function getRowKey(row: IdfcLeadTrackerRow) {
  return `${row.epnId}::${row.leadId}`;
}

export function IdfcLeadTrackerTable({
  rows,
  isLoading = false,
  totalRowCount,
}: Props) {
  const [filters, setFilters] = useState<IdfcLeadTrackerFilters>(INITIAL_FILTERS);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<IdfcLeadTrackerRow[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const normalizedFilters = useMemo(
    () => ({
      serialNumber: filters.serialNumber.trim().toLowerCase(),
      rmName: filters.rmName.trim().toLowerCase(),
      designation: filters.designation.trim().toLowerCase(),
      rmCity: filters.rmCity.trim().toLowerCase(),
      leadName: filters.leadName.trim().toLowerCase(),
      leadCity: filters.leadCity.trim().toLowerCase(),
      leadStage: filters.leadStage,
      relationshipStatus: filters.relationshipStatus,
      linkRemarks: filters.linkRemarks.trim().toLowerCase(),
      rmStage: filters.rmStage,
    }),
    [filters]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSerial =
        !normalizedFilters.serialNumber ||
        String(row.serialNumber).toLowerCase().includes(normalizedFilters.serialNumber);

      const matchesRmName =
        !normalizedFilters.rmName ||
        (row.rmName || "").toLowerCase().includes(normalizedFilters.rmName);

      const matchesDesignation =
        !normalizedFilters.designation ||
        (row.designation || "").toLowerCase().includes(normalizedFilters.designation);

      const matchesRmCity =
        !normalizedFilters.rmCity ||
        (row.rmCity || "").toLowerCase().includes(normalizedFilters.rmCity);

      const matchesLeadName =
        !normalizedFilters.leadName ||
        (row.leadName || "").toLowerCase().includes(normalizedFilters.leadName);

      const matchesLeadCity =
        !normalizedFilters.leadCity ||
        (row.leadCity || "").toLowerCase().includes(normalizedFilters.leadCity);

      const matchesLeadStage =
        normalizedFilters.leadStage === "all" ||
        row.leadStage === normalizedFilters.leadStage;

      const matchesRelationshipStatus =
        normalizedFilters.relationshipStatus === "all" ||
        row.relationshipStatus === normalizedFilters.relationshipStatus;

      const matchesLinkRemarks =
        !normalizedFilters.linkRemarks ||
        (row.linkRemarks || "").toLowerCase().includes(normalizedFilters.linkRemarks);

      const matchesRmStage =
        normalizedFilters.rmStage === "all" ||
        row.rmStage === normalizedFilters.rmStage;

      return (
        matchesSerial &&
        matchesRmName &&
        matchesDesignation &&
        matchesRmCity &&
        matchesLeadName &&
        matchesLeadCity &&
        matchesLeadStage &&
        matchesRelationshipStatus &&
        matchesLinkRemarks &&
        matchesRmStage
      );
    });
  }, [rows, normalizedFilters]);

  useEffect(() => {
    const availableKeys = new Set(rows.map(getRowKey));
    setSelectedRowKeys((prev) => prev.filter((key) => availableKeys.has(key)));
  }, [rows]);

  const visibleRowKeys = useMemo(
    () => filteredRows.map((row) => getRowKey(row)),
    [filteredRows]
  );

  const selectedVisibleRows = useMemo(() => {
    const selectedSet = new Set(selectedRowKeys);
    return filteredRows.filter((row) => selectedSet.has(getRowKey(row)));
  }, [filteredRows, selectedRowKeys]);

  const allVisibleSelected =
    visibleRowKeys.length > 0 && visibleRowKeys.every((key) => selectedRowKeys.includes(key));

  const hasAnySelection = selectedRowKeys.length > 0;

  const selectedPayload = useMemo(
    () =>
      selectedVisibleRows.map((row) => ({
        epnId: row.epnId,
        leadId: row.leadId,
      })),
    [selectedVisibleRows]
  );

  const backendFilters = useMemo(
    () => ({
      serialNumber: filters.serialNumber || undefined,
      rmName: filters.rmName || undefined,
      designation: filters.designation || undefined,
      rmCity: filters.rmCity || undefined,
      leadName: filters.leadName || undefined,
      leadCity: filters.leadCity || undefined,
      leadStage: filters.leadStage === "all" ? undefined : filters.leadStage,
      relationshipStatus:
        filters.relationshipStatus === "all" ? undefined : filters.relationshipStatus,
      linkRemarks: filters.linkRemarks || undefined,
      rmStage: filters.rmStage === "all" ? undefined : filters.rmStage,
    }),
    [filters]
  );

  const handleFilterChange = (
    key: keyof IdfcLeadTrackerFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleRow = (row: IdfcLeadTrackerRow, checked: boolean) => {
    const rowKey = getRowKey(row);

    setSelectedRowKeys((prev) => {
      if (checked) {
        return prev.includes(rowKey) ? prev : [...prev, rowKey];
      }
      return prev.filter((key) => key !== rowKey);
    });
  };

  const handleToggleAllVisible = (checked: boolean) => {
    if (checked) {
      setSelectedRowKeys((prev) => {
        const next = new Set(prev);
        visibleRowKeys.forEach((key) => next.add(key));
        return Array.from(next);
      });
      return;
    }

    setSelectedRowKeys((prev) => prev.filter((key) => !visibleRowKeys.includes(key)));
  };

  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const handleClearSelection = () => {
    setSelectedRowKeys([]);
    setPreviewRows([]);
    setIsPreviewOpen(false);
  };

  const handlePreview = async () => {
    if (selectedVisibleRows.length === 0) {
      window.alert("Please select at least one visible IDFC Lead Tracker row to preview.");
      return;
    }

    try {
      setIsPreviewLoading(true);
      setIsPreviewOpen(true);

      const response = await apiRequest(
        "POST",
        "/epn/reports/idfc-lead-tracker/preview",
        {
          filters: backendFilters,
          selectedRows: selectedPayload,
        }
      );

      const data = await response.json();
      setPreviewRows(data.rows || []);
    } catch (error) {
      console.error("Failed to preview export:", error);
      window.alert("Failed to preview IDFC Lead Tracker export.");
      setIsPreviewOpen(false);
      setPreviewRows([]);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDownload = async () => {
    if (selectedVisibleRows.length === 0) {
      window.alert("Please select at least one visible IDFC Lead Tracker row to download.");
      return;
    }

    try {
      setIsExporting(true);

      const response = await apiRequest(
        "POST",
        "/epn/reports/idfc-lead-tracker/export",
        {
          filters: backendFilters,
          selectedRows: selectedPayload,
        }
      );

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);

      link.href = fileUrl;
      link.download = `idfc-lead-tracker-${today}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Failed to export IDFC lead tracker:", error);
      window.alert("Failed to download IDFC Lead Tracker export.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>IDFC Lead Tracker</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Detailed RM to lead linkage view for IDFC partners.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            These filters apply only to this table. Preview and download include only the selected visible rows.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Badge variant="secondary" className="justify-center">
            Showing {filteredRows.length}
            {typeof totalRowCount === "number" ? ` / ${totalRowCount}` : ""}
          </Badge>

          <Badge variant="outline" className="justify-center">
            Selected {selectedVisibleRows.length}
          </Badge>

          <Button
            type="button"
            variant="outline"
            onClick={handleClearFilters}
            disabled={isLoading}
          >
            Clear Filters
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleClearSelection}
            disabled={!hasAnySelection || isLoading}
          >
            Clear Selection
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading || selectedVisibleRows.length === 0 || isPreviewLoading}
          >
            {isPreviewLoading ? "Loading Preview..." : "Preview Download"}
          </Button>

          <Button
            type="button"
            onClick={handleDownload}
            disabled={isLoading || selectedVisibleRows.length === 0 || isExporting}
          >
            {isExporting ? "Downloading..." : "Download Selected"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <p className="mb-2 text-sm font-medium">S.No.</p>
            <Input
              value={filters.serialNumber}
              onChange={(e) => handleFilterChange("serialNumber", e.target.value)}
              placeholder="Filter S.No."
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">RM Name</p>
            <Input
              value={filters.rmName}
              onChange={(e) => handleFilterChange("rmName", e.target.value)}
              placeholder="Filter RM name"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Designation</p>
            <Input
              value={filters.designation}
              onChange={(e) => handleFilterChange("designation", e.target.value)}
              placeholder="Filter designation"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">RM City</p>
            <Input
              value={filters.rmCity}
              onChange={(e) => handleFilterChange("rmCity", e.target.value)}
              placeholder="Filter RM city"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Lead Name</p>
            <Input
              value={filters.leadName}
              onChange={(e) => handleFilterChange("leadName", e.target.value)}
              placeholder="Filter lead name"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Lead City</p>
            <Input
              value={filters.leadCity}
              onChange={(e) => handleFilterChange("leadCity", e.target.value)}
              placeholder="Filter lead city"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Lead Stage</p>
            <Select
              value={filters.leadStage}
              onValueChange={(value) => handleFilterChange("leadStage", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All lead stages" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Relationship Status</p>
            <Select
              value={filters.relationshipStatus}
              onValueChange={(value) =>
                handleFilterChange("relationshipStatus", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Link Remarks</p>
            <Input
              value={filters.linkRemarks}
              onChange={(e) => handleFilterChange("linkRemarks", e.target.value)}
              placeholder="Filter link remarks"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">RM Stage</p>
            <Select
              value={filters.rmStage}
              onValueChange={(value) => handleFilterChange("rmStage", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All RM stages" />
              </SelectTrigger>
              <SelectContent>
                {RM_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isPreviewOpen && (
          <div className="rounded-xl border bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Download Preview</p>
                <p className="text-xs text-muted-foreground">
                  Previewing the exact selected rows that will be downloaded.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close Preview
              </Button>
            </div>

            <div className="max-h-[320px] overflow-auto rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">S.No.</TableHead>
                    <TableHead className="min-w-[180px]">RM Name</TableHead>
                    <TableHead className="min-w-[180px]">Lead Name</TableHead>
                    <TableHead className="min-w-[120px]">Lead City</TableHead>
                    <TableHead className="min-w-[120px]">Lead Stage</TableHead>
                    <TableHead className="min-w-[160px]">Relationship Status</TableHead>
                    <TableHead className="min-w-[220px]">Link Remarks</TableHead>
                    <TableHead className="min-w-[120px]">RM Stage</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isPreviewLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Loading preview...
                      </TableCell>
                    </TableRow>
                  ) : previewRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No preview rows found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewRows.map((row) => (
                      <TableRow key={`preview-${row.epnId}-${row.leadId}`}>
                        <TableCell>{row.serialNumber}</TableCell>
                        <TableCell>{row.rmName}</TableCell>
                        <TableCell>{row.leadName}</TableCell>
                        <TableCell>{row.leadCity || "—"}</TableCell>
                        <TableCell>{formatStageLabel(row.leadStage)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getRelationshipStatusClass(row.relationshipStatus)}
                          >
                            {getRelationshipStatusLabel(row.relationshipStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[240px] whitespace-pre-wrap text-sm">
                          {row.linkRemarks?.trim() || "—"}
                        </TableCell>
                        <TableCell>{formatStageLabel(row.rmStage)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56px]">
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) =>
                        handleToggleAllVisible(Boolean(checked))
                      }
                      aria-label="Select all visible rows"
                    />
                  </div>
                </TableHead>
                <TableHead className="w-[70px]">S.No.</TableHead>
                <TableHead className="min-w-[180px]">RM Name</TableHead>
                <TableHead className="min-w-[180px]">Lead Name</TableHead>
                <TableHead className="min-w-[120px]">Lead City</TableHead>
                <TableHead className="min-w-[120px]">Lead Stage</TableHead>
                <TableHead className="min-w-[160px]">Relationship Status</TableHead>
                <TableHead className="min-w-[260px]">Link Remarks</TableHead>
                <TableHead className="min-w-[120px]">RM Stage</TableHead>
                <TableHead className="min-w-[130px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Loading IDFC lead tracker...
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No matching IDFC linked leads found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const rowKey = getRowKey(row);
                  const isSelected = selectedRowKeys.includes(rowKey);

                  return (
                    <TableRow key={rowKey} className="align-top">
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleToggleRow(row, Boolean(checked))
                            }
                            aria-label={`Select row ${row.serialNumber}`}
                          />
                        </div>
                      </TableCell>

                      <TableCell>{row.serialNumber}</TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{row.rmName}</p>
                          {row.designation && (
                            <p className="text-xs text-muted-foreground">{row.designation}</p>
                          )}
                          {row.rmCity && (
                            <p className="text-xs text-muted-foreground">{row.rmCity}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="font-medium">{row.leadName}</TableCell>
                      <TableCell>{row.leadCity || "—"}</TableCell>
                      <TableCell>{formatStageLabel(row.leadStage)}</TableCell>

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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}