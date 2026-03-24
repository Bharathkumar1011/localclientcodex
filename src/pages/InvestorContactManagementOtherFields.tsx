// client/src/pages/InvestorContactManagementOtherFields.tsx

import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ExternalLink, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Investor } from "@/lib/types";

// Define filter types for "Missing Data" logic
type FilterType = "all" | "missing_type" | "missing_website" | "missing_sector" | "missing_location";

export default function InvestorContactManagementOtherFields() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");

  // Local edit state
  const [edits, setEdits] = useState<Record<number, Partial<Investor>>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  // Fetch Investors
  const { data: investors = [], isLoading } = useQuery<Investor[]>({
    queryKey: ["/investor-contact-management/other-fields"],
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Investor> }) => {
      const res = await apiRequest("PATCH", `/api/investor-contact-management/other-fields/${id}`, updates);
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: "Saved", description: "Investor details updated." });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      setSavingId(null);
      queryClient.invalidateQueries({ queryKey: ["/investor-contact-management/other-fields"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
      setSavingId(null);
    },
  });

  const handleSave = (id: number) => {
    const updates = edits[id];
    if (!updates) return;
    setSavingId(id);
    updateMutation.mutate({ id, updates });
  };

  const handleChange = (id: number, field: keyof Investor, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getVal = (inv: Investor, field: keyof Investor) => {
    if (edits[inv.id] && edits[inv.id]![field] !== undefined) {
      return edits[inv.id]![field] as string;
    }
    return (inv[field] as string) || "";
  };

  // --- 1. Calculate Metrics (Detailed) ---
  const metrics = useMemo(() => {
    const total = investors.length;
    
    const getStats = (field: keyof Investor) => {
      if (total === 0) return { filled: 0, blank: 0, pct: 0 };
      const filled = investors.filter(i => i[field] && String(i[field]).trim().length > 0).length;
      return {
        filled,
        blank: total - filled,
        pct: Math.round((filled / total) * 100)
      };
    };

    return {
      type: getStats("investorType"),
      website: getStats("website"),
      sector: getStats("sector"),
      location: getStats("location"),
    };
  }, [investors]);

  // --- 2. Filter Logic ---
  const filteredInvestors = useMemo(() => {
    let result = investors;

    // A. Apply Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(inv => 
        inv.name.toLowerCase().includes(lower) || 
        (inv.investorType || "").toLowerCase().includes(lower) ||
        (inv.sector || "").toLowerCase().includes(lower)
      );
    }

    // B. Apply Dropdown Filter (Missing Data)
    const isEmpty = (v: string | null | undefined) => !v || String(v).trim().length === 0;

    switch (filterType) {
      case "missing_type":
        return result.filter(i => isEmpty(i.investorType));
      case "missing_website":
        return result.filter(i => isEmpty(i.website));
      case "missing_sector":
        return result.filter(i => isEmpty(i.sector));
      case "missing_location":
        return result.filter(i => isEmpty(i.location));
      default:
        return result;
    }
  }, [investors, searchTerm, filterType]);

  // Helper component for Header Stats (Updated with counts)
  const HeaderStat = ({ label, stats }: { label: string; stats: { filled: number, blank: number, pct: number } }) => (
    <div className="flex flex-col">
      <span>{label}</span>
      <div className="flex flex-col gap-0.5 mt-1">
        {/* Progress Bar */}
        <div className="h-1.5 w-full max-w-[80px] bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${stats.pct === 100 ? 'bg-emerald-500' : stats.pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
            style={{ width: `${stats.pct}%` }} 
          />
        </div>
        {/* Text Stats */}
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          <span className="text-emerald-600/80">{stats.filled} Filled</span>
          <span className="mx-1 text-slate-300">|</span>
          <span className="text-amber-600/80">{stats.blank} Blank</span>
        </span>
      </div>
    </div>
  );

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Investor Other Fields</h1>
        <p className="text-muted-foreground">
          Bulk update investor details to improve database health.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>Investors</span>
              <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {filteredInvestors.length} / {investors.length}
              </span>
            </CardTitle>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Filter Dropdown */}
              <div className="w-[220px]">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger className="h-9">
                    <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Show All</SelectItem>
                    <SelectItem value="missing_type" className="text-amber-600">
                      Missing Type ({metrics.type.blank})
                    </SelectItem>
                    <SelectItem value="missing_website" className="text-amber-600">
                      Missing Website ({metrics.website.blank})
                    </SelectItem>
                    <SelectItem value="missing_sector" className="text-amber-600">
                      Missing Sector ({metrics.sector.blank})
                    </SelectItem>
                    <SelectItem value="missing_location" className="text-amber-600">
                      Missing Location ({metrics.location.blank})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Search investors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px] h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium">
                <tr>
                  <th className="px-3 py-2 w-[20%] align-top pt-3">Organization Name</th>
                  
                  <th className="px-3 py-2 w-[15%] align-top">
                    <HeaderStat label="Investor Type" stats={metrics.type} />
                  </th>
                  
                  <th className="px-3 py-2 w-[20%] align-top">
                    <HeaderStat label="Website" stats={metrics.website} />
                  </th>
                  
                  <th className="px-3 py-2 w-[20%] align-top">
                    <HeaderStat label="Sectors" stats={metrics.sector} />
                  </th>
                  
                  <th className="px-3 py-2 w-[15%] align-top">
                    <HeaderStat label="Location" stats={metrics.location} />
                  </th>
                  
                  <th className="px-3 py-2 w-[10%] text-center align-top pt-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvestors.map((inv) => {
                  const isDirty = !!edits[inv.id];
                  const isSaving = savingId === inv.id;

                  return (
                    <tr key={inv.id} className="group hover:bg-muted/30 transition-colors">
                      {/* Name (Read-only reference) */}
                      <td className="px-3 py-2">
                        <Input
                          value={getVal(inv, "name")}
                          onChange={(e) => handleChange(inv.id, "name", e.target.value)}
                          className="h-8 text-xs font-semibold bg-transparent border-transparent hover:border-input focus:bg-background"
                        />
                      </td>

                      {/* Investor Type */}
                      <td className="px-3 py-2">
                        <Input
                          value={getVal(inv, "investorType")}
                          onChange={(e) => handleChange(inv.id, "investorType", e.target.value)}
                          placeholder="Type..."
                          className={`h-8 text-xs ${!getVal(inv, "investorType") ? "border-amber-200 bg-amber-50/50" : ""}`}
                        />
                      </td>

                      {/* Website */}
                      <td className="px-3 py-2">
                        <div className="relative">
                          <Input
                            value={getVal(inv, "website")}
                            onChange={(e) => handleChange(inv.id, "website", e.target.value)}
                            className={`h-8 text-xs pr-8 ${!getVal(inv, "website") ? "border-amber-200 bg-amber-50/50" : ""}`}
                            placeholder="example.com"
                          />
                          {inv.website && (
                            <a
                              href={inv.website.startsWith("http") ? inv.website : `https://${inv.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2 top-2 text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Sectors */}
                      <td className="px-3 py-2">
                        <Input
                          value={getVal(inv, "sector")}
                          onChange={(e) => handleChange(inv.id, "sector", e.target.value)}
                          placeholder="Sectors..."
                          className={`h-8 text-xs ${!getVal(inv, "sector") ? "border-amber-200 bg-amber-50/50" : ""}`}
                        />
                      </td>

                      {/* Location */}
                      <td className="px-3 py-2">
                        <Input
                          value={getVal(inv, "location")}
                          onChange={(e) => handleChange(inv.id, "location", e.target.value)}
                          placeholder="Location..."
                          className={`h-8 text-xs ${!getVal(inv, "location") ? "border-amber-200 bg-amber-50/50" : ""}`}
                        />
                      </td>

                      {/* Action */}
                      <td className="px-3 py-2 text-center">
                        <Button 
                          size="sm" 
                          variant={isDirty ? "default" : "ghost"}
                          className={`h-8 w-8 p-0 ${!isDirty ? "opacity-0 group-hover:opacity-100" : ""}`}
                          onClick={() => handleSave(inv.id)}
                          disabled={!isDirty || isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvestors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No investors found matching your filters.
                    </td>
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