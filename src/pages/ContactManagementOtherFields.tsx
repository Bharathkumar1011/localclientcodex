import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type FieldFilter =
  | "sector"
  | "leadSource"
  | "website"
  | "revenueInrCr"
  | "ebitdaInrCr"
  | "patInrCr";

type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
};

type OtherFieldsRow = {
  leadId: number;
  companyId: number;
  companyName: string;

  sector: string;
  leadSource: string;
  website: string;

  revenueInrCr: number | null;
  ebitdaInrCr: number | null;
  patInrCr: number | null;

  analystId?: string | null;
  partnerId?: string | null;
};

type OtherFieldsResponse = { items: OtherFieldsRow[] };

type Draft = {
  sector: string;
  leadSource: string; // store blank as ""
  website: string;
  revenueInrCr?: number;
  ebitdaInrCr?: number;
  patInrCr?: number;
};

const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "not_set", label: "Not set" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "otherchannelpartner", label: "Other Channel Partner" },
  { value: "idfc", label: "IDFC" },
  { value: "maheen", label: "Maheen" },
  { value: "altmount", label: "Altmount" },
];

const normText = (v: any) => (typeof v === "string" ? v.trim() : v);
const normNum = (v: any) => (v === null || v === undefined ? undefined : Number(v));

const safeUrl = (url: string) => {
  const u = (url || "").trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
};

const isBlankText = (v: any) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "na" || s === "n/a" || s === "-" || s === "—";
};

// numbers: null/undefined/"" are blank; 0 is filled
const isBlankNumber = (v: any) => v === null || v === undefined || v === "";

