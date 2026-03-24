import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Basic types for our data
type EpnPartner = {
  id: number;
  name: string;
  bucket: string;
  category: string | null;
};

type Lead = {
  id: number;
  companyName?: string;
  name?: string; // fallback
};

export default function LinkEpnPage() {
  const params = useParams();
  const leadId = Number(params.id);
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch Lead Details (so we know which company we are linking to)
  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: [`/leads/${leadId}`],
    enabled: !!leadId,
  });

  // 2. Fetch ALL Network Partners (The Universe)
  const { data: allEpns = [], isLoading: epnsLoading } = useQuery<EpnPartner[]>({
    queryKey: ["epn", "universe"],// Adjust to your actual universe GET route if different
  });

  // 3. Fetch Currently LINKED Network Partners
  const { data: linkedEpns = [], isLoading: linkedLoading } = useQuery<EpnPartner[]>({
    queryKey: [`/epn/linked-to-lead/${leadId}`],
    enabled: !!leadId,
  });

  // --- MUTATIONS ---

const linkMutation = useMutation({
  mutationFn: async (epnId: number) => {
    await apiRequest("POST", `/epn/${epnId}/link-lead`, { leadId });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/epn/linked-to-lead/${leadId}`] });
    queryClient.invalidateQueries({ queryKey: ["/epn"] });
    queryClient.invalidateQueries({ queryKey: ["/api/epn/bucket-metrics"] });

    // ✅ Keep these only if you actually have these query keys elsewhere
    queryClient.invalidateQueries({ queryKey: ["leads", "stage", "all"] });
    queryClient.invalidateQueries({ queryKey: ["epn", "links", "universe-all"] });
    queryClient.invalidateQueries({ queryKey: ["epn", "links"] });

    // ✅ Refresh any lead stage list used anywhere (Universe/Qualified/etc.)
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "leads" &&
        q.queryKey[1] === "stage",
    });

    // ✅ Refresh ALL epn links queries: ["epn","links",...]
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "epn" &&
        q.queryKey[1] === "links",
    });

    // ✅ Refresh universe list of EPN partners
    queryClient.invalidateQueries({ queryKey: ["epn", "universe"] });
  },
});



const unlinkMutation = useMutation({
  mutationFn: async (epnId: number) => {
    await apiRequest("DELETE", `/epn/${epnId}/link-lead/${leadId}`);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/epn/linked-to-lead/${leadId}`] });
    queryClient.invalidateQueries({ queryKey: ["/epn"] });
    queryClient.invalidateQueries({ queryKey: ["/api/epn/bucket-metrics"] });

    // ✅ Keep these only if you actually have these query keys elsewhere
    queryClient.invalidateQueries({ queryKey: ["leads", "stage", "all"] });
    queryClient.invalidateQueries({ queryKey: ["epn", "links", "universe-all"] });
    queryClient.invalidateQueries({ queryKey: ["epn", "links"] });

    // ✅ Refresh any lead stage list used anywhere (Universe/Qualified/etc.)
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "leads" &&
        q.queryKey[1] === "stage",
    });

    // ✅ Refresh ALL epn links queries: ["epn","links",...]
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "epn" &&
        q.queryKey[1] === "links",
    });

    // ✅ Refresh universe list of EPN partners
    queryClient.invalidateQueries({ queryKey: ["epn", "universe"] });
  },
});

  // --- DERIVED STATE ---

  // Filter out partners that are already linked
  const linkedEpnIds = new Set(linkedEpns.map((p) => p.id));
  
  const availableEpns = useMemo(() => {
    return allEpns
      .filter((p) => !linkedEpnIds.has(p.id))
      .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [allEpns, linkedEpnIds, searchTerm]);

  // Helper to get the correct label (Task 5 Logic)
  const getPartnerLabel = (bucket: string) => {
    return bucket === "idfc" ? "RM" : "Network Partner";
  };

  const isLoading = leadLoading || epnsLoading || linkedLoading;

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading linkage data...</div>;
  }

  const companyName = lead?.companyName || lead?.name || `Lead #${leadId}`;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
<button
  onClick={() => setLocation(`/leads/${leadId}/epn`)}
  className="text-sm text-blue-600 hover:underline mb-2 inline-block"
>
  &larr; Back to Network Partner Outreach
</button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Link Network Partners to {companyName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select Network Partners or IDFC RMs to associate with this lead.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: AVAILABLE PARTNERS */}
        <div className="bg-white dark:bg-neutral-900 border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b bg-gray-50 dark:bg-neutral-800/50 rounded-t-lg">
            <h2 className="font-semibold mb-3">Available Network Partners</h2>
            <input
              type="text"
              placeholder="Search by name..."
              className="w-full px-3 py-2 border rounded-md text-sm bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {availableEpns.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No available partners found.
              </p>
            ) : (
              availableEpns.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{partner.name}</p>
                    <p className="text-xs text-gray-500">
                      {getPartnerLabel(partner.bucket)} • {partner.category || "No Category"}
                    </p>
                  </div>
                  <button
                    onClick={() => linkMutation.mutate(partner.id)}
                    disabled={linkMutation.isPending}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-md transition-colors"
                  >
                    Link &rarr;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LINKED PARTNERS */}
        <div className="bg-white dark:bg-neutral-900 border rounded-lg shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b bg-blue-50/50 dark:bg-blue-900/10 rounded-t-lg">
            <h2 className="font-semibold">Linked Network Partners</h2>
            <p className="text-xs text-gray-500 mt-1">
              Currently associated with this lead
            </p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            {linkedEpns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No partners linked yet.</p>
              </div>
            ) : (
              linkedEpns.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 rounded-md"
                >
                  <div>
                    {/* TASK 5 LOGIC: Displaying "RM" or "Network Partner" */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 block">
                      {getPartnerLabel(partner.bucket)}
                    </span>
                    <p className="font-medium text-sm">{partner.name}</p>
                  </div>
                  <button
                    onClick={() => unlinkMutation.mutate(partner.id)}
                    disabled={unlinkMutation.isPending}
                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  >
                    Unlink &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}