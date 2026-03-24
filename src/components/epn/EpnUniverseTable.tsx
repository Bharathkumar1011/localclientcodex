import React, { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import EpnCard from "./EpnCard";
import { useLocation } from "wouter";

import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Link as LinkIcon, Edit, Activity, MoveRight, Search, X, Filter } from "lucide-react";

export type EpnBucket = "idfc" | "other_channel_partner" | "other_epn";
export type EpnStage = "outreach" | "active" | "rainmaking";

export type EpnPartnerRow = {
  id: number;
  name: string;
  bucket: EpnBucket;
  category?: string | null;
  stage: EpnStage;
  pocName?: string | null;
  designation?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  linkedin?: string | null;
  zone?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt?: string;
  updatedAt?: string;
  linkedCompanies?: { id: number; name: string }[];
};

const BUCKET_LABELS: Record<EpnBucket, string> = {
  idfc: "IDFC",
  other_channel_partner: "Other Channel Partners",
  other_epn: "Other EPN",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "— Select Category —" },
  { value: "channel_partner", label: "Channel Partner" },
  { value: "agency", label: "Agency" },
  { value: "sector_expert", label: "Sector Expert" },
  { value: "loan", label: "Loan" },
  { value: "law_firm", label: "Law Firm" },
  { value: "ca_firm", label: "CA Firm" },
];

export default function EpnUniverseTable({
  title = "Universe",
  rows,
  bucket,
  queryKey = ["/epn"], // Add this! Default to ["/epn"] if not provided
}: {
  title?: string;
  rows: EpnPartnerRow[];
  bucket?: string;
}) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Track which row is expanded
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterLinkage, setFilterLinkage] = useState("all");
  const [filterStage, setFilterStage] = useState("all");

  const toggleRow = (id: number) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // MUTATION: Auto-save Category
 // MUTATION: Auto-save Category (with Optimistic Update)
