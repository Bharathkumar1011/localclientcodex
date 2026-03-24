import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EpnUniverseTable, { EpnPartnerRow } from "@/components/epn/EpnUniverseTable";

// ✅ 1. Import the Upload component and Icon
import EpnBulkUpload from "@/components/epn/EpnBulkUpload";
import { UploadCloud } from "lucide-react";

type EpnBucket = "idfc" | "other_channel_partner" | "other_epn";

type EpnCreatePayload = {
  name: string;
  bucket: EpnBucket;
  category?: string | null;
  stage?: "outreach" | "active" | "rainmaking";
};

const BUCKET_LABELS: Record<string, string> = {
  idfc: "IDFC",
  "other-channel-partners": "Other Channel Partners",
  "other-epn": "Other EPN",
};



// Map URL bucket -> API bucket
const BUCKET_API_MAP: Record<string, EpnBucket> = {
  idfc: "idfc",
  "other-channel-partners": "other_channel_partner",
  "other-epn": "other_epn",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "— Select —" },
  { value: "channel_partner", label: "Channel Partner" },
  { value: "agency", label: "Agency" },
  { value: "sector_expert", label: "Sector Expert" },
  { value: "loan", label: "Loan" },
  { value: "law_firm", label: "Law Firm" },
  { value: "ca_firm", label: "CA Firm" },
];

export default function EpnGroupHome() {
  const [location, setLocation] = useLocation();

  // ✅ 2. State for the Bulk Upload Modal
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // /epn/:bucket
  const parts = (location || "").split("?")[0].split("/").filter(Boolean);
  const bucketUrl = parts[1] || "";

  const bucketLabel = BUCKET_LABELS[bucketUrl] ?? bucketUrl;
  const bucketApi = BUCKET_API_MAP[bucketUrl] ?? (bucketUrl as EpnBucket);

  const queryKey = useMemo(
    () => [`/epn?bucket=${encodeURIComponent(bucketApi)}`], // NOTE: Make sure this uses /api/
    [bucketApi]
  );

  const { data, isLoading, error } = useQuery<EpnPartnerRow[]>({ queryKey });
  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{bucketLabel} — Universe</h1>
          <p className="text-muted-foreground">
            This universe shows only {bucketLabel} partners.
          </p>
        </div>
       


        {/* ✅ 3. Replaced single button with a flex container holding both buttons */}
        <div className="flex items-center gap-3">
          <button
            className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium"
            onClick={() => setShowBulkUpload(true)}
          >
            <UploadCloud className="w-4 h-4 mr-2 text-blue-600" />
            Bulk Import
          </button>
          
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm text-sm font-medium"
            onClick={() => setLocation(`/epn/add?bucket=${bucketUrl}`)}
          >
            + Add {bucketLabel}
          </button>
        </div>
      </div>

      {/* Bucket Universe Table */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-red-600">
          Failed to load: {(error as any)?.message ?? String(error)}
        </div>
      ) : (
        <EpnUniverseTable 
          title={`${bucketLabel} — Universe`} 
          rows={rows} 
          bucket={bucketApi} 
          queryKey={queryKey}
        />
      )}

      {/* ✅ 4. The Bulk Upload Modal placed at the very bottom */}
      <EpnBulkUpload 
        open={showBulkUpload} 
        onOpenChange={setShowBulkUpload} 
        defaultBucket={bucketApi} // Automatically uses the exact bucket we are in
        hideBucketSelector={true} // HIDES the dropdown so user can't accidentally change it!
      />
    </div>
  );
}