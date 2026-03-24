import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  EpnBucketFilterValue,
  EpnLeadStageFilter,
  EpnLevelReportRow,
  EpnRelationshipStatusFilter,
  IdfcLeadTrackerRow,
  IdfcRmSummaryRow,
} from "@/lib/types";
import { EpnReportPageHeader } from "@/components/epn/EpnReportPageHeader";
import { EpnReportFilters } from "@/components/epn/EpnReportFilters";
import { IdfcLeadTrackerTable } from "@/components/epn/IdfcLeadTrackerTable";
import { IdfcRmSummaryTable } from "@/components/epn/IdfcRmSummaryTable";
import { EpnLevelReportTable } from "@/components/epn/EpnLevelReportTable";

export default function EpnHome() {
  const [epnLevelBucket, setEpnLevelBucket] =
    useState<EpnBucketFilterValue>("idfc");
  const [rmSearch, setRmSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [relationshipStatus, setRelationshipStatus] =
    useState<EpnRelationshipStatusFilter>("all");
  const [leadStage, setLeadStage] = useState<EpnLeadStageFilter>("all");

  const {
    data: idfcLeadRows = [],
    isLoading: isLoadingIdfcLeadRows,
    refetch: refetchIdfcLeadRows,
  } = useQuery<IdfcLeadTrackerRow[]>({
    queryKey: ["/epn/reports/idfc-lead-tracker"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/epn/reports/idfc-lead-tracker");
      return res.json();
    },
  });

  const {
    data: idfcRmRows = [],
    isLoading: isLoadingIdfcRmRows,
    refetch: refetchIdfcRmRows,
  } = useQuery<IdfcRmSummaryRow[]>({
    queryKey: ["/epn/reports/idfc-rm-summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/epn/reports/idfc-rm-summary");
      return res.json();
    },
  });

  const {
    data: epnLevelRows = [],
    isLoading: isLoadingEpnLevelRows,
    refetch: refetchEpnLevelRows,
  } = useQuery<EpnLevelReportRow[]>({
    queryKey: ["/epn/reports/epn-level", epnLevelBucket],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/epn/reports/epn-level?bucket=${encodeURIComponent(epnLevelBucket)}`
      );
      return res.json();
    },
  });

  const normalizedRmSearch = rmSearch.trim().toLowerCase();
  const normalizedLeadSearch = leadSearch.trim().toLowerCase();

  const sharedFilteredIdfcLeadRows = useMemo(() => {
    return idfcLeadRows.filter((row) => {
      const matchesRm =
        !normalizedRmSearch ||
        row.rmName.toLowerCase().includes(normalizedRmSearch) ||
        (row.designation || "").toLowerCase().includes(normalizedRmSearch) ||
        (row.rmCity || "").toLowerCase().includes(normalizedRmSearch);

      const matchesLead =
        !normalizedLeadSearch ||
        row.leadName.toLowerCase().includes(normalizedLeadSearch) ||
        (row.leadCity || "").toLowerCase().includes(normalizedLeadSearch);

      const matchesRelationshipStatus =
        relationshipStatus === "all" || row.relationshipStatus === relationshipStatus;

      const matchesLeadStage = leadStage === "all" || row.leadStage === leadStage;

      return (
        matchesRm &&
        matchesLead &&
        matchesRelationshipStatus &&
        matchesLeadStage
      );
    });
  }, [
    idfcLeadRows,
    normalizedRmSearch,
    normalizedLeadSearch,
    relationshipStatus,
    leadStage,
  ]);

  const filteredIdfcRmRows = useMemo(() => {
    const hasLinkDrivenFilters =
      !!normalizedLeadSearch ||
      relationshipStatus !== "all" ||
      leadStage !== "all";

    const includedRmIds = new Set(sharedFilteredIdfcLeadRows.map((row) => row.epnId));

    return idfcRmRows.filter((row) => {
      const matchesRmSearch =
        !normalizedRmSearch ||
        row.rmName.toLowerCase().includes(normalizedRmSearch) ||
        (row.designation || "").toLowerCase().includes(normalizedRmSearch) ||
        (row.city || "").toLowerCase().includes(normalizedRmSearch);

      if (!matchesRmSearch) return false;

      if (!hasLinkDrivenFilters) return true;

      return includedRmIds.has(row.epnId);
    });
  }, [
    idfcRmRows,
    sharedFilteredIdfcLeadRows,
    normalizedRmSearch,
    normalizedLeadSearch,
    relationshipStatus,
    leadStage,
  ]);

  const filteredEpnLevelRows = useMemo(() => {
    return epnLevelRows.filter((row) => {
      const matchesRm =
        !normalizedRmSearch ||
        row.rmName.toLowerCase().includes(normalizedRmSearch) ||
        (row.rmDesignation || "").toLowerCase().includes(normalizedRmSearch) ||
        (row.rmCity || "").toLowerCase().includes(normalizedRmSearch) ||
        (row.rmPocName || "").toLowerCase().includes(normalizedRmSearch);

      const matchesLead =
        !normalizedLeadSearch ||
        row.leadName.toLowerCase().includes(normalizedLeadSearch) ||
        (row.leadCity || "").toLowerCase().includes(normalizedLeadSearch) ||
        (row.leadPocName || "").toLowerCase().includes(normalizedLeadSearch);

      const matchesRelationshipStatus =
        relationshipStatus === "all" || row.relationshipStatus === relationshipStatus;

      const matchesLeadStage = leadStage === "all" || row.leadStage === leadStage;

      return (
        matchesRm &&
        matchesLead &&
        matchesRelationshipStatus &&
        matchesLeadStage
      );
    });
  }, [
    epnLevelRows,
    normalizedRmSearch,
    normalizedLeadSearch,
    relationshipStatus,
    leadStage,
  ]);

  const hasActiveFilters =
    epnLevelBucket !== "idfc" ||
    rmSearch.trim().length > 0 ||
    leadSearch.trim().length > 0 ||
    relationshipStatus !== "all" ||
    leadStage !== "all";

  const handleRefresh = async () => {
    await Promise.all([
      refetchIdfcLeadRows(),
      refetchIdfcRmRows(),
      refetchEpnLevelRows(),
    ]);
  };

  const handleClearFilters = () => {
    setEpnLevelBucket("idfc");
    setRmSearch("");
    setLeadSearch("");
    setRelationshipStatus("all");
    setLeadStage("all");
  };

  return (
    <div className="space-y-6 p-6">
      <EpnReportPageHeader />

      <EpnReportFilters
        bucket={epnLevelBucket}
        onBucketChange={setEpnLevelBucket}
        onRefresh={handleRefresh}
        onClearFilters={handleClearFilters}
        rmSearch={rmSearch}
        onRmSearchChange={setRmSearch}
        leadSearch={leadSearch}
        onLeadSearchChange={setLeadSearch}
        relationshipStatus={relationshipStatus}
        onRelationshipStatusChange={setRelationshipStatus}
        leadStage={leadStage}
        onLeadStageChange={setLeadStage}
        hasActiveFilters={hasActiveFilters}
        idfcLeadCount={idfcLeadRows.length}
        idfcLeadTotalCount={idfcLeadRows.length}
        idfcRmCount={filteredIdfcRmRows.length}
        idfcRmTotalCount={idfcRmRows.length}
        epnLevelCount={filteredEpnLevelRows.length}
        epnLevelTotalCount={epnLevelRows.length}
      />

      <IdfcLeadTrackerTable
        rows={idfcLeadRows}
        totalRowCount={idfcLeadRows.length}
        isLoading={isLoadingIdfcLeadRows}
      />

      <IdfcRmSummaryTable
        rows={filteredIdfcRmRows}
        totalRowCount={idfcRmRows.length}
        isLoading={isLoadingIdfcRmRows}
      />

      <EpnLevelReportTable
        rows={filteredEpnLevelRows}
        totalRowCount={epnLevelRows.length}
        isLoading={isLoadingEpnLevelRows}
      />
    </div>
  );
}