export default function ContactManagementOtherFields() {
  const { toast } = useToast();

  // search + filters
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<FieldFilter>("sector");
  const [statusFilter, setStatusFilter] = useState<"all" | "blank" | "not_blank">("all");
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");

  const clearFilters = () => {
    setSearch("");
    setFieldFilter("sector");
    setStatusFilter("all");
    setAnalystFilter("all");
    setPartnerFilter("all");
  };

  // users for analyst/partner dropdown
  const { data: usersData = [] } = useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/users");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const analysts = useMemo(() => usersData.filter((u) => u.role === "analyst"), [usersData]);
  const partners = useMemo(() => usersData.filter((u) => u.role === "partner"), [usersData]);

  const userLabel = (u: AppUser) => {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || u.email || u.id;
  };

  // table data
  const { data, isLoading, error } = useQuery<OtherFieldsResponse>({
    queryKey: ["contact-management-other-fields"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/contact-management/other-fields");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  // ✅ Initialize drafts from sessionStorage OR server data
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    const saved = sessionStorage.getItem("contact-other-fields-drafts");
    return saved ? JSON.parse(saved) : {};
  });

  const [savingLeadId, setSavingLeadId] = useState<number | null>(null);

  // Sync from server only if no draft exists for that row
  useEffect(() => {
    if (!data?.items) return;
    
    setDrafts((prev) => {
      const next = { ...prev };
      let hasChanges = false;

      for (const r of data.items) {
        // Only initialize if not already in drafts (preserve user edits)
        if (!next[r.leadId]) {
          next[r.leadId] = {
            sector: r.sector ?? "",
            leadSource: r.leadSource ?? "",
            website: r.website ?? "",
            revenueInrCr: r.revenueInrCr ?? undefined,
            ebitdaInrCr: r.ebitdaInrCr ?? undefined,
            patInrCr: r.patInrCr ?? undefined,
          };
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, [data?.items]);

  // Persist drafts to sessionStorage whenever they change
  useEffect(() => {
    if (Object.keys(drafts).length > 0) {
      sessionStorage.setItem("contact-other-fields-drafts", JSON.stringify(drafts));
    }
  }, [drafts]);

  // ✅ VISUAL HEADER COMPONENT
  // This renders the "Name (F 10 | B 5)" logic as a Progress Bar
  const HeaderStat = ({ label, filled, blank, compact = false }: { label: string; filled: number; blank: number; compact?: boolean }) => {
    const total = filled + blank;
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);

    return (
      <div className="flex flex-col">
        <span className={compact ? "text-[10px] font-semibold text-slate-700" : ""}>{label}</span>
        <div className="flex flex-col gap-0.5 mt-1">
          {/* Progress Bar */}
          <div className={`h-1.5 w-full ${compact ? "max-w-[60px]" : "max-w-[80px]"} bg-slate-200 rounded-full overflow-hidden`}>
            <div 
              className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
          {/* Text Stats */}
          <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
            <span className="text-emerald-600/90">{filled} F</span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-amber-600/90">{blank} B</span>
          </span>
        </div>
      </div>
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { leadId: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/contact-management/other-fields/${payload.leadId}`, payload.updates);
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["contact-management-other-fields"] });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      
      // Keep the draft in sync until page refresh, or clear it if you prefer strict sync
      // We leave it as is to avoid UI jumping
      toast({ title: "Saved", description: "Row updated successfully." });
    },
    onError: (err: any) => {
      toast({
        title: "Save failed",
        description: err?.message || "Could not save row",
        variant: "destructive",
      });
    },
    onSettled: () => setSavingLeadId(null),
  });

  const items = data?.items || [];

  const isDirty = (row: OtherFieldsRow) => {
    const d = drafts[row.leadId];
    if (!d) return false;

    if (normText(d.sector) !== normText(row.sector)) return true;
    if (normText(d.leadSource) !== normText(row.leadSource)) return true;
    if (normText(d.website) !== normText(row.website)) return true;

    if (normNum(d.revenueInrCr) !== normNum(row.revenueInrCr)) return true;
    if (normNum(d.ebitdaInrCr) !== normNum(row.ebitdaInrCr)) return true;
    if (normNum(d.patInrCr) !== normNum(row.patInrCr)) return true;

    return false;
  };

  const buildUpdates = (row: OtherFieldsRow) => {
    const d = drafts[row.leadId];
    const updates: any = {};

    if (normText(d.sector) !== normText(row.sector)) updates.sector = d.sector;
    if (normText(d.leadSource) !== normText(row.leadSource)) updates.leadSource = d.leadSource;
    if (normText(d.website) !== normText(row.website)) updates.website = d.website;

    if (normNum(d.revenueInrCr) !== normNum(row.revenueInrCr)) updates.revenueInrCr = d.revenueInrCr;
    if (normNum(d.ebitdaInrCr) !== normNum(row.ebitdaInrCr)) updates.ebitdaInrCr = d.ebitdaInrCr;
    if (normNum(d.patInrCr) !== normNum(row.patInrCr)) updates.patInrCr = d.patInrCr;

    return updates;
  };

  const onSaveRow = (row: OtherFieldsRow) => {
    const updates = buildUpdates(row);
    if (Object.keys(updates).length === 0) return;

    setSavingLeadId(row.leadId);
    saveMutation.mutate({ leadId: row.leadId, updates });
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const getPersistedValue = (row: OtherFieldsRow) => {
        switch (fieldFilter) {
            case "sector": return row.sector ?? "";
            case "leadSource": return row.leadSource ?? "";
            case "website": return row.website ?? "";
            case "revenueInrCr": return row.revenueInrCr;
            case "ebitdaInrCr": return row.ebitdaInrCr;
            case "patInrCr": return row.patInrCr;
            default: return "";
        }
    };

    return (items || []).filter((row) => {
      if (q && !String(row.companyName || "").toLowerCase().includes(q)) return false;

      if (analystFilter !== "all" && (row.analystId || "") !== analystFilter) return false;
      if (partnerFilter !== "all" && (row.partnerId || "") !== partnerFilter) return false;

      if (statusFilter !== "all") {
        const persisted = getPersistedValue(row);
        const blank =
          fieldFilter === "revenueInrCr" || fieldFilter === "ebitdaInrCr" || fieldFilter === "patInrCr"
            ? isBlankNumber(persisted)
            : isBlankText(persisted);

        if (statusFilter === "blank" && !blank) return false;
        if (statusFilter === "not_blank" && blank) return false;
      }

      return true;
    });
  }, [items, search, fieldFilter, statusFilter, drafts, analystFilter, partnerFilter]);

  const headerCounts = useMemo(() => {
    const isFilledText = (v: any) => !isBlankText(v);
    const isFilledNumber = (v: any) => !isBlankNumber(v);

    const counts = {
      sector: { f: 0, b: 0 },
      leadSource: { f: 0, b: 0 },
      website: { f: 0, b: 0 },
      revenue: { f: 0, b: 0 },
      ebitda: { f: 0, b: 0 },
      pat: { f: 0, b: 0 },
    };

    for (const row of filteredRows) {
      const d = drafts[row.leadId] ?? ({} as Draft);

      const sector = d.sector ?? row.sector ?? "";
      const leadSource = d.leadSource ?? row.leadSource ?? "";
      const website = d.website ?? row.website ?? "";

      const revenue = (d as any).revenueInrCr ?? row.revenueInrCr;
      const ebitda = (d as any).ebitdaInrCr ?? row.ebitdaInrCr;
      const pat = (d as any).patInrCr ?? row.patInrCr;

      if (isFilledText(sector)) counts.sector.f += 1; else counts.sector.b += 1;
      if (isFilledText(leadSource)) counts.leadSource.f += 1; else counts.leadSource.b += 1;
      if (isFilledText(website)) counts.website.f += 1; else counts.website.b += 1;
      if (isFilledNumber(revenue)) counts.revenue.f += 1; else counts.revenue.b += 1;
      if (isFilledNumber(ebitda)) counts.ebitda.f += 1; else counts.ebitda.b += 1;
      if (isFilledNumber(pat)) counts.pat.f += 1; else counts.pat.b += 1;
    }

    return { companies: filteredRows.length, ...counts };
  }, [filteredRows, drafts]);

  const getActiveFieldStats = () => {
    switch (fieldFilter) {
      case "sector": return headerCounts.sector;
      case "leadSource": return headerCounts.leadSource;
      case "website": return headerCounts.website;
      case "revenueInrCr": return headerCounts.revenue;
      case "ebitdaInrCr": return headerCounts.ebitda;
      case "patInrCr": return headerCounts.pat;
      default: return { f: 0, b: 0 };
    }
  };
  const activeStats = getActiveFieldStats();

  if (isLoading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-sm text-red-600">Failed to load Other Fields</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Other Fields (Active Leads)</CardTitle>
            <div className="w-[280px]">
              <Input placeholder="Search company..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <Select value={analystFilter} onValueChange={setAnalystFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Analysts" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50 max-h-64 overflow-y-auto">
                <SelectItem value="all">All Analysts</SelectItem>
                {analysts.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{userLabel(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Partners" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50 max-h-64 overflow-y-auto">
                <SelectItem value="all">All Partners</SelectItem>
                {partners.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{userLabel(u)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fieldFilter} onValueChange={(v: any) => setFieldFilter(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Field" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="sector">Sector</SelectItem>
                <SelectItem value="leadSource">Lead Source</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="revenueInrCr">Revenue</SelectItem>
                <SelectItem value="ebitdaInrCr">EBITDA</SelectItem>
                <SelectItem value="patInrCr">PAT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="blank" className="text-amber-600">Blank ({activeStats.b})</SelectItem>
                <SelectItem value="not_blank" className="text-emerald-600">Filled ({activeStats.f})</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-9" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="max-h-[70vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-white shadow-sm">
                <tr className="border-b bg-white">
                  <th className="px-3 py-2 text-left w-[220px] bg-white">
                    Company <span className="text-muted-foreground font-normal">({headerCounts.companies})</span>
                  </th>
                  <th className="px-3 py-2 text-left w-[180px] bg-white align-top">
                    <HeaderStat label="Sector" filled={headerCounts.sector.f} blank={headerCounts.sector.b} />
                  </th>
                  <th className="px-3 py-2 text-left w-[180px] bg-white align-top">
                    <HeaderStat label="Lead Source" filled={headerCounts.leadSource.f} blank={headerCounts.leadSource.b} />
                  </th>
                  <th className="px-3 py-2 text-left w-[260px] bg-white align-top">
                    <HeaderStat label="Website" filled={headerCounts.website.f} blank={headerCounts.website.b} />
                  </th>
                  <th className="px-3 py-2 text-left w-[260px] bg-white align-top">
                     <div className="flex flex-col">
                        <span>Financial Info</span>
                        <div className="flex gap-4 mt-1">
                             {/* ✅ FIX: Showing F | B for all three financial fields */}
                             <HeaderStat compact label="Revenue" filled={headerCounts.revenue.f} blank={headerCounts.revenue.b} />
                             <HeaderStat compact label="EBITDA" filled={headerCounts.ebitda.f} blank={headerCounts.ebitda.b} />
                             <HeaderStat compact label="PAT" filled={headerCounts.pat.f} blank={headerCounts.pat.b} />
                        </div>
                     </div>
                  </th>
                  <th className="px-3 py-2 text-center w-[120px] bg-white align-top pt-3">Save</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => {
                  const d = drafts[row.leadId];
                  const dirty = isDirty(row);

                  return (
                    <tr key={row.leadId} className={["border-b align-top", dirty ? "bg-yellow-50/60" : ""].join(" ")}>
                      <td className="px-3 py-2 font-medium">{row.companyName}</td>

                      <td className="px-3 py-2">
                        <Input
                          value={d?.sector ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.leadId]: { ...(prev[row.leadId] || ({} as Draft)), sector: e.target.value },
                            }))
                          }
                        />
                      </td>

                      <td className="px-3 py-2">
                        <Select
                          value={(d?.leadSource || "").trim() ? d!.leadSource : "not_set"}
                          onValueChange={(val) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.leadId]: {
                                ...(prev[row.leadId] || ({} as Draft)),
                                leadSource: val === "not_set" ? "" : val,
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Lead Source" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-50 max-h-64 overflow-y-auto">
                            {LEAD_SOURCE_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={d?.website ?? ""}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.leadId]: { ...(prev[row.leadId] || ({} as Draft)), website: e.target.value },
                              }))
                            }
                          />
                          {(d?.website || "").trim() ? (
                            <a
                              href={safeUrl(d.website)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              title="Open website"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={d?.revenueInrCr ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDrafts((prev) => ({
                                ...prev,
                                [row.leadId]: {
                                  ...(prev[row.leadId] || ({} as Draft)),
                                  revenueInrCr: v === "" ? undefined : Number(v),
                                },
                              }));
                            }}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={d?.ebitdaInrCr ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDrafts((prev) => ({
                                ...prev,
                                [row.leadId]: {
                                  ...(prev[row.leadId] || ({} as Draft)),
                                  ebitdaInrCr: v === "" ? undefined : Number(v),
                                },
                              }));
                            }}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={d?.patInrCr ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDrafts((prev) => ({
                                ...prev,
                                [row.leadId]: {
                                  ...(prev[row.leadId] || ({} as Draft)),
                                  patInrCr: v === "" ? undefined : Number(v),
                                },
                              }));
                            }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">Revenue / EBITDA / PAT (₹ Cr)</div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <Button size="sm" onClick={() => onSaveRow(row)} disabled={!dirty || savingLeadId === row.leadId}>
                          {savingLeadId === row.leadId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" /> Save
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      No active leads found.
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