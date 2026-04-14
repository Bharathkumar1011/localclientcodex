import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Investor } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, Plus, Loader2, X, ChevronDown, Check } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import InvestorPOCManagement from "@/components/InvestorPOCManagement";
import InvestorCard from "@/components/InvestorCard";
import InvestorImportDialog from "@/components/InvestorImportDialog"; // ✅ Imported
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import InvestorFilterBar, { type InvestorFilters } from "@/components/InvestorFilterBar"; // ✅ Import

export default function InvestorOutreach() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [filters, setFilters] = useState<InvestorFilters>({
    search: "",
    sector: "all",
    investorType: "all",
    location: "",
    mandateStatus: "all",
    linkStatus: "all"
  });

  const [open, setOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false); // ✅ Controls the new dialog

  // Link Leads State
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInvestorId, setLinkInvestorId] = useState<number | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  // State for Managing POCs
  const [pocManageOpen, setPocManageOpen] = useState(false);
  const [currentInvestorId, setCurrentInvestorId] = useState<number | null>(null);
  const [currentInvestorName, setCurrentInvestorName] = useState("");
  const [currentInvestorContacts, setCurrentInvestorContacts] = useState<any[]>([]);

  // 1. Investor Details (For adding new investor manually)
  const [form, setForm] = useState({
    name: "",
    sector: "",
    investorType: "",
    location: "",
    website: "",
    description: "",
  });

  // 2. List of POCs (For adding new investor manually)
  const [pocs, setPocs] = useState([
    { name: "", designation: "", email: "", phone: "", linkedin: "" }
  ]);

  const addPocRow = () => {
    setPocs([...pocs, { name: "", designation: "", email: "", phone: "", linkedin: "" }]);
  };

  const removePocRow = (index: number) => {
    if (pocs.length > 1) {
      const newPocs = [...pocs];
      newPocs.splice(index, 1);
      setPocs(newPocs);
    }
  };

  const updatePoc = (index: number, field: string, value: string) => {
    const newPocs = [...pocs];
    (newPocs[index] as any)[field] = value;
    setPocs(newPocs);
  };

    // ✅ Role gate (supports test-role via effectiveRole)
  const role = (user as any)?.effectiveRole || user?.role;
  const canAccess = ["admin", "partner", "analyst"].includes(role ?? "");
  const isAdmin = role === "admin";

  if (!canAccess) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          You don’t have access to Investor stages.
        </p>
      </div>
    );
  }

  type LeadLite = {
    id: number;
    stage?: string | null;
    companyName?: string | null;
    company?: { name?: string | null } | null;
  };

  type LinkedLeadRow = {
    leadId?: number;
    id?: number;
    companyName?: string | null;
    company?: { name?: string | null } | null;
    stage?: string | null;
  };

  const SECTOR_OPTIONS = [
    "Auto Components", "Building Materials", "Chemicals & Materials", "Consumer",
    "Defence", "Financial Services", "Healthcare", "Healthcare & Pharma", "HR",
    "Industrials", "IPP", "IT", "Logistics", "Others", "Pharma", "Renewables",
    "Specialty Chemicals", "Travel and Hospitality"
  ];
  const INVESTOR_TYPES = [
    "PE", "Family Office", "Strategic", "Angel Network", 
    "Debt Fund", "Bank", "Overseas Investor", "Other"
  ];

  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/investors/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
    },
  });

  const handleSectorToggle = (investor: Investor, sector: string) => {
    const currentSectors = investor.sector ? investor.sector.split(",").map(s => s.trim()).filter(Boolean) : [];
    let newSectors = [];
    if (currentSectors.includes(sector)) {
      newSectors = currentSectors.filter(s => s !== sector);
    } else {
      newSectors = [...currentSectors, sector];
    }
    updateInvestorMutation.mutate({
      id: investor.id,
      updates: { sector: newSectors.join(", ") }
    });
  };

  const handleMoveStage = (id: number, stage: string) => {
    updateInvestorMutation.mutate({ id, updates: { stage } });
  };

  const ACTIVE_STAGES = new Set(["qualified", "outreach", "pitching", "mandates"]);

  function getCompanyNameFromLead(x: any): string {
    return (
      x?.companyName ||
      x?.company?.name ||
      x?.name ||
      `Lead #${x?.leadId ?? x?.id ?? "?"}`
    );
  }

  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["investors", "stage", "outreach"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/investors?stage=outreach");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // ✅ 1. Calculate Unique Locations
// ✅ 1. Fetch ALL Unique Locations from the database (including CSV imports)
  const { data: uniqueLocations = [] } = useQuery<string[]>({
    queryKey: ["/investors/locations"],
    queryFn: async () => {
      // Fetches all distinct locations across all stages
      const res = await apiRequest("GET", "/investors/locations");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });



  // ✅ Apply Filters
  const rows = useMemo(() => {
    return (investors ?? []).filter(inv => {
      const q = filters.search.toLowerCase();
      const matchesSearch = !q || (inv.name?.toLowerCase().includes(q) || false) || (inv.website?.toLowerCase().includes(q) || false);
      const matchesSector = filters.sector === "all" || (inv.sector?.includes(filters.sector) || false);
      const matchesType = filters.investorType === "all" || (inv.investorType === filters.investorType);
      const l = filters.location.toLowerCase();
      const matchesLocation = !l || (inv.location?.toLowerCase().includes(l) || false);

      const matchesMandateStatus =
        filters.mandateStatus === "all" ||
        (inv.mandateStatus || "") === filters.mandateStatus;

      // ✅ NEW: Link Status Filter
      let matchesLinkStatus = true;
      if (filters.linkStatus === "linked") {
        matchesLinkStatus = inv.linkedLeads && inv.linkedLeads.length > 0;
      } else if (filters.linkStatus === "unlinked") {
        matchesLinkStatus = !inv.linkedLeads || inv.linkedLeads.length === 0;
      }

      return (
        matchesSearch &&
        matchesSector &&
        matchesType &&
        matchesLocation &&
        matchesMandateStatus &&
        matchesLinkStatus
      );
    });
  }, [investors, filters]);

  const { data: universeLeads = [], isLoading: isLeadsLoading } = useQuery<LeadLite[]>({
    queryKey: ["/leads/stage/universe"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/leads/stage/universe");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const { data: linkedLeads = [], isLoading: isLinkedLoading } = useQuery<LinkedLeadRow[]>({
    queryKey: ["/investors/linked-leads", linkInvestorId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/investors/${linkInvestorId}/linked-leads`);
      return res.json();
    },
    enabled: linkOpen && !!linkInvestorId,
    refetchOnWindowFocus: false,
  });

  const createInvestor = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        contacts: pocs.map(p => ({
            name: p.name,
            designation: p.designation,
            email: p.email,
            phone: p.phone,
            linkedinProfile: p.linkedin
        }))
      };
      const res = await apiRequest("POST", "/investors", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      setOpen(false);
      setForm({ name: "", sector: "", investorType: "", location: "", website: "", description: "" });
      setPocs([{ name: "", designation: "", email: "", phone: "", linkedin: "" }]);
    },
  });

  const linkLead = useMutation({
    mutationFn: async (leadId: number) => {
      if (!linkInvestorId) throw new Error("Missing investorId");
      const res = await apiRequest("POST", `/investors/${linkInvestorId}/linked-leads`, { leadId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", linkInvestorId] });
    },
  });

  const unlinkLead = useMutation({
    mutationFn: async (leadId: number) => {
      if (!linkInvestorId) throw new Error("Missing investorId");
      const res = await apiRequest("DELETE", `/investors/${linkInvestorId}/linked-leads/${leadId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", linkInvestorId] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({  leadId, investorId, status }: {leadId: number, investorId: number, status: string }) => {
      const res = await apiRequest("PATCH", `/investors/${investorId}/linked-leads/${leadId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/linked-leads", linkInvestorId] });
    },
  });

  const handleStatusChange = (leadId:number,  investorId: number, status: string) => {
    updateStatusMutation.mutate({ leadId, investorId, status });
  };



  const activeLeads = useMemo(() => {
    return (universeLeads ?? []).filter((l: any) => ACTIVE_STAGES.has(String(l?.stage || "").toLowerCase()));
  }, [universeLeads]);

  const linkedLeadIds = useMemo(() => {
    const set = new Set<number>();
    for (const r of linkedLeads ?? []) {
      const id = Number(r?.leadId ?? r?.id);
      if (Number.isFinite(id) && id > 0) set.add(id);
    }
    return set;
  }, [linkedLeads]);

  const filteredActiveLeads = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return activeLeads;
    return activeLeads.filter((l: any) => getCompanyNameFromLead(l).toLowerCase().includes(q));
  }, [activeLeads, leadSearch]);


  // 7. Clear Filters
    const handleDownloadCsv = async () => {
    try {
      const res = await apiFetch("/api/investors/export?stage=outreach");
      if (!res.ok) throw new Error("Failed to export outreach investors");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investors_outreach_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV download failed:", error);
    }
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Investor Outreach</h1>
          <p className="text-muted-foreground">Manage investor list (admin only)</p>
        </div>


        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCsv}>
            Download CSV
          </Button>

          {/* ✅ Use new Import Dialog */}
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </Button>
          
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Investor
          </Button>
        </div>
      </div>

      <InvestorFilterBar 
        filters={filters} 
        setFilters={setFilters} 
        locations={uniqueLocations} // ✅ Added prop
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${rows.length} investors`}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Header Row */}
          <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-4">
            <div className="col-span-4">Investor Name</div>
            <div className="col-span-3">Sector</div>
            <div className="col-span-3">Linked Companies</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Render List of Expandable Rows using InvestorCard */}
          <div className="space-y-2">
            {rows.map((inv) => (
                <InvestorCard 
                    key={inv.id} 
                    investor={inv}
                    stage="outreach"
                    onMoveToStage={handleMoveStage}
                    onSectorToggle={handleSectorToggle}
                    onManageLinks={(i) => {
                        setLinkInvestorId(i.id);
                        setSelectedLeadIds([]);
                        setLeadSearch("");
                        setLinkOpen(true);
                    }}
                    onManagePOCs={(i) => {
                        setCurrentInvestorId(i.id);
                        setCurrentInvestorName(i.name);
                        setCurrentInvestorContacts(i.contacts || []);
                        setPocManageOpen(true);
                    }}
                />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Investor Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Investor</DialogTitle>
          </DialogHeader>
          {/* Form Content */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 border-b pb-4">
                <h3 className="col-span-2 font-semibold text-sm text-gray-500">Company Details</h3>
                <Input placeholder="Investor name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                
{/* Sector Multi-Select */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                      <span className="truncate text-foreground">{form.sector ? form.sector : "Select Sector"}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                    {SECTOR_OPTIONS.map((option) => {
                      const isSelected = form.sector.split(",").map((s) => s.trim()).includes(option);
                      return (
                        <div
                          key={option}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            const current = form.sector ? form.sector.split(",").map((s) => s.trim()).filter(Boolean) : [];
                            let next;
                            if (current.includes(option)) {
                              next = current.filter((s) => s !== option);
                            } else {
                              next = [...current, option];
                            }
                            setForm({ ...form, sector: next.join(", ") });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-sm">{option}</span>
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

{/* ✅ NEW: Investor Type Multi-Select (Matches Sector & Location) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                      <span className="truncate text-foreground">{form.investorType ? form.investorType : "Select Type"}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                    
                    {/* Free-text input to add brand new types */}
                    <div className="p-2 border-b border-cyan-100 mb-1">
                      <Input 
                        placeholder="Type new & press Enter..." 
                        className="h-8 text-sm bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newType = e.currentTarget.value.trim();
                            if (newType) {
                              const current = form.investorType ? form.investorType.split(",").map((s) => s.trim()).filter(Boolean) : [];
                              if (!current.includes(newType)) {
                                setForm({ ...form, investorType: [...current, newType].join(", ") });
                              }
                              e.currentTarget.value = ""; // Clear input after adding
                            }
                          }
                        }} 
                      />
                    </div>

                    {/* Checkbox list for existing investor types */}
                    {INVESTOR_TYPES.map((type) => {
                      const isSelected = form.investorType ? form.investorType.split(",").map((s) => s.trim()).includes(type) : false;
                      return (
                        <div
                          key={type}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            const current = form.investorType ? form.investorType.split(",").map((s) => s.trim()).filter(Boolean) : [];
                            let next;
                            if (current.includes(type)) {
                              next = current.filter((s) => s !== type);
                            } else {
                              next = [...current, type];
                            }
                            setForm({ ...form, investorType: next.join(", ") });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-sm">{type}</span>
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ✅ NEW: Location Combobox (Allows typing custom OR selecting existing) */}
{/* Location Multi-Select (Matches Sector Style) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                      <span className="truncate text-foreground">{form.location ? form.location : "Select Location"}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                    
                    {/* Free-text input to add brand new locations */}
                    <div className="p-2 border-b border-cyan-100 mb-1">
                      <Input 
                        placeholder="Type new & press Enter..." 
                        className="h-8 text-sm bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newLoc = e.currentTarget.value.trim();
                            if (newLoc) {
                              const current = form.location ? form.location.split(",").map((s) => s.trim()).filter(Boolean) : [];
                              if (!current.includes(newLoc)) {
                                setForm({ ...form, location: [...current, newLoc].join(", ") });
                              }
                              e.currentTarget.value = ""; // Clear input after adding
                            }
                          }
                        }} 
                      />
                    </div>

                    {/* Checkbox list for existing locations */}
                    {uniqueLocations.map((loc) => {
                      const isSelected = form.location.split(",").map((s) => s.trim()).includes(loc);
                      return (
                        <div
                          key={loc}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            const current = form.location ? form.location.split(",").map((s) => s.trim()).filter(Boolean) : [];
                            let next;
                            if (current.includes(loc)) {
                              next = current.filter((s) => s !== loc);
                            } else {
                              next = [...current, loc];
                            }
                            setForm({ ...form, location: next.join(", ") });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-sm">{loc}</span>
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>


                <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                <Input className="col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-gray-500">Points of Contact</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addPocRow}>
                        <Plus className="h-3 w-3 mr-1" /> Add POC
                    </Button>
                </div>

                {pocs.map((poc, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-gray-50 relative group">
                        {pocs.length > 1 && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removePocRow(index)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div className="col-span-2 flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-400">#{index + 1} {index === 0 ? "(Primary)" : ""}</span>
                            </div>
                            <Input placeholder="POC Name" value={poc.name} onChange={(e) => updatePoc(index, "name", e.target.value)} />
                            <Input placeholder="Designation" value={poc.designation} onChange={(e) => updatePoc(index, "designation", e.target.value)} />
                            <Input placeholder="Email" value={poc.email} onChange={(e) => updatePoc(index, "email", e.target.value)} />
                            <Input placeholder="Phone" value={poc.phone} onChange={(e) => updatePoc(index, "phone", e.target.value)} />
                            <Input className="col-span-2" placeholder="LinkedIn URL" value={poc.linkedin} onChange={(e) => updatePoc(index, "linkedin", e.target.value)} />
                        </div>
                    </div>
                ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createInvestor.mutate()}
              disabled={!form.name.trim() || createInvestor.isPending}
            >
              {createInvestor.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Linked Companies Modal */}
      <Dialog
        open={linkOpen}
        onOpenChange={(v) => {
          setLinkOpen(v);
          if (!v) {
            setLinkInvestorId(null);
            setSelectedLeadIds([]);
            setLeadSearch("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Linked Companies</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLinkOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

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
                      <div className="col-span-4 font-semibold truncate" title={label}>{label}</div>
                      <div className="col-span-3">
                        <select 
                          value={r.status} 
                          onChange={(e) => handleStatusChange(r.leadId, r.investorId, e.target.value)} 
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

      {/* ✅ Replaced Manual Import Dialog with Component */}
      <InvestorImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      {/* Manage POCs Modal */}
      <Dialog open={pocManageOpen} onOpenChange={setPocManageOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage POCs - {currentInvestorName}</DialogTitle>
          </DialogHeader>
          
          {currentInvestorId && (
            <InvestorPOCManagement 
              investorId={currentInvestorId}
              initialContacts={currentInvestorContacts} 
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}