const updateCategory = useMutation({
    mutationFn: async ({ id, category }: { id: number; category: string }) => {
      await apiRequest("PATCH", `/epn/${id}/category`, { category });
    },
    onMutate: async ({ id, category }) => {
      // Use the queryKey prop here!
      await queryClient.cancelQueries({ queryKey });

      const previousEpns = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: EpnPartnerRow[] | undefined) => {
        if (!old) return old;
        return old.map((row) =>
          row.id === id ? { ...row, category } : row
        );
      });

      return { previousEpns };
    },
    onError: (err, variables, context) => {
      if (context?.previousEpns) {
        queryClient.setQueryData(queryKey, context.previousEpns);
      }
    },
    onSettled: () => {
      // And here!
      queryClient.invalidateQueries({ queryKey });
    },
  });

  
  // MUTATION: Auto-save Stage
  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      await apiRequest("PATCH", `/epn/${id}/stage`, { stage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/epn"] });
      queryClient.invalidateQueries({ queryKey: ["/api/epn/bucket-metrics"] }); // Invalidate bucket metrics to update counts on the Dashboard
    },
  });

  const getStageColors = (stage: string) => {
    switch (stage) {
      case "outreach": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
      case "active": return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
      case "rainmaking": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // --- DERIVE FILTER OPTIONS DYNAMICALLY ---
  const uniqueZones = Array.from(new Set(rows.map(r => r.zone).filter(Boolean))) as string[];
  const uniqueStates = Array.from(new Set(rows.map(r => r.state).filter(Boolean))) as string[];

  // --- APPLY FILTERS ---
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        r.name.toLowerCase().includes(searchLower) || 
        (r.pocName && r.pocName.toLowerCase().includes(searchLower));

      // 2. Category
      const matchesCategory = !filterCategory || r.category === filterCategory;

      // 3. Zone
      const matchesZone = !filterZone || r.zone === filterZone;

      // 4. State
      const matchesState = !filterState || r.state === filterState;

      // 5. Stage (Useful mainly on the "Universe" tab where all stages are mixed)
      const matchesStage = filterStage === "all" || r.stage === filterStage;

      // 6. Linkage Status
      let matchesLinkage = true;
      if (filterLinkage === "linked") matchesLinkage = (r.linkedCompanies?.length || 0) > 0;
      if (filterLinkage === "unlinked") matchesLinkage = !r.linkedCompanies || r.linkedCompanies.length === 0;

      return matchesSearch && matchesCategory && matchesZone && matchesState && matchesStage && matchesLinkage;
    });
  }, [rows, searchTerm, filterCategory, filterZone, filterState, filterStage, filterLinkage]);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlightEpnId = Number(params.get("highlightEpn"));

    if (!highlightEpnId) return;

    const targetExists = filteredRows.some((row) => row.id === highlightEpnId);
    if (!targetExists) return;

    setExpandedRowId(highlightEpnId);

    const timer = window.setTimeout(() => {
      highlightRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [filteredRows]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("");
    setFilterZone("");
    setFilterState("");
    setFilterLinkage("all");
    setFilterStage("all");
  };

  const hasActiveFilters = searchTerm || filterCategory || filterZone || filterState || filterLinkage !== "all" || filterStage !== "all";

  return (
    <div className="border rounded-lg shadow-sm bg-white dark:bg-neutral-900 overflow-hidden flex flex-col">
      
      {/* HEADER */}
      <div className="bg-gray-50 dark:bg-neutral-800/50 px-5 py-4 flex flex-wrap items-center justify-between border-b gap-4">
        <div className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <div className="text-sm px-3 py-1 bg-white dark:bg-neutral-800 border rounded-full text-muted-foreground shadow-sm">
          Showing: <span className="font-bold text-gray-900 dark:text-gray-100">{filteredRows.length}</span> / {rows.length}
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-neutral-900 p-4 border-b border-gray-100 dark:border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-1">
          <Filter className="w-4 h-4" /> Filter Partners
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Global Search */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search names..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-100 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.filter(o => o.value !== "").map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Zone Filter */}
          <select
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-100 outline-none disabled:opacity-50"
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            disabled={uniqueZones.length === 0}
          >
            <option value="">All Zones</option>
            {uniqueZones.sort().map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>

          {/* State Filter */}
          <select
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-100 outline-none disabled:opacity-50"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            disabled={uniqueStates.length === 0}
          >
            <option value="">All States</option>
            {uniqueStates.sort().map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          {/* Linkage Filter */}
          <select
            className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-md bg-gray-50 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-100 outline-none"
            value={filterLinkage}
            onChange={(e) => setFilterLinkage(e.target.value)}
          >
            <option value="all">All Linkage Status</option>
            <option value="linked">Has Linked Deals</option>
            <option value="unlinked">No Linked Deals</option>
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-md transition-colors border border-red-100 dark:border-red-900/30"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}

        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-neutral-800/50 text-gray-500 dark:text-gray-400 border-b">
            <tr>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">
                {bucket === 'idfc' ? 'Relationship Manager (RM)' : 'Network Partner'}
              </th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Category</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Linked Companies</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">Stage</th>
              <th className="px-5 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td className="px-5 py-12 text-center text-muted-foreground" colSpan={5}>
                  {rows.length === 0 ? "No partners exist in this list yet." : "No partners match your current filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    ref={expandedRowId === r.id ? highlightRowRef : null}
                    className={`hover:bg-gray-50/50 dark:hover:bg-neutral-800/20 transition-colors ${expandedRowId === r.id ? "bg-slate-50/50 dark:bg-neutral-800/30" : ""}`}
                  >
                  
                  {/* COL 1: Network Partner */}
                  <td className="px-5 py-4">
                    <div 
                      className="font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline flex items-center gap-2"
                      onClick={() => toggleRow(r.id)}
                    >
                      {r.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded text-[10px] font-medium uppercase tracking-wider">
                        {BUCKET_LABELS[r.bucket]}
                      </span>
                      {r.designation && <span>• {r.designation}</span>}
                      {r.city && <span>• {r.city}</span>}
                    </div>
                  </td>

                  {/* COL 2: Category Dropdown */}
                  <td className="px-5 py-4">
                    <select
                      className="border-gray-200 dark:border-neutral-700 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-neutral-900 hover:border-blue-400 transition-colors focus:ring-2 focus:ring-blue-100 outline-none w-40"
                      value={r.category ?? ""}
                      disabled={updateCategory.isPending}
                      onChange={(e) => updateCategory.mutate({ id: r.id, category: e.target.value })}
                    >
                      {CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* COL 3: Linked Companies */}
                  <td className="px-5 py-4">
                    {!r.linkedCompanies || r.linkedCompanies.length === 0 ? (
                      <span className="text-xs text-gray-400 italic bg-gray-50 dark:bg-neutral-800 px-2 py-1 rounded">
                        No links yet
                      </span>
                    ) : (
                      <select 
                        className="border-gray-200 dark:border-neutral-700 rounded-md px-3 py-1.5 text-sm bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 hover:border-blue-400 transition-colors focus:outline-none w-48 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          {r.linkedCompanies.length} Linked {r.linkedCompanies.length === 1 ? 'Company' : 'Companies'}
                        </option>
                        {r.linkedCompanies.map((c) => (
                          <option key={c.id} value={c.id} disabled>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  {/* COL 4: Stage Dropdown */}
                  <td className="px-5 py-4">
                    <select
                      className={`border rounded-full px-3 py-1 text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer transition-colors ${getStageColors(r.stage)}`}
                      value={r.stage}
                      disabled={updateStage.isPending}
                      onChange={(e) => updateStage.mutate({ id: r.id, stage: e.target.value })}
                    >
                      <option value="outreach">Outreach</option>
                      <option value="active">Active</option>
                      <option value="rainmaking">Rainmakers</option>
                    </select>
                  </td>

                  {/* COL 5: Actions Dropdown */}
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md transition-colors outline-none focus:ring-2 focus:ring-blue-100">
                        <MoreHorizontal className="h-5 w-5 text-gray-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 shadow-xl rounded-md p-1 z-50">
                        
                        {/* Action: Link Companies */}
                        <DropdownMenuItem 
                          className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          onClick={() => setLocation(`/epn/${r.id}/link-leads`)}
                        >
                          <LinkIcon className="h-4 w-4 mr-2 text-blue-600" />
                          Link Companies
                        </DropdownMenuItem>

                        {/* Action: View/Edit Details */}
                        <DropdownMenuItem 
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                          onClick={() => toggleRow(r.id)}
                        >
                          <Edit className="h-4 w-4 mr-2 text-indigo-600" />
                          {expandedRowId === r.id ? "Close Details" : "View Details"}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Action: Move Stage */}
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center">
                          <Activity className="h-3 w-3 mr-1" />
                          Move Stage
                        </div>
                        <DropdownMenuItem 
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                          disabled={r.stage === "outreach"}
                          onClick={() => updateStage.mutate({ id: r.id, stage: "outreach" })}
                        >
                          <MoveRight className={`h-4 w-4 mr-2 ${r.stage === 'outreach' ? 'opacity-0' : 'text-gray-400'}`} />
                          To Outreach
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          disabled={r.stage === "active"}
                          onClick={() => updateStage.mutate({ id: r.id, stage: "active" })}
                        >
                          <MoveRight className={`h-4 w-4 mr-2 ${r.stage === 'active' ? 'opacity-0' : 'text-amber-500'}`} />
                          To Active
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/20"
                          disabled={r.stage === "rainmaking"}
                          onClick={() => updateStage.mutate({ id: r.id, stage: "rainmaking" })}
                        >
                          <MoveRight className={`h-4 w-4 mr-2 ${r.stage === 'rainmaking' ? 'opacity-0' : 'text-green-500'}`} />
                          To Rainmakers
                        </DropdownMenuItem>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>

                {/* EXPANDED ROW */}
                {expandedRowId === r.id && (
                  <tr>
                    <td colSpan={5} className="p-0 border-b-0">
                      <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                        <EpnCard partner={r} />
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}