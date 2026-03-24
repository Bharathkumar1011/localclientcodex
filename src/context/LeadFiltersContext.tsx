import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LeadFilters = {
  searchTerm: string;



  // ✅ multi-select filters: empty array means "All"
  filterSector: string[];
  filterSubSector: string[];
  filterAssignedTo: string[];     // ids and/or "unassigned"
  filterPartner: string[];        // ids and/or "unassigned"
  filterLocation: string[];
  filterStage: string[];
  filterPoc: string[];            // e.g. "has_poc1", "only_poc2"
  filterLeadSource: string[];     // e.g. "inbound", "outbound"
  filterLeadTemperature: string[];// e.g. "hot", "warm", "not_set"
      // ✅ EPN filters (empty array = "All")
  filterEpnLinkage: string[];       // "linked" | "unlinked"
  filterEpnBucket: string[];        // idfc | other_channel_partner | other_epn
  filterEpnCategory: string[];      // category values
  filterEpnStage: string[];         // outreach | active | rainmaking
  filterEpnPartnerIds: string[];    // partner ids as strings
};

const STORAGE_KEY = "leadFilters:v1";

const defaultFilters: LeadFilters = {
  searchTerm: "",


  // ✅ empty array means "All"
  filterSector: [],
  filterSubSector: [],
  filterAssignedTo: [],
  filterPartner: [],
  filterLocation: [],
  filterStage: [],
  filterPoc: [],
  filterLeadSource: [],
  filterLeadTemperature: [],
  
  filterEpnLinkage: [],
  filterEpnBucket: [],
  filterEpnCategory: [],
  filterEpnStage: [],
  filterEpnPartnerIds: [],
};


type Ctx = {
  filters: LeadFilters;
  setFilters: React.Dispatch<React.SetStateAction<LeadFilters>>;
  clearFilters: () => void;
};

const LeadFiltersContext = createContext<Ctx | null>(null);

export function LeadFiltersProvider({ children }: { children: React.ReactNode }) {
const [filters, setFilters] = useState<LeadFilters>(() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters;

    const parsed: any = JSON.parse(raw);

    // ✅ migrate old string-based filters -> array-based filters
    const toArr = (v: any) => {
      if (Array.isArray(v)) return v.filter(Boolean);
      if (typeof v === "string") {
        if (!v || v === "all") return [];
        return [v];
      }
      return [];
    };

    const migrated: LeadFilters = {
      ...defaultFilters,
      ...parsed,

      filterSector: toArr(parsed.filterSector),
      filterSubSector: toArr(parsed.filterSubSector),
      filterAssignedTo: toArr(parsed.filterAssignedTo),
      filterPartner: toArr(parsed.filterPartner),
      filterLocation: toArr(parsed.filterLocation),
      filterStage: toArr(parsed.filterStage),
      filterPoc: toArr(parsed.filterPoc),
      filterLeadSource: toArr(parsed.filterLeadSource),
      filterLeadTemperature: toArr(parsed.filterLeadTemperature),

      filterEpnLinkage: toArr(parsed.filterEpnLinkage),
      filterEpnBucket: toArr(parsed.filterEpnBucket),
      filterEpnCategory: toArr(parsed.filterEpnCategory),
      filterEpnStage: toArr(parsed.filterEpnStage),
      filterEpnPartnerIds: toArr(parsed.filterEpnPartnerIds),
    };

    return migrated;
  } catch {
    return defaultFilters;
  }
});

    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
        } catch {}
        }, [filters]);


  const value = useMemo(
    () => ({
      filters,
      setFilters,
      clearFilters: () => {
        setFilters(defaultFilters);
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
        },
    }),
    [filters]
  );

  return (
    <LeadFiltersContext.Provider value={value}>
      {children}
    </LeadFiltersContext.Provider>
  );
}

export function useLeadFilters() {
  const ctx = useContext(LeadFiltersContext);
  if (!ctx) throw new Error("useLeadFilters must be used inside LeadFiltersProvider");
  return ctx;
}
