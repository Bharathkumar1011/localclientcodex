import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LeadFilters = {
  searchTerm: string;
  filterSector: string;
  filterSubSector: string;
  filterAssignedTo: string;
  filterLocation: string;
  filterStage: string;
};
const STORAGE_KEY = "leadFilters:v1";

const defaultFilters: LeadFilters = {
  searchTerm: "",
  filterSector: "all",
  filterSubSector: "all",
  filterAssignedTo: "all",
  filterLocation: "all",
  filterStage: "all",
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
        const parsed = JSON.parse(raw);
        return { ...defaultFilters, ...parsed };
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
