import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Investor } from "@/lib/types";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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




// ✅ Filter State
  const [filters, setFilters] = useState<InvestorFilters>({
    search: "",
    sector: "all",
    investorType: "all",
    location: "",
    mandateStatus: "all",
    linkStatus: "all" // ✅ Add this line
  });

const [page, setPage] = useState(1);
const limit = 25;

useEffect(() => {
  setPage(1);
}, [filters.search]);

  const { data: investorsResponse, isLoading } = useQuery<{
    data: any[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["investors", "stage", "warm", page, filters.search],
    queryFn: async () => {
      const params = new URLSearchParams({
        stage: "warm",
        page: String(page),
        limit: String(limit),
        search: filters.search || "",
      });

      const res = await apiRequest("GET", `/investors?${params.toString()}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const investors = investorsResponse?.data ?? [];
  const total = investorsResponse?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));


  const [goToPageInput, setGoToPageInput] = useState(String(page));

useEffect(() => {
  setGoToPageInput(String(page));
}, [page]);

const handleGoToPage = () => {
  if (!goToPageInput.trim()) return;

  const targetPage = Number(goToPageInput);
  if (!Number.isFinite(targetPage)) return;

  const safePage = Math.min(Math.max(1, Math.trunc(targetPage)), totalPages);
  setPage(safePage);
  setGoToPageInput(String(safePage));
};

    // ✅ 1. Calculate Unique Locations
  const uniqueLocations = useMemo(() => {
    if (!investors) return [];
    const locs = investors
      .map(inv => inv.location)
      .filter(l => l && typeof l === 'string' && l.trim().length > 0)
      .map(l => l!.trim());
    return Array.from(new Set(locs)).sort();
  }, [investors]);


  // ✅ Filter Logic
const rows = useMemo(() => {
  return (investors ?? []).filter(inv => {
    const matchesSector = filters.sector === "all" || (inv.sector?.includes(filters.sector) || false);
    const matchesType = filters.investorType === "all" || (inv.investorType === filters.investorType);
    const l = filters.location.toLowerCase();
    const matchesLocation = !l || (inv.location?.toLowerCase().includes(l) || false);

    const matchesMandateStatus =
      filters.mandateStatus === "all" ||
      (inv.mandateStatus || "") === filters.mandateStatus;

    let matchesLinkStatus = true;
    if (filters.linkStatus === "linked") {
      matchesLinkStatus = inv.linkedLeads && inv.linkedLeads.length > 0;
    } else if (filters.linkStatus === "unlinked") {
      matchesLinkStatus = !inv.linkedLeads || inv.linkedLeads.length === 0;
    }

    return (
      matchesSector &&
      matchesType &&
      matchesLocation &&
      matchesMandateStatus &&
      matchesLinkStatus
    );
  });
}, [investors, filters]);

    const deleteInvestorMutation = useMutation({
    mutationFn: async (investorId: number) => {
      await apiRequest("PATCH", `/investors/${investorId}/soft-delete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor-metrics"] });
    },
  });

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
                onDeleteInvestor={(investor) => {
                    if (window.confirm(`Delete investor "${investor.name}"?`)) {
                        deleteInvestorMutation.mutate(investor.id);
                    }
                }}
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

<div className="flex items-center justify-between pt-2">
  <div className="text-sm text-muted-foreground">
    Page {page} of {totalPages} • Showing {rows.length} of {total} investors
  </div>

  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page <= 1}
    >
      Previous
    </Button>

    <span className="text-sm text-muted-foreground">Go to</span>

    <Input
      className="w-20 h-9"
      type="number"
      min={1}
      max={totalPages}
      value={goToPageInput}
      onChange={(e) => setGoToPageInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleGoToPage();
        }
      }}
    />

    <Button variant="outline" size="sm" onClick={handleGoToPage}>
      Go
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
      disabled={page >= totalPages}
    >
      Next
    </Button>
  </div>
</div>

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