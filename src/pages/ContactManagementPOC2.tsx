import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type POCRow = {
  leadId: number;
  companyId: number;
  companyName: string;
  contactId: number | null;
  name: string;
  designation: string;
  phone: string;
  linkedinProfile: string;
  email: string;
  analystId: string | null;
  analystName: string;
  partnerId: string | null;
  partnerName: string;
};

type Resp = { items: POCRow[] };

export default function ContactManagementPOC2() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<number, Omit<POCRow, "leadId" | "companyId" | "companyName">>>({});
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState<"phone" | "email" | "linkedinProfile">("phone");
  const [statusFilter, setStatusFilter] = useState<"all" | "blank" | "not_blank">("all");
  const [analystFilter, setAnalystFilter] = useState<string>("all");
  const [partnerFilter, setPartnerFilter] = useState<string>("all");


  const { data, isLoading, error } = useQuery<Resp>({
    queryKey: ["contact-management-poc2"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/contact-management/poc2");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });


type AppUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
};

const { data: usersData } = useQuery<AppUser[]>({
  queryKey: ["users"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/users");
    return res.json();
  },
  refetchOnWindowFocus: false,
});

const analysts = useMemo(
  () => (usersData || []).filter((u) => u.role === "analyst"),
  [usersData]
);
const partners = useMemo(
  () => (usersData || []).filter((u) => u.role === "partner"),
  [usersData]
);

const userLabel = (u: AppUser) => {
  const full = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return full || u.email || u.id;
};


  useEffect(() => {
    if (!data?.items) return;
    const next: Record<number, any> = {};
    for (const r of data.items) {
      next[r.companyId] = {
        contactId: r.contactId,
        name: r.name ?? "",
        designation: r.designation ?? "",
        phone: r.phone ?? "",
        linkedinProfile: r.linkedinProfile ?? "",
        email: r.email ?? "",
      };
    }
    setDrafts(next);
  }, [data?.items]);

const isBlankValue = (v: any) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "" || s === "na" || s === "n/a" || s === "-" || s === "—";
};


const filtered = useMemo(() => {
  const items = data?.items ?? [];
  const q = search.trim().toLowerCase();

  return items.filter((r) => {
    // search by company
    if (q && !r.companyName.toLowerCase().includes(q)) return false;

    // analyst filter
    if (analystFilter !== "all" && (r.analystId || "") !== analystFilter) return false;

    // partner filter
    if (partnerFilter !== "all" && (r.partnerId || "") !== partnerFilter) return false;

// status filter for selected contact field
// ✅ IMPORTANT: use ONLY persisted server value so "Blank" rows don't disappear while typing
if (statusFilter !== "all") {
  const persistedValue = (r as any)[contactFilter] ?? "";
  const isBlank = isBlankValue(persistedValue);

  if (statusFilter === "blank" && !isBlank) return false;
  if (statusFilter === "not_blank" && isBlank) return false;
}


    return true;
  });
}, [data?.items, search, analystFilter, partnerFilter, statusFilter, contactFilter, drafts]);

// ✅ NEW: Dynamic header counts (Filled | Blank) using filtered rows + drafts
const headerCounts = useMemo(() => {
  const seen = new Set<number>();

  const norm = (v: any) => String(v ?? "").trim();
  const isBlank = (v: any) => {
    const s = norm(v).toLowerCase();
    return s === "" || s === "na" || s === "n/a" || s === "-" || s === "—";
  };
  const isFilled = (v: any) => !isBlank(v);

  let companies = 0;

  const counts = {
    name: { f: 0, b: 0 },
    designation: { f: 0, b: 0 },
    phone: { f: 0, b: 0 },
    linkedin: { f: 0, b: 0 },
    email: { f: 0, b: 0 },
  };

  for (const r of filtered) {
    // ✅ dedupe by company
    if (seen.has(r.companyId)) continue;
    seen.add(r.companyId);
    companies += 1;

    const d: any = drafts[r.companyId] ?? {};

    const liveName = d.name ?? r.name ?? "";
    const liveDesignation = d.designation ?? r.designation ?? "";
    const livePhone = d.phone ?? r.phone ?? "";
    const liveLinkedin = d.linkedinProfile ?? r.linkedinProfile ?? "";
    const liveEmail = d.email ?? r.email ?? "";

    if (isFilled(liveName)) counts.name.f += 1;
    else counts.name.b += 1;

    if (isFilled(liveDesignation)) counts.designation.f += 1;
    else counts.designation.b += 1;

    if (isFilled(livePhone)) counts.phone.f += 1;
    else counts.phone.b += 1;

    if (isFilled(liveLinkedin)) counts.linkedin.f += 1;
    else counts.linkedin.b += 1;

    if (isFilled(liveEmail)) counts.email.f += 1;
    else counts.email.b += 1;
  }

  return { companies, ...counts };
}, [filtered, drafts]);

// ✅ NEW: Reusable Component for Header Stats (Visual Progress Bar)
  const HeaderStat = ({ label, filled, blank }: { label: string; filled: number; blank: number }) => {
    const total = filled + blank;
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);

    return (
      <div className="flex flex-col">
        <span>{label}</span>
        <div className="flex flex-col gap-0.5 mt-1">
          <div className="h-1.5 w-full max-w-[80px] bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
              style={{ width: `${pct}%` }} 
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            <span className="text-emerald-600/80">{filled} Filled</span>
            <span className="mx-1 text-slate-300">|</span>
            <span className="text-amber-600/80">{blank} Blank</span>
          </span>
        </div>
      </div>
    );
  };


  const saveMutation = useMutation({
    mutationFn: async ({ companyId }: { companyId: number }) => {
      const d = drafts[companyId];
      if (!d) throw new Error("Missing draft");

      const body = {
        companyId,
        name: d.name,
        designation: d.designation,
        phone: d.phone,
        email: d.email,
        linkedinProfile: d.linkedinProfile,
      };

      const allEmpty =
        !body.name?.trim() &&
        !body.designation?.trim() &&
        !body.phone?.trim() &&
        !body.email?.trim() &&
        !body.linkedinProfile?.trim();

      if (allEmpty) throw new Error("Nothing to save");

      if (d.contactId) {
        const res = await apiRequest("PUT", `/contacts/${d.contactId}`, body);
        return res.json();
      }

      // POC2 is NOT primary
      const res = await apiRequest("POST", `/contacts`, { ...body, isPrimary: false });
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Saved", description: "POC2 updated successfully." });
      await queryClient.invalidateQueries({ queryKey: ["contact-management-poc2"] });
      await queryClient.invalidateQueries({ queryKey: ["contact-management-metrics"] });
      await queryClient.invalidateQueries({ queryKey: ["leads", "stage", "all"] });
    },
    onError: (e: any) => {
      toast({
        title: "Save failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearFilters = () => {
    setSearch("");
    setContactFilter("phone");
    setStatusFilter("all");
    setAnalystFilter("all");
    setPartnerFilter("all");
  };


  const onChange = (companyId: number, key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] ?? {
          contactId: null,
          name: "",
          designation: "",
          phone: "",
          linkedinProfile: "",
          email: "",
        }),
        [key]: value,
      },
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Contact Management — POC 2</h2>
        <p className="text-sm text-muted-foreground">
          Update the second contact (non-primary) for every lead.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between">
            <CardTitle>POC 2 Table</CardTitle>
            <div className="w-[280px]">
            <Input
                placeholder="Search company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            </div>
        </div>

        {/* ✅ Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {/* Contacts */}
            <Select
              value={contactFilter}
              onValueChange={(v: "phone" | "email" | "linkedinProfile") => setContactFilter(v)}
            >
            <SelectTrigger className="h-9">
                <SelectValue placeholder="Contacts" />
            </SelectTrigger>
            <SelectContent className="bg-gray-50">
                <SelectItem value="phone">Mobile numbers</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="linkedinProfile">LinkedIn</SelectItem>
            </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "blank" | "not_blank") => setStatusFilter(v)}
            >
            <SelectTrigger className="h-9">
                <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-50">
                <SelectItem value="blank">Blank</SelectItem>
                <SelectItem value="not_blank">Not blank</SelectItem>
            </SelectContent>
            </Select>

            {/* Analysts */}
            <Select value={analystFilter} onValueChange={setAnalystFilter}>
            <SelectTrigger className="h-9">
                <SelectValue placeholder="Analysts" />
            </SelectTrigger>
            <SelectContent className="bg-gray-50">
                <SelectItem value="all">All Analysts</SelectItem>
                {analysts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                    {userLabel(a)}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>

            {/* Partners */}
            <Select value={partnerFilter} onValueChange={setPartnerFilter}>
            <SelectTrigger className="h-9">
                <SelectValue placeholder="Partners" />
            </SelectTrigger>
            <SelectContent className="bg-gray-50">
                <SelectItem value="all">All Partners</SelectItem>
                {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                    {userLabel(p)}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-9"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
        </div>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading leads...
            </div>
          )}

          {error && <div className="text-sm text-destructive">Failed to load POC2 table.</div>}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-md">
               <thead className="sticky top-0 z-20 bg-white shadow-sm">
                <tr className="border-b bg-white">
                  <th className="px-3 py-2 text-left w-[200px] bg-white align-top pt-3">
                    Company <span className="text-muted-foreground font-normal">({headerCounts.companies})</span>
                  </th>

                  <th className="px-3 py-2 text-left w-[180px] bg-white align-top">
                    <HeaderStat label="Name" filled={headerCounts.name.f} blank={headerCounts.name.b} />
                  </th>

                  <th className="px-3 py-2 text-left w-[180px] bg-white align-top">
                    <HeaderStat label="Designation" filled={headerCounts.designation.f} blank={headerCounts.designation.b} />
                  </th>

                  <th className="px-3 py-2 text-left w-[160px] bg-white align-top">
                    <HeaderStat label="Contact" filled={headerCounts.phone.f} blank={headerCounts.phone.b} />
                  </th>

                  <th className="px-3 py-2 text-left w-[220px] bg-white align-top">
                    <HeaderStat label="LinkedIn" filled={headerCounts.linkedin.f} blank={headerCounts.linkedin.b} />
                  </th>

                  <th className="px-3 py-2 text-left w-[220px] bg-white align-top">
                    <HeaderStat label="Email" filled={headerCounts.email.f} blank={headerCounts.email.b} />
                  </th>

                  <th className="px-3 py-2 text-center w-[100px] bg-white align-top pt-3">Save</th>
                </tr>
              </thead>
                <tbody>
                  {filtered.map((row) => {
                    const d = drafts[row.companyId] ?? {
                      contactId: row.contactId,
                      name: row.name ?? "",
                      designation: row.designation ?? "",
                      phone: row.phone ?? "",
                      linkedinProfile: row.linkedinProfile ?? "",
                      email: row.email ?? "",
                    };

                    const isSavingThis =
                      saveMutation.isPending && (saveMutation.variables as any)?.companyId === row.companyId;

                    return (
                      <tr key={`${row.leadId}-${row.companyId}`} className="border-t align-top">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{row.companyName}</td>
                        <td className="px-3 py-2 min-w-[180px]">
                          <Input value={d.name} onChange={(e) => onChange(row.companyId, "name", e.target.value)} />
                        </td>
                        <td className="px-3 py-2 min-w-[180px]">
                          <Input
                            value={d.designation}
                            onChange={(e) => onChange(row.companyId, "designation", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <Input value={d.phone} onChange={(e) => onChange(row.companyId, "phone", e.target.value)} />
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <Input
                            value={d.linkedinProfile}
                            onChange={(e) => onChange(row.companyId, "linkedinProfile", e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 min-w-[220px]">
                          <Input value={d.email} onChange={(e) => onChange(row.companyId, "email", e.target.value)} />
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button size="sm" onClick={() => saveMutation.mutate({ companyId: row.companyId })} disabled={isSavingThis}>
                            {isSavingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                        No leads found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
