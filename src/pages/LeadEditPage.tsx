import { useEffect, useState , type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/apiFetch";
import { apiRequest } from "@/lib/queryClient";
import POCManagement from "@/components/POCManagement";
import { LinkifyText } from "@/components/LinkifyText";

import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckSquare,
  Download,
  FileSpreadsheet,
  FileText,
  Flame,
  Link2,
  MessageSquareText,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

import type { Lead, Company } from "@/lib/types";

const LEAD_SOURCE_OPTIONS = [
  { value: "not_set", label: "Not set" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "otherchannelpartner", label: "Other Channel Partner" },
  { value: "idfc", label: "IDFC" },
  { value: "maheen", label: "Maheen" },
  { value: "altmount", label: "Altmount" },
];

const LEAD_TEMP_OPTIONS = [
  { value: "not_set", label: "Not set" },
  { value: "not_reached", label: "Not reached" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
];

type LeadSolutionNoteData = {
  id?: number;
  leadId?: number;
  pdfPath?: string | null;
  pdfName?: string | null;
  links?: string[];
};

type TrackerTab = "remarks" | "actionables" | "tasks";

const getOptionLabel = (
  options: { value: string; label: string }[],
  value: string | null | undefined,
  fallback = "Not set"
) => options.find((item) => item.value === value)?.label ?? fallback;

const getTemperatureBadgeClass = (value: string) => {
  switch (value) {
    case "hot":
      return "bg-red-50 text-red-700 border-red-200";
    case "warm":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "not_reached":
      return "bg-slate-50 text-slate-700 border-slate-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};


export default function LeadEditPage({ params }: { params: { id: string } }) {
  const leadId = Number(params?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [tracxnFile, setTracxnFile] = useState<File | null>(null);
  const [isParsingTracxn, setIsParsingTracxn] = useState(false);

  // -------------------------------
  // Fetch Lead
  // -------------------------------
  const { data: lead, isLoading: isLoadingLead } = useQuery({
    queryKey: ["leads", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}`);
      return res.json();
    },
    enabled: Number.isFinite(leadId),
  });

  const companyId = (lead as any)?.company?.id ?? (lead as any)?.companyId;


   // -------------------------------
  // Remarks
  // -------------------------------
  const { data: remarks = [], isLoading: isLoadingRemarks } = useQuery({
    queryKey: ["lead-remarks", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/remarks`);
      return res.json();
    },
    enabled: Number.isFinite(leadId),
  });

  const addRemarkMutation = useMutation({
    mutationFn: async () => {
      const remark = newRemark.trim();
      if (!remark) throw new Error("Remark is required");
      const res = await apiRequest("POST", `/leads/${leadId}/remarks`, { remark });
      return res.json();
    },
    onSuccess: async () => {
      setNewRemark("");
      toast({ title: "Remark added" });
      await queryClient.invalidateQueries({ queryKey: ["lead-remarks", leadId] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to save remark", description: err?.message });
    },
  });

  const deleteRemarkMutation = useMutation({
    mutationFn: async (remarkId: number) => {
      await apiRequest("DELETE", `/leads/${leadId}/remarks/${remarkId}`);
    },
    onSuccess: async () => {
      toast({ title: "Remark removed" });
      await queryClient.invalidateQueries({ queryKey: ["lead-remarks", leadId] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to delete remark" });
    },
  });

  // -------------------------------
  // Actionables
  // -------------------------------
  const { data: actionables = [], isLoading: isLoadingActionables } = useQuery({
    queryKey: ["lead-actionables", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/actionables`);
      return res.json();
    },
    enabled: Number.isFinite(leadId),
  });

  const addActionableMutation = useMutation({
    mutationFn: async () => {
      const text = newActionable.trim();
      if (!text) throw new Error("Actionable is required");
      const res = await apiRequest("POST", `/leads/${leadId}/actionables`, { text });
      return res.json();
    },
    onSuccess: async () => {
      setNewActionable("");
      toast({ title: "Actionable added" });
      await queryClient.invalidateQueries({ queryKey: ["lead-actionables", leadId] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Failed to save actionable", description: err?.message });
    },
  });

  const deleteActionableMutation = useMutation({
    mutationFn: async (actionId: number) => {
      await apiRequest("DELETE", `/leads/${leadId}/actionables/${actionId}`);
    },
    onSuccess: async () => {
      toast({ title: "Actionable removed" });
      await queryClient.invalidateQueries({ queryKey: ["lead-actionables", leadId] });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Failed to delete actionable" });
    },
  });

  // -------------------------------
  // Upcoming Tasks
  // -------------------------------
  const { data: leadDetails, isLoading: isLoadingLeadDetails } = useQuery({
    queryKey: ["lead-details", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/details`);
      return res.json();
    },
    enabled: Number.isFinite(leadId),
  });

  const upcomingTasksForLead = Array.isArray((leadDetails as any)?.upcomingTasks)
    ? (leadDetails as any).upcomingTasks
    : [];



  // -------------------------------
  // Fetch Company
  // -------------------------------
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ["companies", companyId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/companies/${companyId}`);
      return res.json();
    },
    enabled: !!companyId,
  });

  // -------------------------------
  // Editable State
  // -------------------------------
  const [editCompany, setEditCompany] = useState<any>({
    name: "",
    sector: "",
    subSector: "",
    location: "",
    website: "",
    businessDescription: "",
    revenueInrCr: "",
    ebitdaInrCr: "",
    patInrCr: "",
  });

const [notes, setNotes] = useState("");
const [leadSource, setLeadSource] = useState("not_set");
const [leadTemperature, setLeadTemperature] = useState("not_set");
const [chatgptLink, setChatgptLink] = useState("");
const [solutionLinkInput, setSolutionLinkInput] = useState("");
const [activeTrackerTab, setActiveTrackerTab] = useState<TrackerTab>("remarks");

// --- Remarks / Actionables ---
const [newRemark, setNewRemark] = useState("");
const [newActionable, setNewActionable] = useState("");


const fieldClass =
  "mt-2 border-slate-200 bg-white shadow-sm transition-all focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500/20";

const textareaClass =
  "mt-2 min-h-[130px] w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const compactTextareaClass =
  "mt-2 h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const panelClass =
  "space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm";

const selectClass =
  "mt-2 border-slate-200 bg-white shadow-sm transition-all focus:ring-2 focus:ring-blue-500/20";

const getSourceBadgeClass = (value: string) => {
  switch (value) {
    case "inbound":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "outbound":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "otherchannelpartner":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "idfc":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "maheen":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "altmount":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getTrackerTabClass = (tab: TrackerTab) => {
  const base = "rounded-xl border px-3 py-3 text-left text-sm transition-all";

  if (activeTrackerTab !== tab) {
    return `${base} border-transparent text-slate-500 hover:bg-white hover:text-slate-700`;
  }

  if (tab === "remarks") {
    return `${base} border-blue-200 bg-blue-50 text-blue-700 shadow-sm`;
  }

  if (tab === "actionables") {
    return `${base} border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm`;
  }

  return `${base} border-violet-200 bg-violet-50 text-violet-700 shadow-sm`;
};


  useEffect(() => {
    if (!company) return;
    setEditCompany({
      name: company.name ?? "",
      sector: company.sector ?? "",
      subSector: (company as any).subSector ?? "",
      location: company.location ?? "",
      website: (company as any).website ?? "",
      businessDescription: (company as any).businessDescription ?? "",
      revenueInrCr: (company as any).revenueInrCr ?? "",
      ebitdaInrCr: (company as any).ebitdaInrCr ?? "",
      patInrCr: (company as any).patInrCr ?? "",
    });
  }, [companyId, company]);

  useEffect(() => {
    if (!lead) return;
    setNotes((lead as any).notes ?? "");
    setLeadSource((lead as any).leadSource ?? "not_set");
    setLeadTemperature((lead as any).leadTemperature ?? "not_set");
    setChatgptLink((lead as any).chatgptLink ?? "");
  }, [leadId, lead]);

    // -------------------------------
  // Lead Solution Note
  // -------------------------------
  const solutionNoteQueryKey = ["/leads", leadId, "solution-note"];

  const { data: leadSolutionNote } = useQuery<LeadSolutionNoteData>({
    queryKey: solutionNoteQueryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/solution-note`);
      return res.json();
    },
    enabled: Number.isFinite(leadId),
  });

  const saveSolutionLinksMutation = useMutation({
    mutationFn: async (links: string[]) => {
      const res = await apiRequest("POST", `/leads/${leadId}/solution-note`, { links });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: solutionNoteQueryKey });
    },
    onError: () => {
      toast({ title: "Failed to save solution note links", variant: "destructive" });
    },
  });

  const uploadSolutionPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await apiFetch(`/api/leads/${leadId}/solution-note/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Solution note PDF uploaded" });
      await queryClient.invalidateQueries({ queryKey: solutionNoteQueryKey });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upload solution note PDF",
        description: error?.message || "Upload failed",
        variant: "destructive",
      });
    },
  });

  const handleSolutionPdfAction = async (mode: "preview" | "download") => {
    try {
      const endpoint =
        mode === "preview"
          ? `/api/leads/${leadId}/solution-note/preview`
          : `/api/leads/${leadId}/solution-note/download`;

      const res = await apiFetch(endpoint, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to ${mode} PDF`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      if (mode === "preview") {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 60000);
        return;
      }

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = leadSolutionNote?.pdfName || "Lead_Solution_Note.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error: any) {
      toast({
        title: `Failed to ${mode} solution note PDF`,
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const normalizeSolutionLink = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
  };

  const handleAddSolutionLink = (raw: string) => {
    const normalized = normalizeSolutionLink(raw);
    if (!normalized) {
      setSolutionLinkInput("");
      return;
    }

    const existingLinks = Array.isArray(leadSolutionNote?.links) ? leadSolutionNote.links : [];
    if (existingLinks.includes(normalized)) {
      setSolutionLinkInput("");
      return;
    }

    saveSolutionLinksMutation.mutate([...existingLinks, normalized]);
    setSolutionLinkInput("");
  };

  const handleRemoveSolutionLink = (linkToRemove: string) => {
    const existingLinks = Array.isArray(leadSolutionNote?.links) ? leadSolutionNote.links : [];
    saveSolutionLinksMutation.mutate(existingLinks.filter((link) => link !== linkToRemove));
  };

  const handleSolutionPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadSolutionPdfMutation.mutate(file);
    e.target.value = "";
  };

  // -------------------------------
  // Save Company Mutation
  // -------------------------------
  const saveCompanyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/companies/${companyId}`, {
        name: editCompany.name,
        sector: editCompany.sector,
        subSector: editCompany.subSector,
        location: editCompany.location,
        website: editCompany.website === "" ? null : editCompany.website  ,
        businessDescription: editCompany.businessDescription,
        revenueInrCr: editCompany.revenueInrCr === "" ? null : editCompany.revenueInrCr,
        ebitdaInrCr: editCompany.ebitdaInrCr === "" ? null : editCompany.ebitdaInrCr,
        patInrCr: editCompany.patInrCr === "" ? null : editCompany.patInrCr,
      });
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: "Company details saved" });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  // -------------------------------
  // Save Lead Mutation (notes + source + temp)
  // -------------------------------
  const saveLeadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/leads/${leadId}`, { notes });

      await apiRequest("PATCH", `/leads/${leadId}/source`, {
        leadSource: leadSource === "not_set" ? null : leadSource,
      });

      await apiRequest("PATCH", `/leads/${leadId}/temperature`, {
        leadTemperature: leadTemperature === "not_set" ? null : leadTemperature,
      });
      await apiRequest("PATCH", `/leads/${leadId}/chatgpt-link`, {
        chatgptLink: chatgptLink.trim() ? chatgptLink.trim() : null,
      });
    },
    onSuccess: async () => {
      toast({ title: "Lead settings saved" });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    },
  });


  const resetLeadEditForm = () => {
  setEditCompany({
    name: company.name ?? "",
    sector: company.sector ?? "",
    subSector: (company as any).subSector ?? "",
    location: company.location ?? "",
    website: (company as any).website ?? "",
    businessDescription: (company as any).businessDescription ?? "",
    revenueInrCr: (company as any).revenueInrCr ?? "",
    ebitdaInrCr: (company as any).ebitdaInrCr ?? "",
    patInrCr: (company as any).patInrCr ?? "",
  });

  setNotes((lead as any).notes ?? "");
  setLeadSource((lead as any).leadSource ?? "not_set");
  setLeadTemperature((lead as any).leadTemperature ?? "not_set");
  setChatgptLink((lead as any).chatgptLink ?? "");
  setSolutionLinkInput("");
  setTracxnFile(null);

  toast({ title: "Unsaved changes reset" });
};

