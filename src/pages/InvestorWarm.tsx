import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Investor } from "@/lib/types";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvestorCard from "@/components/InvestorCard";
import InvestorPOCManagement from "@/components/InvestorPOCManagement";

import InvestorLinkedCompaniesDialog from "@/components/InvestorLinkedCompaniesDialog"; // ✅ New Component

import InvestorFilterBar, { type InvestorFilters } from "@/components/InvestorFilterBar";

import { apiFetch } from "@/lib/apiFetch";

export default function InvestorWarm() {
  const { user } = useAuth();

  // ✅ Role gate (supports test-role via effectiveRole)
  const role = (user as any)?.effectiveRole || user?.role;
  const canAccess = ["admin", "partner", "analyst"].includes(role ?? "");

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

  // POC Management State
  const [pocManageOpen, setPocManageOpen] = useState(false);
  const [currentInvestorId, setCurrentInvestorId] = useState<number | null>(null);
  const [currentInvestorName, setCurrentInvestorName] = useState("");
  const [currentInvestorContacts, setCurrentInvestorContacts] = useState<any[]>([]);


  // ✅ Link Companies State (Add this to all other pages too)
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInvestorId, setLinkInvestorId] = useState<number | null>(null);

  // Fetch Investors in Warm Stage
  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["investors", "stage", "warm"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/investors?stage=warm");
      return res.json();
    },
    refetchOnWindowFocus: false,
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

// ✅ Filter State
  const [filters, setFilters] = useState<InvestorFilters>({
    search: "",
    sector: "all",
    investorType: "all",
    location: "",
    mandateStatus: "all",
    linkStatus: "all" // ✅ Add this line
  });

  // ✅ Filter Logic
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

     // ✅ NEW: Link Status Filter logic
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

  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/investors/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
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
      const res = await apiFetch("/api/investors/export?stage=warm");
      if (!res.ok) throw new Error("Failed to export warm investors");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `investors_warm_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-3xl font-bold">Warm</h1>
          <p className="text-muted-foreground">Investors in Warm stage (admin only)</p>
        </div>

        <Button variant="outline" onClick={handleDownloadCsv}>
          Download CSV
        </Button>
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
          <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-4">
            <div className="col-span-4">Investor Name</div>
            <div className="col-span-3">Sector</div>
            <div className="col-span-3">Linked Companies</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="space-y-2">
            {rows.map((inv) => (
              <InvestorCard 
                key={inv.id} 
                investor={inv} 
                stage="warm" 
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
                    setCurrentInvestorContacts(i.contacts || []); // ✅ Added
                    setPocManageOpen(true);
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

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

      {/* ✅ Add the Shared Dialog */}
      <InvestorLinkedCompaniesDialog 
        open={linkOpen} 
        onOpenChange={setLinkOpen} 
        investorId={linkInvestorId} 
      />

    </div>
  );
}