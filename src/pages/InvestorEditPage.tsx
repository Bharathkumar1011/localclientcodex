import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, ArrowLeft, Save,ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import InvestorPOCManagement from "@/components/InvestorPOCManagement";
import type { Investor } from "@/lib/types";

// Helper to expand the Investor type locally until we update types.ts/schema globally
interface ExtendedInvestor extends Investor {
  investorType?: string; // ✅ CHANGE THIS from organizationalType
}

export default function InvestorEditPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const investorId = Number(id);

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

  // Fetch and Standardize Locations (fixes caps/lowercase duplicates)
  const { data: rawLocations = [] } = useQuery<string[]>({
    queryKey: ["/investors/locations"],
    queryFn: async () => {
      const res = await apiFetch("/api/investors/locations");
      if (!res.ok) return [];
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // Standardize: "mumbai", "MUMBAI", " Mumbai " -> "Mumbai"
  const uniqueLocations = Array.from(new Set(
    rawLocations.map(l => {
       const trimmed = l.trim();
       return trimmed.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
    })
  )).filter(Boolean).sort();

  const [formData, setFormData] = useState<Partial<ExtendedInvestor>>({});


    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");

    // fallback if user opened edit page directly
    const fallbackReturnTo = "/investor-relation/investor-management/outreach";

    const goBack = () => {
    if (returnTo) {
        setLocation(returnTo);
        return;
    }
    if (window.history.length > 1) {
        window.history.back();
        return;
    }
    setLocation(fallbackReturnTo);
    };


  // 1. Fetch Investor Details
  const { data: investor, isLoading } = useQuery<ExtendedInvestor>({
    queryKey: ["investor", investorId],
    queryFn: async () => {
      const res = await apiFetch(`/api/investors/${investorId}`);
      if (!res.ok) throw new Error("Failed to fetch investor");
      return res.json();
    },
  });

  // 2. Sync state when data loads
  useEffect(() => {
    if (investor) {
      setFormData({
        name: investor.name,
        sector: investor.sector || "",
        investorType: investor.investorType || "", // Mapped from CSV "Column 1"
        location: investor.location || "",
        website: investor.website || "",
        description: investor.description || "",
        stage: investor.stage
      });
    }
  }, [investor]);

  // 3. Save Mutation
  const mutation = useMutation({
    mutationFn: async (data: Partial<ExtendedInvestor>) => {
      const res = await apiFetch(`/api/investors/${investorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update investor");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor", investorId] });
      toast({ title: "Success", description: "Investor updated successfully" });
      goBack();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update investor", variant: "destructive" });
    }
  });

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!investor) return <div className="p-10 text-center">Investor not found</div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Investor</h1>
          <p className="text-muted-foreground text-sm">Update details for {investor.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Full Width: Organization Details */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input 
                    value={formData.name || ""} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={formData.website || ""} 
                    onChange={(e) => setFormData({...formData, website: e.target.value})} 
                    placeholder="https://..."
                  />
                </div>

<div className="space-y-2">
                  <Label>Investor Type</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                        <span className="truncate text-foreground">{formData.investorType || "Select Type"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                      <div className="p-2 border-b border-cyan-100 mb-1">
                        <Input 
                          placeholder="Type new & press Enter..." 
                          className="h-8 text-sm bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newType = e.currentTarget.value.trim();
                              if (newType) {
                                const current = formData.investorType ? formData.investorType.split(",").map((s) => s.trim()).filter(Boolean) : [];
                                if (!current.includes(newType)) {
                                  setFormData({ ...formData, investorType: [...current, newType].join(", ") });
                                }
                                e.currentTarget.value = "";
                              }
                            }
                          }} 
                        />
                      </div>
                      {INVESTOR_TYPES.map((type) => {
                        const isSelected = formData.investorType ? formData.investorType.split(",").map((s) => s.trim()).includes(type) : false;
                        return (
                          <div
                            key={type}
                            className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              const current = formData.investorType ? formData.investorType.split(",").map((s) => s.trim()).filter(Boolean) : [];
                              let next = current.includes(type) ? current.filter((s) => s !== type) : [...current, type];
                              setFormData({ ...formData, investorType: next.join(", ") });
                            }}
                          >
                            <Checkbox checked={isSelected} />
                            <span className="text-sm">{type}</span>
                          </div>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <Label>Sectors</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                        <span className="truncate text-foreground">{formData.sector || "Select Sector"}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                      <div className="p-2 border-b border-cyan-100 mb-1">
                        <Input 
                          placeholder="Type new & press Enter..." 
                          className="h-8 text-sm bg-white"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const newSector = e.currentTarget.value.trim();
                              if (newSector) {
                                const current = formData.sector ? formData.sector.split(",").map((s) => s.trim()).filter(Boolean) : [];
                                if (!current.includes(newSector)) {
                                  setFormData({ ...formData, sector: [...current, newSector].join(", ") });
                                }
                                e.currentTarget.value = "";
                              }
                            }
                          }} 
                        />
                      </div>
                      {SECTOR_OPTIONS.map((option) => {
                        const isSelected = formData.sector ? formData.sector.split(",").map((s) => s.trim()).includes(option) : false;
                        return (
                          <div
                            key={option}
                            className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              const current = formData.sector ? formData.sector.split(",").map((s) => s.trim()).filter(Boolean) : [];
                              let next = current.includes(option) ? current.filter((s) => s !== option) : [...current, option];
                              setFormData({ ...formData, sector: next.join(", ") });
                            }}
                          >
                            <Checkbox checked={isSelected} />
                            <span className="text-sm">{option}</span>
                          </div>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* LOCATION FIELD */}
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal text-muted-foreground border-input">
                      <span className="truncate text-foreground">{formData.location || "Select Location"}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[300px] max-h-[300px] bg-cyan-50 overflow-y-auto" align="start">
                    <div className="p-2 border-b border-cyan-100 mb-1">
                      <Input 
                        placeholder="Type new & press Enter..." 
                        className="h-8 text-sm bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newLoc = e.currentTarget.value.trim();
                            // Standardize typed input instantly
                            const formattedLoc = newLoc.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
                            if (formattedLoc) {
                              const current = formData.location ? formData.location.split(",").map((s) => s.trim()).filter(Boolean) : [];
                              if (!current.includes(formattedLoc)) {
                                setFormData({ ...formData, location: [...current, formattedLoc].join(", ") });
                              }
                              e.currentTarget.value = "";
                            }
                          }
                        }} 
                      />
                    </div>
                    {uniqueLocations.map((loc) => {
                      const isSelected = formData.location ? formData.location.split(",").map((s) => s.trim()).includes(loc) : false;
                      return (
                        <div
                          key={loc}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            const current = formData.location ? formData.location.split(",").map((s) => s.trim()).filter(Boolean) : [];
                            let next = current.includes(loc) ? current.filter((s) => s !== loc) : [...current, loc];
                            setFormData({ ...formData, location: next.join(", ") });
                          }}
                        >
                          <Checkbox checked={isSelected} />
                          <span className="text-sm">{loc}</span>
                        </div>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-2">
                <Label>Description / Notes</Label>
                <Textarea 
                  value={formData.description || ""} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  rows={4}
                  placeholder="Investment focus, thesis, etc."
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Full Width: POC Management */}
      <div className="lg:col-span-3">
        <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Points of Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <InvestorPOCManagement investorId={investorId} initialContacts={(investor as any).contacts || []} />

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}