const saveAllMutation = useMutation({
  mutationFn: async () => {
    await apiRequest("PUT", `/companies/${companyId}`, {
      name: editCompany.name,
      sector: editCompany.sector,
      subSector: editCompany.subSector,
      location: editCompany.location,
      website: editCompany.website === "" ? null : editCompany.website,
      businessDescription: editCompany.businessDescription,
      revenueInrCr: editCompany.revenueInrCr === "" ? null : editCompany.revenueInrCr,
      ebitdaInrCr: editCompany.ebitdaInrCr === "" ? null : editCompany.ebitdaInrCr,
      patInrCr: editCompany.patInrCr === "" ? null : editCompany.patInrCr,
    });

    await apiRequest("PATCH", `/leads/${leadId}`, { notes });

    await apiRequest("PATCH", `/leads/${leadId}/source`, {
      leadSource: leadSource === "not_set" ? null : leadSource,
    });

    await apiRequest("PATCH", `/leads/${leadId}/temperature`, {
      leadTemperature: leadTemperature === "not_set" ? null : leadTemperature,
    });

    await apiRequest("PATCH", `/leads/${leadId}/chatgpt-link`, {
      chatgptLink: chatgptLink.trim() ? chatgptLink.trim() : null,
    });
  },
  onSuccess: async () => {
    toast({ title: "Lead details updated" });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    await queryClient.invalidateQueries({ queryKey: ["leads", leadId] });
    await queryClient.invalidateQueries({ queryKey: ["companies", companyId] });
  },
  onError: (err: any) => {
    toast({
      variant: "destructive",
      title: "Failed to save lead details",
      description: err?.message || "Something went wrong",
    });
  },
});

  // -------------------------------
  // Tracxn Populate
  // -------------------------------
  async function handlePopulateFromTracxn() {
    if (!tracxnFile) {
      toast({ variant: "destructive", title: "Please upload a Tracxn PDF first" });
      return;
    }

    try {
      setIsParsingTracxn(true);
      const formData = new FormData();
      formData.append("file", tracxnFile);

      const res = await apiFetch("/api/tracxn/parse-onepager", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const x = data?.extracted || {};

      const derivedSubSector =
        x.subSector ??
        (typeof x.sectorPath === "string" && x.sectorPath.includes(">")
          ? x.sectorPath.split(">").slice(1).join(" > ").trim()
          : "");

      setEditCompany((prev: any) => ({
        ...prev,
        name: x.companyName ?? prev.name,
        sector: x.sector ?? prev.sector,
        subSector: derivedSubSector || prev.subSector,
        location: x.location ?? prev.location,
        website: x.website ?? prev.website,
        businessDescription: x.businessDescription ?? prev.businessDescription,
        revenueInrCr: x.revenueInrCr ?? prev.revenueInrCr,
        ebitdaInrCr: x.ebitdaInrCr ?? prev.ebitdaInrCr,
        patInrCr: x.patInrCr ?? prev.patInrCr,
      }));

      toast({ title: "Populated from Tracxn", description: "Review fields and click Save." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Populate failed", description: err?.message });
    } finally {
      setIsParsingTracxn(false);
    }
  }

  if (isLoadingLead || isLoadingCompany) {
    return <div className="p-6">Loading...</div>;
  }

  if (!lead || !company) {
    return <div className="p-6">Lead not found</div>;
  }

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="sticky top-4 z-20 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 shadow-lg shadow-slate-200/50">
       <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-violet-500 to-emerald-500" />
       <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="w-fit"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {editCompany.name || company.name}
                </h1>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getTemperatureBadgeClass(
                    leadTemperature
                  )}`}
                >
                  <Flame className="mr-1.5 h-3.5 w-3.5" />
                  {getOptionLabel(LEAD_TEMP_OPTIONS, leadTemperature)}
                </span>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getSourceBadgeClass(
                    leadSource
                  )}`}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {getOptionLabel(LEAD_SOURCE_OPTIONS, leadSource)}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Unified lead details and engagement tracker for this record.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resetLeadEditForm}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>

              <Button
                type="button"
                onClick={() => saveAllMutation.mutate()}
                disabled={saveAllMutation.isPending}
                className="min-w-[160px] bg-slate-900 text-white shadow-sm hover:bg-slate-800"
              >
              <Save className="mr-2 h-4 w-4" />
              {saveAllMutation.isPending ? "Saving..." : "Save All Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        {/* Main record card */}
       <Card className="overflow-hidden border border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/40">
          <CardHeader className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/60 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 p-2.5 text-blue-700 shadow-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Lead Details</h3>
                <p className="text-sm text-muted-foreground">
                  Company information, financial snapshot, links, and solution note in one place.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-6">
            {/* Overview */}
            <section className={panelClass}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h4 className="font-semibold">Overview</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editCompany.name}
                    onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <Label>Sector</Label>
                  <Input
                    value={editCompany.sector}
                    onChange={(e) => setEditCompany({ ...editCompany, sector: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <Label>Sub-sector</Label>
                  <Input
                    value={editCompany.subSector}
                    onChange={(e) => setEditCompany({ ...editCompany, subSector: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={editCompany.location}
                    onChange={(e) => setEditCompany({ ...editCompany, location: e.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>Website</Label>
                    <Input
                      value={editCompany.website}
                      onChange={(e) => setEditCompany({ ...editCompany, website: e.target.value })}
                      className={fieldClass}
                      placeholder="https://company.com"
                    />
                </div>

                <div className="md:col-span-2">
                  <Label>ChatGPT / Drive Link</Label>
                    <Input
                      value={chatgptLink}
                      onChange={(e) => setChatgptLink(e.target.value)}
                      className={fieldClass}
                      placeholder="Paste URL here..."
                    />
                </div>
              </div>
            </section>

            {/* Business description */}
            <section className={panelClass}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h4 className="font-semibold">Business Description</h4>
              </div>

              <textarea
                className={textareaClass}
                value={editCompany.businessDescription}
                onChange={(e) =>
                  setEditCompany({ ...editCompany, businessDescription: e.target.value })
                }
                placeholder="Write a clear summary of the business, positioning, growth angle, and discussion notes..."
              />
            </section>

            {/* Solution Note */}
            <section className={panelClass}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h4 className="font-semibold">Solution Note</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload PDF and add links. Changes here reflect in Lead Card too.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleSolutionPdfUpload}
                    />
                    <span className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadSolutionPdfMutation.isPending ? "Uploading..." : "Upload PDF"}
                    </span>
                  </label>

                  {leadSolutionNote?.pdfName && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSolutionPdfAction("preview")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Preview
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSolutionPdfAction("download")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {leadSolutionNote?.pdfName && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <FileText className="h-4 w-4" />
                  <span className="break-all">{leadSolutionNote.pdfName}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Solution Note Links</Label>
                <Input
                  type="url"
                  value={solutionLinkInput}
                  placeholder="Paste solution note link here..."
                  className={fieldClass}
                  onChange={(e) => setSolutionLinkInput(e.target.value)}
                  onBlur={() => {
                    if (solutionLinkInput.trim()) {
                      handleAddSolutionLink(solutionLinkInput);
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text");
                    if (pasted?.trim()) {
                      e.preventDefault();
                      handleAddSolutionLink(pasted);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Paste a link and click outside the field, or just paste directly.
                </p>
              </div>

              {Array.isArray(leadSolutionNote?.links) && leadSolutionNote.links.length > 0 && (
                <div className="space-y-2">
                  {leadSolutionNote.links.map((link) => (
                    <div
                      key={link}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 text-sm text-blue-600 hover:underline"
                      >
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{link}</span>
                        </div>
                      </a>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveSolutionLink(link)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Financials + Tracxn */}
            <section className="space-y-5 rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h4 className="font-semibold">Financial Snapshot</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <Label>Revenue (INR Cr)</Label>
                    <Input
                      value={editCompany.revenueInrCr}
                      onChange={(e) =>
                        setEditCompany({ ...editCompany, revenueInrCr: e.target.value })
                      }
                      className={fieldClass}
                    />
                </div>

                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <Label>EBITDA (INR Cr)</Label>
                    <Input
                      value={editCompany.ebitdaInrCr}
                      onChange={(e) =>
                        setEditCompany({ ...editCompany, ebitdaInrCr: e.target.value })
                      }
                      className={fieldClass}
                    />
                </div>

                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <Label>PAT (INR Cr)</Label>
                    <Input
                      value={editCompany.patInrCr}
                      onChange={(e) => setEditCompany({ ...editCompany, patInrCr: e.target.value })}
                      className={fieldClass}
                    />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Tracxn One-pager</h4>
                </div>

                <div className="space-y-3">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setTracxnFile(e.target.files?.[0] ?? null)}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePopulateFromTracxn}
                    disabled={isParsingTracxn}
                  >
                    {isParsingTracxn ? "Populating..." : "Populate From Tracxn"}
                  </Button>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>

        {/* Tracker card */}
        <Card className="h-fit overflow-hidden border border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/40 xl:sticky xl:top-28">
          <CardHeader className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-violet-50/60 px-5 py-5">
            <div>
              <h3 className="text-lg font-semibold">Lead Tracker</h3>
              <p className="text-sm text-muted-foreground">
                Quick controls, remarks, actionables, and upcoming tasks.
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            {/* Quick controls */}
            <div className="space-y-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h4 className="font-semibold">Quick Controls</h4>
              </div>

              <div>
                <Label>Lead Temperature</Label>
                <Select value={leadTemperature} onValueChange={setLeadTemperature}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue placeholder="Select temperature" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_TEMP_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Lead Source</Label>
                <Select value={leadSource} onValueChange={setLeadSource}>
                  <SelectTrigger className={selectClass}>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-2 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTrackerTab("remarks")}
                className={getTrackerTabClass("remarks")}
              >
                <div className="flex items-center gap-2 font-medium">
                  <MessageSquareText className="h-4 w-4" />
                  Remarks
                </div>
                <p className="mt-1 text-xs">{remarks.length}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTrackerTab("actionables")}
                className={getTrackerTabClass("actionables")}
              >
                <div className="flex items-center gap-2 font-medium">
                  <CheckSquare className="h-4 w-4" />
                  Actionables
                </div>
                <p className="mt-1 text-xs">{actionables.length}</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTrackerTab("tasks")}
                className={getTrackerTabClass("tasks")}
              >
                <div className="flex items-center gap-2 font-medium">
                  <CalendarClock className="h-4 w-4" />
                  Tasks
                </div>
                <p className="mt-1 text-xs">{upcomingTasksForLead.length}</p>
              </button>
            </div>
            {/* Remarks tab */}
            {activeTrackerTab === "remarks" && (
              <div className="space-y-4">
                <div>
                  <Label>Add Remark / Note</Label>
                  <textarea
                    value={newRemark}
                    onChange={(e) => setNewRemark(e.target.value)}
                    className={compactTextareaClass}
                    placeholder="Write a remark and press Save..."
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addRemarkMutation.mutate()}
                  disabled={addRemarkMutation.isPending}
                >
                  Save Remark
                </Button>

                <div className="space-y-3 border-t pt-4">
                  {isLoadingRemarks ? (
                    <p className="text-sm text-muted-foreground">Loading remarks...</p>
                  ) : remarks.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">No remarks yet.</p>
                  ) : (
                    remarks.map((r: any) => (
                      <div key={r.id} className="rounded-xl border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <LinkifyText text={r.remark} className="text-sm whitespace-pre-wrap" />
                            <p className="mt-2 text-xs text-muted-foreground">
                              {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteRemarkMutation.mutate(Number(r.id))}
                            disabled={deleteRemarkMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Actionables tab */}
            {activeTrackerTab === "actionables" && (
              <div className="space-y-4">
                <div>
                  <Label>Add Actionable</Label>
                  <textarea
                    value={newActionable}
                    onChange={(e) => setNewActionable(e.target.value)}
                    className={compactTextareaClass}
                    placeholder="Write an actionable and press Save..."
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addActionableMutation.mutate()}
                  disabled={addActionableMutation.isPending}
                >
                  Save Actionable
                </Button>

                <div className="space-y-3 border-t pt-4">
                  {isLoadingActionables ? (
                    <p className="text-sm text-muted-foreground">Loading actionables...</p>
                  ) : actionables.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">No actionables yet.</p>
                  ) : (
                    actionables.map((a: any) => (
                      <div key={a.id} className="rounded-xl border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <LinkifyText text={a.text} className="text-sm whitespace-pre-wrap" />
                            <p className="mt-2 text-xs text-muted-foreground">
                              {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteActionableMutation.mutate(Number(a.id))}
                            disabled={deleteActionableMutation.isPending}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tasks tab */}
            {activeTrackerTab === "tasks" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    Scheduled follow-ups and next-step tasks linked to this lead.
                  </p>
                </div>

                {isLoadingLeadDetails ? (
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                ) : upcomingTasksForLead.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">
                    No upcoming tasks for this lead.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingTasksForLead.map((t: any) => (
                      <div
                        key={t.id ?? `${t.type}-${t.scheduledAt}`}
                        className="rounded-xl border bg-background p-3"
                      >
                        <p className="text-sm font-medium capitalize">
                          {String(t.type ?? "task").replaceAll("_", " ")}
                        </p>

                        {t.notes && (
                          <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                            {t.notes}
                          </p>
                        )}

                        {t.scheduledAt && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {new Date(t.scheduledAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* POC block stays separate for now */}
      <Card className="border border-slate-200/80 bg-white/90 shadow-lg shadow-slate-200/40">
        <CardHeader className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-emerald-50/60">
          <h3 className="font-semibold">POC Details (POC1 / POC2 / POC3)</h3>
        </CardHeader>
        <CardContent className="p-6">
          <POCManagement
            companyId={company.id}
            companyName={company.name}
            startInEditMode={true}
            onClose={() => setLocation("/universe")}
            onSave={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}
          />
        </CardContent>
      </Card>
    </div>
  </div>
);
}
