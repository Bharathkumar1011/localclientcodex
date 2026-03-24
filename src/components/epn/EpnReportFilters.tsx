import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  EpnBucketFilterValue,
  EpnLeadStageFilter,
  EpnRelationshipStatusFilter,
} from "@/lib/types";
import {
  BUCKET_META,
  LEAD_STAGE_FILTER_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
} from "./epnReportUtils";
import { RefreshCw, Search, X } from "lucide-react";

type Props = {
  bucket: EpnBucketFilterValue;
  onBucketChange: (value: EpnBucketFilterValue) => void;
  onRefresh: () => void;
  onClearFilters: () => void;
  rmSearch: string;
  onRmSearchChange: (value: string) => void;
  leadSearch: string;
  onLeadSearchChange: (value: string) => void;
  relationshipStatus: EpnRelationshipStatusFilter;
  onRelationshipStatusChange: (value: EpnRelationshipStatusFilter) => void;
  leadStage: EpnLeadStageFilter;
  onLeadStageChange: (value: EpnLeadStageFilter) => void;
  hasActiveFilters: boolean;
  idfcLeadCount: number;
  idfcLeadTotalCount: number;
  idfcRmCount: number;
  idfcRmTotalCount: number;
  epnLevelCount: number;
  epnLevelTotalCount: number;
};

export function EpnReportFilters({
  bucket,
  onBucketChange,
  onRefresh,
  onClearFilters,
  rmSearch,
  onRmSearchChange,
  leadSearch,
  onLeadSearchChange,
  relationshipStatus,
  onRelationshipStatusChange,
  leadStage,
  onLeadStageChange,
  hasActiveFilters,
  idfcLeadCount,
  idfcLeadTotalCount,
  idfcRmCount,
  idfcRmTotalCount,
  epnLevelCount,
  epnLevelTotalCount,
}: Props) {
  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              IDFC Lead Tracker
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {idfcLeadCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {idfcLeadTotalCount}
              </span>
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              IDFC RM Summary
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {idfcRmCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {idfcRmTotalCount}
              </span>
            </p>
          </div>

          <div className="rounded-xl border bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              EPN Level Report
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {epnLevelCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {epnLevelTotalCount}
              </span>
            </p>
          </div>
        </div>

<div className="rounded-lg border border-dashed bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
  These top filters are shared report filters. The IDFC Lead Tracker table now has its own separate filters and download selection inside the table.
</div>

<div className="grid gap-3 xl:grid-cols-5">
  <div className="xl:col-span-1">
            <p className="mb-2 text-sm font-medium">Search RM / Partner</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rmSearch}
                onChange={(e) => onRmSearchChange(e.target.value)}
                placeholder="Search by RM name"
                className="pl-9"
              />
            </div>
          </div>

          <div className="xl:col-span-1">
            <p className="mb-2 text-sm font-medium">Search Lead</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={leadSearch}
                onChange={(e) => onLeadSearchChange(e.target.value)}
                placeholder="Search by lead name"
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Relationship Status</p>
            <Select
              value={relationshipStatus}
              onValueChange={(value) =>
                onRelationshipStatusChange(value as EpnRelationshipStatusFilter)
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
            <p className="mb-2 text-sm font-medium">Lead Stage</p>
            <Select
              value={leadStage}
              onValueChange={(value) => onLeadStageChange(value as EpnLeadStageFilter)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All lead stages" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STAGE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">EPN Level Bucket</p>
            <Select
              value={bucket}
              onValueChange={(value) => onBucketChange(value as EpnBucketFilterValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BUCKET_META).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
<p className="text-xs text-muted-foreground">
  These top filters are shared report filters. The IDFC Lead Tracker uses its own separate filters and selection inside the table.
</p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button
              variant="ghost"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}