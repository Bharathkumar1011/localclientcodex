import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; 
import { ArrowLeft, Link as LinkIcon, Unlink, Building2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LinkLeadsToEpnPage() {
  const params = useParams();
  const epnId = Number(params.epnId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // --- SEARCH & FILTER STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  // 1. Fetch the Partner's Details
  const { data: partner, isLoading: loadingPartner } = useQuery({
    queryKey: [`/epn/${epnId}`],
    enabled: !!epnId,
  });

  // 2. Fetch all Leads in the CRM
  const { data: allLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["/leads/all"],
  });

  // 3. Fetch leads already linked to this partner
  const { data: linkedLeads = [], isLoading: loadingLinked } = useQuery({
    queryKey: [`/epn/${epnId}/linked-leads`],
    enabled: !!epnId,
  });

  // 4. MUTATION: Link a Lead
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


  // 5. MUTATION: Unlink a Lead
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


  // Filter out leads that are already linked
  const unlinkedLeads = allLeads.filter(
    (lead: any) => !linkedLeads.some((linked: any) => linked.leadId === lead.id)
  );

  // --- FILTERING LOGIC ---
  const availableLeads = unlinkedLeads.filter((lead: any) => {
    // 1. Search filter
    const companyName = (lead.company?.name || lead.companyName || `Company #${lead.id}`).toLowerCase();
    const matchesSearch = companyName.includes(searchQuery.toLowerCase());
    
    // 2. Stage filter
    const matchesStage = stageFilter === "all" || lead.stage?.toLowerCase() === stageFilter.toLowerCase();
    
    return matchesSearch && matchesStage;
  });

  const isLoading = loadingPartner || loadingLeads || loadingLinked;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Companies to Partner</h1>
          <p className="text-muted-foreground flex items-center gap-1">
            Managing links for <strong className="text-foreground ml-1">{partner?.name}</strong> 
            ({partner?.bucket === 'idfc' ? 'IDFC RM' : 'Network Partner'})
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Available Companies */}
        <div className="border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm flex flex-col h-[650px]">
          
          {/* Enhanced Header with Search and Filters */}
          <div className="p-4 border-b border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Available Companies</h3>
              <p className="text-xs text-muted-foreground">Select companies to assign to this partner</p>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  className="pl-8 bg-white dark:bg-neutral-950"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-neutral-950">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="outreach">Outreach</SelectItem>
                  <SelectItem value="pitching">Pitching</SelectItem>
                  <SelectItem value="mandates">Mandates</SelectItem>
                  <SelectItem value="hold">Hold</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total Count */}
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Showing {availableLeads.length} companies
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {availableLeads.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-sm text-gray-500 italic space-y-2">
                <Filter className="w-8 h-8 text-gray-300" />
                <p>No companies match your filters.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableLeads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-3 rounded-md border border-gray-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lead.company?.name || lead.companyName || `Company #${lead.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">Stage: {lead.stage}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={linkMutation.isPending}
                      onClick={() => linkMutation.mutate(lead.id)}
                    >
                      <LinkIcon className="w-3 h-3 mr-1.5" /> Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Linked Companies */}
        <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg bg-blue-50/10 dark:bg-blue-950/10 shadow-sm flex flex-col h-[650px]">
          <div className="p-4 border-b border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/20 space-y-4">
             <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Currently Linked
              </h3>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Companies actively assigned to this partner</p>
            </div>
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-[52px]">
              Total: {linkedLeads.length} companies
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {linkedLeads.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500 italic">
                No companies are linked yet.
              </div>
            ) : (
              <div className="space-y-2">
                {linkedLeads.map((linked: any) => (
                  <div key={linked.leadId} className="flex items-center justify-between p-3 rounded-md border border-white dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-600 dark:text-green-400">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {linked.companyName || `Company #${linked.leadId}`}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">Stage: {linked.stage}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={unlinkMutation.isPending}
                      onClick={() => unlinkMutation.mutate(linked.leadId)}
                    >
                      <Unlink className="w-3 h-3 mr-1.5" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}