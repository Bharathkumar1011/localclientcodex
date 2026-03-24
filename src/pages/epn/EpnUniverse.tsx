import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EpnUniverseTable, { EpnPartnerRow } from "@/components/epn/EpnUniverseTable";
import { useLocation } from "wouter";
import EpnBulkUpload from "@/components/epn/EpnBulkUpload";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

type EpnCreatePayload = {
  name: string;
  bucket: "idfc" | "other_channel_partner" | "other_epn";
  category?: string | null;
  stage?: "outreach" | "active" | "rainmaking";
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

export default function EpnUniverse() {
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [, setLocation] = useLocation();
  const { data, isLoading, error } = useQuery<EpnPartnerRow[]>({
    queryKey: ["/epn/universe"],
  });

  // Basic “Add partner” form (optional but very useful)
  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<EpnCreatePayload["bucket"]>("other_epn");
  const [category, setCategory] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async (payload: EpnCreatePayload) => {
      const res = await apiRequest("POST", "/epn", {
        ...payload,
        stage: "outreach", // default
        category: payload.category || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      setName("");
      setBucket("other_epn");
      setCategory("");
      await queryClient.invalidateQueries({ queryKey: ["/epn/universe"] });
    },
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div className="p-6 space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">EPN Universe</h1>
          <p className="text-muted-foreground">
            All Network Partners in one place (Master DB).
          </p>
        </div>
        {/* The New Bulk Upload Button */}
  <Button variant="outline" onClick={() => setShowBulkUpload(true)} className="bg-white">
    <UploadCloud className="w-4 h-4 mr-2 text-blue-600" />
    Bulk Import (CSV)
  </Button>

        

        {/* Add Button */}
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          onClick={() => setLocation("/epn/add")}
        >
          + Add Network Partner
        </button>
      </div>

      {/* Universe Table */}
      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="text-red-600">
          Failed to load EPN Universe: {(error as any)?.message ?? String(error)}
        </div>
      ) : (
        <EpnUniverseTable 
        rows={rows} 
        queryKey={["/epn/universe"]} 
        />
      )}

      <EpnBulkUpload 
        open={showBulkUpload} 
        onOpenChange={setShowBulkUpload} 
        defaultBucket="idfc"
        hideBucketSelector={false} // ✅ SHOWS the dropdown
        />
    </div>
  );
}