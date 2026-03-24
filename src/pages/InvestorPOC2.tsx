import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ✅ CONFIG FOR POC 2
const SLOT_INDEX = 1; 
const PAGE_TITLE = "Investor POC 2";

type POCRow = {
  investorId: number;
  investorName: string;
  investorType: string;
  contactId: number | null;
  name: string;
  designation: string;
  phone: string;
  linkedinProfile: string;
  email: string;
};

type POCResponse = { items: POCRow[] };

export default function InvestorPOC2() {
  const { toast } = useToast();
  
  // State for Filters
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<"phone" | "email" | "linkedinProfile">("phone");
  const [statusFilter, setStatusFilter] = useState<"all" | "blank" | "not_blank">("all");
  const [investorTypeFilter, setInvestorTypeFilter] = useState("all");
  const [drafts, setDrafts] = useState<Record<number, Partial<POCRow>>>({});

  
  // 1. Fetch Data
  const { data, isLoading } = useQuery<POCResponse>({
    queryKey: ["investor-poc", SLOT_INDEX],
    queryFn: async () => {
      const res = await apiRequest("GET", `/investors/poc-coverage/${SLOT_INDEX}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const investorTypeOptions = useMemo(() => {
  return [...new Set(
    (data?.items ?? [])
      .map((r) => String(r.investorType || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}, [data?.items]);


  // 2. Initialize Drafts
  useEffect(() => {
    if (!data?.items) return;
    const next: Record<number, any> = {};
    for (const r of data.items) {
      next[r.investorId] = {
        name: r.name ?? "",
        designation: r.designation ?? "",
        phone: r.phone ?? "",
        linkedinProfile: r.linkedinProfile ?? "",
        email: r.email ?? "",
      };
    }
    setDrafts(next);
  }, [data?.items]);

  // Helper
  const isBlankValue = (v: any) => {
    const s = String(v ?? "").trim().toLowerCase();
    return s === "" || s === "na" || s === "n/a" || s === "-" || s === "—";
  };

  // 3. Filtering Logic
  const filteredRows = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();

    return items.filter((r) => {
      // Search
      if (q && !r.investorName.toLowerCase().includes(q)) return false;


            if (
        investorTypeFilter !== "all" &&
        String(r.investorType || "").trim() !== investorTypeFilter
      ) {
        return false;
      }


      // Status Filter
      if (statusFilter !== "all") {
        const persistedValue = (r as any)[contactFilter] ?? "";
        const isBlank = isBlankValue(persistedValue);

        if (statusFilter === "blank" && !isBlank) return false;
        if (statusFilter === "not_blank" && isBlank) return false;
      }

      return true;
    });
    }, [data?.items, search, statusFilter, contactFilter, investorTypeFilter]);

  // 4. Dynamic Header Counts
  const headerCounts = useMemo(() => {
    const seen = new Set<number>();
    const isFilled = (v: any) => !isBlankValue(v);

    let investorsCount = 0;
    const counts = {
      name: { f: 0, b: 0 },
      designation: { f: 0, b: 0 },
      phone: { f: 0, b: 0 },
      linkedin: { f: 0, b: 0 },
      email: { f: 0, b: 0 },
    };

    for (const r of filteredRows) {
      if (seen.has(r.investorId)) continue;
      seen.add(r.investorId);
      investorsCount++;

      const d: any = drafts[r.investorId] ?? {};
      
      const liveName = d.name ?? r.name ?? "";
      const liveDesignation = d.designation ?? r.designation ?? "";
      const livePhone = d.phone ?? r.phone ?? "";
      const liveLinkedin = d.linkedinProfile ?? r.linkedinProfile ?? "";
      const liveEmail = d.email ?? r.email ?? "";

      isFilled(liveName) ? counts.name.f++ : counts.name.b++;
      isFilled(liveDesignation) ? counts.designation.f++ : counts.designation.b++;
      isFilled(livePhone) ? counts.phone.f++ : counts.phone.b++;
      isFilled(liveLinkedin) ? counts.linkedin.f++ : counts.linkedin.b++;
      isFilled(liveEmail) ? counts.email.f++ : counts.email.b++;
    }

    return { investors: investorsCount, ...counts };
  }, [filteredRows, drafts]);

  // 5. Mutation
  const saveMutation = useMutation({
    mutationFn: async (row: POCRow) => {
      const draft = drafts[row.investorId] || {};
      const payload = {
        investorId: row.investorId,
        name: draft.name ?? row.name,
        designation: draft.designation ?? row.designation,
        email: draft.email ?? row.email,
        phone: draft.phone ?? row.phone,
        linkedinProfile: draft.linkedinProfile ?? row.linkedinProfile,
      };

      const res = await apiRequest("POST", `/investors/poc-coverage/${SLOT_INDEX}`, payload);
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Contact details updated" });
      queryClient.invalidateQueries({ queryKey: ["investor-poc", SLOT_INDEX] });
      queryClient.invalidateQueries({ queryKey: ["investor-contact-metrics"] });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive", description: "Failed to save" });
    }
  });

  const handleCreateChange = (investorId: number, field: keyof POCRow, value: string) => {
    setDrafts(prev => ({
      ...prev,
      [investorId]: {
        ...prev[investorId],
        [field]: value
      }
    }));
  };

const clearFilters = () => {
  setSearch("");
  setContactFilter("phone");
  setStatusFilter("all");
  setInvestorTypeFilter("all");
};

  // ✅ NEW: Reusable Component for Header Stats
  const HeaderStat = ({ label, filled, blank }: { label: string; filled: number; blank: number }) => {
    const total = filled + blank;
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);

    return (
      <div className="flex flex-col">
        <span>{label}</span>
        <div className="flex flex-col gap-0.5 mt-1">
          {/* Progress Bar */}
          <div className="h-1.5 w-full max-w-[80px] bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
          {/* Text Stats */}
          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            <span className="text-emerald-600/80">{filled} Filled</span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-amber-600/80">{blank} Blank</span>
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

  if (!data || !data.items) {
    return <div className="p-10 text-center text-red-500">Error loading data</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{PAGE_TITLE}</h1>
        <p className="text-sm text-muted-foreground">Manage and clean secondary contact data for investors.</p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-center justify-between">
             <CardTitle>Data Table</CardTitle>
             <div className="w-[280px]">
                <Input 
                  placeholder="Search investor..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                />
             </div>
          </div>

          {/* FILTERS */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
             <Select value={contactFilter} onValueChange={(v: any) => setContactFilter(v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Field" /></SelectTrigger>
                <SelectContent className="bg-cyan-50">
                   <SelectItem value="phone">Mobile Numbers</SelectItem>
                   <SelectItem value="email">Email</SelectItem>
                   <SelectItem value="linkedinProfile">LinkedIn</SelectItem>
                </SelectContent>
             </Select>

             <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent className="bg-cyan-50">
                   <SelectItem value="all">All Rows</SelectItem>
                   <SelectItem value="blank">Blanks Only</SelectItem>
                   <SelectItem value="not_blank">Filled Only</SelectItem>
                </SelectContent>
             </Select>

             <Select value={investorTypeFilter} onValueChange={setInvestorTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Investor Type" />
              </SelectTrigger>
              <SelectContent className="bg-cyan-50">
                <SelectItem value="all">All Investor Types</SelectItem>
                {investorTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

             <Button variant="outline" className="h-9" onClick={clearFilters}>Clear Filters</Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-t">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium min-w-[200px]">
                        Investor ({headerCounts.investors})
</th>
                    {/* ✅ UPDATED HEADERS USING HeaderStat */}
                    <th className="text-left p-3 font-medium min-w-[150px] align-top">
                        <HeaderStat label="POC Name" filled={headerCounts.name.f} blank={headerCounts.name.b} />
                    </th>
                    <th className="text-left p-3 font-medium min-w-[150px] align-top">
                        <HeaderStat label="Designation" filled={headerCounts.designation.f} blank={headerCounts.designation.b} />
                    </th>
                    <th className="text-left p-3 font-medium min-w-[150px] align-top">
                        <HeaderStat label="Phone" filled={headerCounts.phone.f} blank={headerCounts.phone.b} />
                    </th>
                    <th className="text-left p-3 font-medium min-w-[200px] align-top">
                        <HeaderStat label="Email" filled={headerCounts.email.f} blank={headerCounts.email.b} />
                    </th>
                    <th className="text-left p-3 font-medium min-w-[200px] align-top">
                        <HeaderStat label="LinkedIn" filled={headerCounts.linkedin.f} blank={headerCounts.linkedin.b} />
                    </th>
                    <th className="text-right p-3 font-medium w-[80px] align-top pt-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map(row => {
                    const draft = drafts[row.investorId] || {};
                    
                    const isModified = 
                        (draft.name !== undefined && draft.name !== row.name) ||
                        (draft.designation !== undefined && draft.designation !== row.designation) ||
                        (draft.phone !== undefined && draft.phone !== row.phone) ||
                        (draft.email !== undefined && draft.email !== row.email) ||
                        (draft.linkedinProfile !== undefined && draft.linkedinProfile !== row.linkedinProfile);

                    const isSaving = saveMutation.isPending && saveMutation.variables?.investorId === row.investorId;

                    return (
                      <tr key={row.investorId} className="hover:bg-gray-50/50">
                        <td className="p-3 font-medium text-muted-foreground">{row.investorName}</td>
                        
                        <td className="p-2">
                          <Input value={draft.name ?? row.name} onChange={e => handleCreateChange(row.investorId, 'name', e.target.value)} className="h-8" placeholder="Name" />
                        </td>
                        <td className="p-2">
                          <Input value={draft.designation ?? row.designation} onChange={e => handleCreateChange(row.investorId, 'designation', e.target.value)} className="h-8" placeholder="Role" />
                        </td>
                        <td className="p-2">
                          <Input value={draft.phone ?? row.phone} onChange={e => handleCreateChange(row.investorId, 'phone', e.target.value)} className="h-8" placeholder="+91..." />
                        </td>
                        <td className="p-2">
                          <Input value={draft.email ?? row.email} onChange={e => handleCreateChange(row.investorId, 'email', e.target.value)} className="h-8" placeholder="email@fund.com" />
                        </td>
                        <td className="p-2">
                          <Input value={draft.linkedinProfile ?? row.linkedinProfile} onChange={e => handleCreateChange(row.investorId, 'linkedinProfile', e.target.value)} className="h-8" placeholder="LinkedIn URL" />
                        </td>

                        <td className="p-2 text-right">
                          <Button 
                            size="sm" 
                            variant={isModified ? "default" : "ghost"}
                            className="h-8 w-8 p-0"
                            onClick={() => saveMutation.mutate(row)}
                            disabled={isSaving}
                          >
                             {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className={`h-4 w-4 ${isModified ? "text-white" : "text-muted-foreground"}`} />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">No investors match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}