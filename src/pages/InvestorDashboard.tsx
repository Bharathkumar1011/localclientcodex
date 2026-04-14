import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiFetch } from "@/lib/apiFetch";
import { apiRequest } from "@/lib/queryClient";
import type { Investor } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Plus, Search, Building2 } from "lucide-react";
import InvestorCard from "@/components/InvestorCard";
import InvestorPOCManagement from "@/components/InvestorPOCManagement";
import InvestorImportDialog from "@/components/InvestorImportDialog"; // ✅ Imported

import InvestorLinkedCompaniesDialog from "@/components/InvestorLinkedCompaniesDialog"; // ✅ New Component

import InvestorFilterBar, { type InvestorFilters } from "@/components/InvestorFilterBar"; // ✅ Imported the new filter bar component

export default function InvestorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // ✅ Replace simple search state with Filter Object
const [filters, setFilters] = useState<InvestorFilters>({
  search: "",
  sector: "all",
  investorType: "all",
  linkStatus: "all",
  mandateStatus: "all",
  location: ""
});


  const [isImportOpen, setIsImportOpen] = useState(false); // ✅ Controls the new dialog

  // POC Management State
  const [pocManageOpen, setPocManageOpen] = useState(false);
  const [currentInvestorId, setCurrentInvestorId] = useState<number | null>(null);
  const [currentInvestorName, setCurrentInvestorName] = useState("");


  // ✅ Link Companies State (Add this to all other pages too)
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInvestorId, setLinkInvestorId] = useState<number | null>(null);


  // 1. Fetch All Investors
  const { data: investors = [], isLoading } = useQuery<Investor[]>({
    queryKey: ["investors", "all"],
    queryFn: async () => {
      const res = await apiFetch("/api/investors?stage=all");
      if (!res.ok) throw new Error("Failed to fetch investors");
      return res.json();
    }
  });

  // ✅ 1. Calculate Unique Locations
  const uniqueLocations = useMemo(() => {
    if (!investors) return [];
    const locs = investors
      .map(inv => inv.location)
      .filter(l => l && typeof l === 'string' && l.trim().length > 0)
      .map(l => l!.trim());
    return Array.from(new Set(locs)).sort();
  }, [investors]);

// ✅ Updated Filtering Logic
// ✅ Updated Filtering Logic
const filteredInvestors = useMemo(() => {
  return investors.filter((inv) => {
    // 1. Search (Name OR Website)
    const q = filters.search.toLowerCase();
    const matchesSearch =
      !q ||
      (inv.name?.toLowerCase().includes(q) || false) ||
      (inv.website?.toLowerCase().includes(q) || false);

    // 2. Sector
    const matchesSector =
      filters.sector === "all" ||
      (inv.sector?.includes(filters.sector) || false);

    // 3. Type
    const matchesType =
      filters.investorType === "all" ||
      inv.investorType === filters.investorType;

    // 4. Location
    const l = filters.location.toLowerCase();
    const matchesLocation =
      !l || (inv.location?.toLowerCase().includes(l) || false);

    // 5. Mandate Status
    const matchesMandateStatus =
      filters.mandateStatus === "all" ||
      (inv.mandateStatus || "") === filters.mandateStatus;

    // 6. Link Status
    let matchesLinkStatus = true;
    if (filters.linkStatus === "linked") {
      matchesLinkStatus =
        Array.isArray((inv as any).linkedLeads) &&
        (inv as any).linkedLeads.length > 0;
    } else if (filters.linkStatus === "unlinked") {
      matchesLinkStatus =
        !Array.isArray((inv as any).linkedLeads) ||
        (inv as any).linkedLeads.length === 0;
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
  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/investors/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      toast({ title: "Updated", description: "Investor updated successfully." });
    },
  });

  const handleMoveStage = (id: number, stage: string) => {
    updateInvestorMutation.mutate({ id, updates: { stage } });
  };

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

    const handleDownloadCsv = async () => {
    try {
      const res = await apiFetch("/api/investors/export?stage=all");
      if (!res.ok) throw new Error("Failed to export investors");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investors_all_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV download failed:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Investor Universe</h1>
          <p className="text-muted-foreground">Master database of all investors.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadCsv}>
            Download CSV
          </Button>
        </div>
      </div>

       <InvestorFilterBar 
        filters={filters} 
        setFilters={setFilters} 
        locations={uniqueLocations} // ✅ Added prop
      />

      {/* Results Content */}
      <div className="border rounded-md bg-white">
          <div className="p-4 border-b bg-gray-50/50">
             <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-2">
                <div className="col-span-4">Investor Name</div>
                <div className="col-span-3">Sector</div>
                <div className="col-span-3">Linked Companies</div>
                <div className="col-span-2 text-right">Actions</div>
             </div>
          </div>

          <div className="p-4 space-y-2">
            {isLoading ? (
                <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredInvestors.length === 0 ? (
                <div className="text-center py-12">
                    <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium">No investors found</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                        Try adjusting your search terms.
                    </p>
                </div>
            ) : (
                filteredInvestors.map((inv) => (
                    <InvestorCard 
                        key={inv.id} 
                        investor={inv} 
                        stage="all"
                        onMoveToStage={handleMoveStage}
                        onSectorToggle={handleSectorToggle}
                        // ✅ Add the Handler
                                onManageLinks={(i) => {
                                    setLinkInvestorId(i.id);
                                    setLinkOpen(true);
                                }}
                        onManagePOCs={(i) => {
                            setCurrentInvestorId(i.id);
                            setCurrentInvestorName(i.name);
                            setPocManageOpen(true);
                        }}
                    />
                ))
            )}
          </div>
      </div>

      {/* Dialogs */}
      <InvestorImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      <Dialog open={pocManageOpen} onOpenChange={setPocManageOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage POCs - {currentInvestorName}</DialogTitle>
          </DialogHeader>
          {currentInvestorId && <InvestorPOCManagement investorId={currentInvestorId} />}
        </DialogContent>
      </Dialog>

      {/* ✅ Add the Shared Dialog */}
      <InvestorLinkedCompaniesDialog 
        open={linkOpen} 
        onOpenChange={setLinkOpen} 
        investorId={linkInvestorId} 
      />

    </div>
  );
}