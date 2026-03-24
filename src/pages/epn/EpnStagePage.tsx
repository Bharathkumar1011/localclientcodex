import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import EpnUniverseTable, { EpnPartnerRow } from "@/components/epn/EpnUniverseTable";

const BUCKET_LABELS: Record<string, string> = {
  idfc: "IDFC",
  "other-channel-partners": "Other Channel Partners",
  "other-epn": "Other EPN",
};

// URL stage is same as API stage: outreach/active/rainmaking
const STAGE_LABELS: Record<string, string> = {
  outreach: "Outreach",
  active: "Active",
  rainmaking: "RainMaking",
};

// Map URL bucket -> API bucket
const BUCKET_API_MAP: Record<string, string> = {
  idfc: "idfc",
  "other-channel-partners": "other_channel_partner",
  "other-epn": "other_epn",
};

export default function EpnStagePage() {
  const [location] = useLocation();

  const parts = (location || "").split("?")[0].split("/").filter(Boolean);
  const bucketUrl = parts[1] || "";
  const stage = parts[2] || "";

  const bucketLabel = BUCKET_LABELS[bucketUrl] ?? bucketUrl;
  const stageLabel = STAGE_LABELS[stage] ?? stage;

  const bucketApi = BUCKET_API_MAP[bucketUrl] ?? bucketUrl;

  const queryKey = useMemo(
    () => [`/epn?bucket=${encodeURIComponent(bucketApi)}&stage=${encodeURIComponent(stage)}`],
    [bucketApi, stage]
  );

  const { data, isLoading, error } = useQuery<EpnPartnerRow[]>({
    queryKey,
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {bucketLabel} — {stageLabel}
        </h1>
        <p className="text-muted-foreground">
          Showing partners in this stage (same columns as Universe).
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-red-600">
          Failed to load: {(error as any)?.message ?? String(error)}
        </div>
      ) : (
        <EpnUniverseTable 
          title={`${bucketLabel} — ${stageLabel}`} 
          rows={rows} 
          bucket={bucketApi} 
          queryKey={queryKey}
        />
      )}
    </div>
  );
}
