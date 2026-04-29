import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

interface InvestorLinkedCompaniesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorId: number | null;
}

type PaginatedLeadsResponse = {
  data: any[];
  total: number;
  page: number;
  limit: number;
};

const normalizeLeadsResponse = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};


export default function InvestorLinkedCompaniesDialog({ 
  open, 
  onOpenChange, 
  investorId 
}: InvestorLinkedCompaniesDialogProps) {
  const queryClient = useQueryClient();
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  // 1. Fetch Linked Leads
  // 1. Fetch Linked Leads
  const { data: linkedLeads = [], isLoading: isLinkedLoading, error: linkedError } = useQuery<any[]>({
    queryKey: ["/investors/linked-leads", investorId],
    queryFn: async () => {
      if (!investorId) return [];

      const res = await apiRequest("GET", `/investors/${investorId}/linked-leads`);
      const json = await res.json();

      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      return [];
    },
    enabled: open && !!investorId,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // 2. Fetch Universe Leads (for linking new ones)
  // 2. Fetch active leads for linking new companies
  // Supports both old array response and new paginated response.
  const { data: universeLeads = [], isLoading: isLeadsLoading, error: leadsError } = useQuery<any[]>({
    queryKey: ["/leads/stage/universe", "link-companies-active-leads"],
    queryFn: async () => {
      const firstRes = await apiRequest(
        "GET",
        "/leads/stage/universe?page=1&limit=100&stageFilter=qualified,outreach,pitching,mandates&sortBy=company-asc"
      );

      const firstJson: PaginatedLeadsResponse | any[] = await firstRes.json();

      if (Array.isArray(firstJson)) {
        return firstJson;
      }

      const firstPageLeads = normalizeLeadsResponse(firstJson);
      const total = Number((firstJson as PaginatedLeadsResponse)?.total || firstPageLeads.length);
      const limit = Number((firstJson as PaginatedLeadsResponse)?.limit || 100);
      const totalPages = Math.max(1, Math.ceil(total / limit));

      if (totalPages <= 1) {
        return firstPageLeads;
      }

      const remainingPages = Array.from({ length: totalPages - 1 }, (_, index) => index + 2);

      const remainingResults = await Promise.all(
        remainingPages.map(async (pageNo) => {
          const res = await apiRequest(
            "GET",
            `/leads/stage/universe?page=${pageNo}&limit=${limit}&stageFilter=qualified,outreach,pitching,mandates&sortBy=company-asc`
          );
          const json = await res.json();
          return normalizeLeadsResponse(json);
        })
      );

      return [...firstPageLeads, ...remainingResults.flat()];
    },
    enabled: open,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Mutations
  const linkLead = useMutation({
    mutationFn: async (leadId: number) => {
      if (!investorId) throw new Error("Missing investorId");
      await apiRequest("POST", `/investors/${investorId}/linked-leads`, { leadId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", investorId] });
      queryClient.invalidateQueries({ queryKey: ["investors"] }); // Update counts on cards
    },
  });

  const unlinkLead = useMutation({
    mutationFn: async (leadId: number) => {
      if (!investorId) throw new Error("Missing investorId");
      await apiRequest("DELETE", `/investors/${investorId}/linked-leads/${leadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", investorId] });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number, status: string }) => {
      if (!investorId) throw new Error("Missing investorId");
      await apiRequest("PATCH", `/investors/${investorId}/linked-leads/${leadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", investorId] });
    },
  });

  // Helpers
  const ACTIVE_STAGES = new Set(["qualified", "outreach", "pitching", "mandates"]);
  
  function getCompanyNameFromLead(x: any): string {
    return x?.companyName || x?.company?.name || x?.name || `Lead #${x?.leadId ?? x?.id ?? "?"}`;
  }

  const linkedLeadIds = useMemo(() => {
    const set = new Set<number>();
    for (const r of linkedLeads ?? []) {
      const id = Number(r?.leadId ?? r?.id);
      if (Number.isFinite(id) && id > 0) set.add(id);
    }
    return set;
  }, [linkedLeads]);

  const filteredActiveLeads = useMemo(() => {
    // Filter for active stages first
    const active = (universeLeads ?? []).filter((l: any) => ACTIVE_STAGES.has(String(l?.stage || "").toLowerCase()));
    
    // Then filter by search
    const q = leadSearch.trim().toLowerCase();
    if (!q) return active;
    return active.filter((l: any) => getCompanyNameFromLead(l).toLowerCase().includes(q));
  }, [universeLeads, leadSearch]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedLeadIds([]);
    setLeadSearch("");
  };

  const loadError = linkedError || leadsError;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>Linked Companies</span>
          </DialogTitle>
        </DialogHeader>

        {loadError && (
          <div className="p-3 rounded-md border bg-red-50 text-red-700 text-sm">
            Failed to load linked companies. {String((loadError as any)?.message || loadError)}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">Currently linked</div>

          {isLinkedLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading linked companies...
            </div>
          ) : (linkedLeads?.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">No linked companies yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {linkedLeads.map((r: any) => {
                const leadId = Number(r?.leadId ?? r?.id);
                const label = getCompanyNameFromLead(r);

                return (
                  <div key={leadId} className="grid grid-cols-12 items-center border rounded-lg px-2 py-3 w-full">
                    <div className="col-span-4 font-semibold truncate" title={label}>
                      {label}
                    </div>

                    <div className="col-span-3">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ leadId, status: e.target.value })
                        }
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="rejected">Rejected</option>
                        <option value="dropped">Dropped</option>
                        <option value="hold">Hold</option>
                        <option value="no response">No Response</option>
                        <option value="positive">Positive</option>
                        <option value="yet to contact">Yet to Contact</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => unlinkLead.mutate(leadId)}
                        disabled={unlinkLead.isPending}
                        aria-label="Unlink"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t my-2" />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-medium">Link new companies (Active leads only)</div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLeadIds([])}
                disabled={selectedLeadIds.length === 0}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  for (const id of selectedLeadIds) {
                    if (!linkedLeadIds.has(id)) {
                      await linkLead.mutateAsync(id);
                    }
                  }
                  setSelectedLeadIds([]);
                }}
                disabled={selectedLeadIds.length === 0 || linkLead.isPending}
              >
                {linkLead.isPending ? "Linking..." : `Link (${selectedLeadIds.length})`}
              </Button>
            </div>
          </div>

          <Input
            placeholder="Search company name..."
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
          />

          <div className="border rounded-lg max-h-[360px] overflow-auto">
            {isLeadsLoading ? (
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading active leads...
              </div>
            ) : filteredActiveLeads.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No active leads found.</div>
            ) : (
              <div className="divide-y">
                {filteredActiveLeads.map((l: any) => {
                  const id = Number(l?.id);
                  const name = getCompanyNameFromLead(l);
                  const isAlreadyLinked = linkedLeadIds.has(id);
                  const isSelected = selectedLeadIds.includes(id);

                  return (
                    <div key={id} className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{name}</div>
                        <div className="text-xs text-muted-foreground">
                          Stage: {String(l?.stage || "—")}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isAlreadyLinked ? (
                          <Badge variant="secondary">Linked</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(v) => {
                                setSelectedLeadIds((prev) => {
                                  if (v) return prev.includes(id) ? prev : [...prev, id];
                                  return prev.filter((x) => x !== id);
                                });
                              }}
                            />
                            <span className="text-sm text-muted-foreground">Select</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}