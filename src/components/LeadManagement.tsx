import { useState, useMemo,  useEffect, useRef   } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Download,
  CheckSquare,
  XSquare,
  Upload,
  FileText,
  ArrowUpDown,
  X
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import LeadCard from "./LeadCard";

import AssignmentModal from "./AssignmentModal";
import { InterventionTracker } from "./InterventionTracker";
import { IndividualLeadForm } from "./IndividualLeadForm";
import EngagementGateDialog from "./EngagementGateDialog";
import { DocumentGateDialog } from "./DocumentGateDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Lead, Company, Contact, User as UserType} from "@/lib/types";

import { useLeadFilters } from "@/context/LeadFiltersContext";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// ✅ Master Sector List (always show these in filter dropdown)
const SECTOR_OPTIONS: string[] = [
  "Auto Components",
  "Building Materials",
  "Chemicals & Materials",
  "Consumer",
  "Defence",
  "Financial Services",
  "Healthcare",
  "Healthcare & Pharma",
  "HR",
  "Industrials",
  "IPP",
  "IT",
  "Logistics",
  "Others",
  "Pharma",
  "Renewables",
  "Specialty Chemicals",
  "Travel and Hospitality",
];


interface LeadWithDetails extends Lead {
  company: Company;
  contact?: Contact;
  // CHANGED: Removed '| null' and used optional '?' to match User type
  assignedToUser?: { id: string; firstName?: string; lastName?: string; email?: string; };
  ownerAnalystUser?: { id: string; firstName?: string; lastName?: string; email?: string; };
  createdByUser?: { id: string; firstName?: string; lastName?: string; email?: string; };
  // CHANGED: Removed '| null' to match Lead type
  assignedInterns?: string[]; 
}


interface LeadManagementProps {
  stage:
    | 'universe'
    | 'qualified'
    | 'outreach'
    | 'pitching'
    | 'mandates'
    | 'completed_mandate'
    | 'hold'
    | 'dropped'
    | 'rejected'
    | 'won'
    | 'lost';
  currentUser: UserType;
}


export default function LeadManagement({ stage, currentUser }: LeadManagementProps) {
  console.log('LeadManagement rendered for stage:', stage);
  console.log('currentUser:', currentUser);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

const { filters, setFilters, clearFilters } = useLeadFilters();

// ✅ Always keep sidebar + tabs in sync after any stage move
const invalidateAllLeadUI = () => {
  // This catches sidebar count queries like ["leads","counts"] / ["leads","sidebar-metrics"] etc.
  queryClient.invalidateQueries({ queryKey: ["leads"] });

  // Refresh every stage list (including universe ["leads","stage","all"])
  queryClient.invalidateQueries({
    predicate: (q) =>
      Array.isArray(q.queryKey) &&
      q.queryKey[0] === "leads" &&
      q.queryKey[1] === "stage",
  });

  // If you show metrics anywhere
  queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });

  // If sidebar uses this anywhere (harmless if not)
  queryClient.invalidateQueries({ queryKey: ["/users/analytics"] });
};


const [sortBy, setSortBy] = useState<string>(() => {
  return sessionStorage.getItem("leadMgmt:sortBy") || "company-asc";
});

useEffect(() => {
  sessionStorage.setItem("leadMgmt:sortBy", sortBy);
}, [sortBy]);
const [filterStatus, setFilterStatus] = useState<string>("all"); // keep if you still use it



// Read values from global filters
// Read values from global filters (✅ multi-select arrays; empty = "All")
const searchTerm = filters.searchTerm;

const filterSector: string[] = (filters.filterSector ?? []) as string[];
const filterSubSector: string[] = (filters.filterSubSector ?? []) as string[];
const filterAssignedTo: string[] = (filters.filterAssignedTo ?? []) as string[];
const filterStage: string[] = (filters.filterStage ?? []) as string[];
const filterLocation: string[] = (filters.filterLocation ?? []) as string[];
const filterPoc: string[] = (filters.filterPoc ?? []) as string[];

// these are in your context but you typed filters as any earlier,
// so force them to string[] here:
const filterLeadSource: string[] = ((filters as any).filterLeadSource ?? []) as string[];
const filterLeadTemperature: string[] = ((filters as any).filterLeadTemperature ?? []) as string[];
const filterPartner: string[] = ((filters as any).filterPartner ?? []) as string[];
const filterEpnLinkage: string[] = ((filters as any).filterEpnLinkage ?? []) as string[];
const filterEpnBucket: string[] = ((filters as any).filterEpnBucket ?? []) as string[];
const filterEpnCategory: string[] = ((filters as any).filterEpnCategory ?? []) as string[];
const filterEpnStage: string[] = ((filters as any).filterEpnStage ?? []) as string[];
const filterEpnPartnerIds: string[] = ((filters as any).filterEpnPartnerIds ?? []) as string[];


// ✅ small helpers
const isAll = (arr: string[] | undefined | null) => !arr || arr.length === 0;

const toggleInArray = (arr: string[], value: string) => {
  if (arr.includes(value)) return arr.filter((x) => x !== value);
  return [...arr, value];
};

// Setters that update global filters
const setSearchTerm = (v: string) => setFilters((f) => ({ ...f, searchTerm: v }));

const toggleFilterSector = (v: string) =>
  setFilters((f) => ({ ...f, filterSector: toggleInArray(f.filterSector || [], v) }));

const toggleFilterSubSector = (v: string) =>
  setFilters((f) => ({ ...f, filterSubSector: toggleInArray(f.filterSubSector || [], v) }));

const toggleFilterAssignedTo = (v: string) =>
  setFilters((f) => ({ ...f, filterAssignedTo: toggleInArray(f.filterAssignedTo || [], v) }));

const toggleFilterPartner = (v: string) =>
  setFilters((f: any) => ({ ...f, filterPartner: toggleInArray(f.filterPartner || [], v) }));

const toggleFilterLocation = (v: string) =>
  setFilters((f) => ({ ...f, filterLocation: toggleInArray(f.filterLocation || [], v) }));

const toggleFilterStage = (v: string) =>
  setFilters((f) => ({ ...f, filterStage: toggleInArray(f.filterStage || [], v) }));

const toggleFilterPoc = (v: string) =>
  setFilters((f) => ({ ...f, filterPoc: toggleInArray(f.filterPoc || [], v) }));

const toggleFilterLeadSource = (v: string) =>
  setFilters((f: any) => ({ ...f, filterLeadSource: toggleInArray(f.filterLeadSource || [], v) }));

const toggleFilterLeadTemperature = (v: string) =>
  setFilters((f: any) => ({ ...f, filterLeadTemperature: toggleInArray(f.filterLeadTemperature || [], v) }));

const toggleFilterEpnLinkage = (v: string) =>
  setFilters((f: any) => ({ ...f, filterEpnLinkage: toggleInArray(f.filterEpnLinkage || [], v) }));

const toggleFilterEpnBucket = (v: string) =>
  setFilters((f: any) => ({ ...f, filterEpnBucket: toggleInArray(f.filterEpnBucket || [], v) }));

const toggleFilterEpnCategory = (v: string) =>
  setFilters((f: any) => ({ ...f, filterEpnCategory: toggleInArray(f.filterEpnCategory || [], v) }));

const toggleFilterEpnStage = (v: string) =>
  setFilters((f: any) => ({ ...f, filterEpnStage: toggleInArray(f.filterEpnStage || [], v) }));

const toggleFilterEpnPartnerId = (v: string) =>
  setFilters((f: any) => ({ ...f, filterEpnPartnerIds: toggleInArray(f.filterEpnPartnerIds || [], v) }));

// ✅ optional: clear just one filter (used by "All" buttons below)
const clearOne = (key: keyof any) => setFilters((f: any) => ({ ...f, [key]: [] }));


const showPartnerFilter = ["admin", "analyst"].includes(currentUser.role);








  // ✅ Helper: supports both API styles (subSector or sub_sector)
  const getCompanySubSector = (company: any) =>
    (company?.subSector ?? company?.sub_sector ?? "").trim();
  const getPocCount = (lead: any): number => {
  // ✅ best case: backend provides a count
  if (typeof lead?.pocCount === "number") return lead.pocCount;
  if (typeof lead?.poc_count === "number") return lead.poc_count;
  if (typeof lead?.completedPocCount === "number") return lead.completedPocCount;

  // ✅ if API returns contacts array on lead or inside company
  const contacts = lead?.contacts ?? lead?.company?.contacts;
  if (Array.isArray(contacts)) {
    return contacts.filter((c: any) =>
      c && (c.isComplete ?? (c.name || c.email || c.phone || c.linkedinProfile))
    ).length;
  }

  // ✅ fallback: if only primary contact is attached
  if (lead?.contact) {
    // if you trust isComplete, keep this. Otherwise just `return 1`
    return lead.contact.isComplete === false ? 0 : 1;
  }

  return 0;
};

  // ✅ Reset sub-sector when sector changes (avoids mismatch)
  // ✅ Reset sub-sector ONLY when sector actually changes (not on first mount/restore)
  const prevSectorRef = useRef<string | null>(null); // stores JSON string of selected sectors


  useEffect(() => {
    // first run (mount / restored filters) → don't reset
    if (prevSectorRef.current === null) {
      prevSectorRef.current = JSON.stringify(filterSector);
      return;
    }


    // if sector changed by user → reset subsector
if (prevSectorRef.current !== JSON.stringify(filterSector)) {
  setFilters((f) => ({ ...f, filterSubSector: [] }));
  prevSectorRef.current = JSON.stringify(filterSector);
}

  }, [filterSector]);


  // 👇 ADD BACK POC state
  // const [showPOCManagement, setShowPOCManagement] = useState<{leadId: number; companyId: number; companyName: string} | null>(null);
  
      // Persistent POC Management
  const [showPOCManagement, setShowPOCManagement] = useState<{leadId: number; companyId: number; companyName: string} | null>(() => {
    const saved = sessionStorage.getItem('pocManagementData');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (showPOCManagement) {
      sessionStorage.setItem('pocManagementData', JSON.stringify(showPOCManagement));
    } else {
      sessionStorage.removeItem('pocManagementData');
    }
  }, [showPOCManagement]);


  // Newly added Lead Details Modal state now persistent across tab switches
    const [showLeadDetails, setShowLeadDetails] = useState<{
    lead: LeadWithDetails;
    company: Company;
  } | null>(() => {
    const saved = sessionStorage.getItem("leadDetailsModalData");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (showLeadDetails) {
      sessionStorage.setItem(
        "leadDetailsModalData",
        JSON.stringify(showLeadDetails)
      );
    } else {
      sessionStorage.removeItem("leadDetailsModalData");
    }
  }, [showLeadDetails]);


  // const [showInterventionTracker, setShowInterventionTracker] = useState<{leadId: number; companyName: string} | null>(null);

    // Persistent Intervention Tracker
  const [showInterventionTracker, setShowInterventionTracker] = useState<{leadId: number; companyName: string} | null>(() => {
    const saved = sessionStorage.getItem('interventionTrackerData');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (showInterventionTracker) {
      sessionStorage.setItem('interventionTrackerData', JSON.stringify(showInterventionTracker));
    } else {
      sessionStorage.removeItem('interventionTrackerData');
    }
  }, [showInterventionTracker]);

  // const [showEngagementGate, setShowEngagementGate] = useState<{leadId: number; companyId: number; companyName: string} | null>(null);

    // Persistent Engagement Gate
  const [showEngagementGate, setShowEngagementGate] = useState<{leadId: number; companyId: number; companyName: string} | null>(() => {
    const saved = sessionStorage.getItem('engagementGateData');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (showEngagementGate) {
      sessionStorage.setItem('engagementGateData', JSON.stringify(showEngagementGate));
    } else {
      sessionStorage.removeItem('engagementGateData');
    }
  }, [showEngagementGate]);

  // const [showMandateConfirmation, setShowMandateConfirmation] = useState<{leadId: number; companyName: string} | null>(null);

   // Persistent Mandate Confirmation
  const [showMandateConfirmation, setShowMandateConfirmation] = useState<{leadId: number; companyName: string} | null>(() => {
    const saved = sessionStorage.getItem('mandateConfirmationData');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (showMandateConfirmation) {
      sessionStorage.setItem('mandateConfirmationData', JSON.stringify(showMandateConfirmation));
    } else {
      sessionStorage.removeItem('mandateConfirmationData');
    }
  }, [showMandateConfirmation]);

    // Persistent Completed Mandate Confirmation
  const [showCompletedMandateConfirmation, setShowCompletedMandateConfirmation] = useState<{
    leadId: number;
    companyName: string;
    note: string;
  } | null>(() => {
    const saved = sessionStorage.getItem('completedMandateConfirmationData');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (showCompletedMandateConfirmation) {
      sessionStorage.setItem(
        'completedMandateConfirmationData',
        JSON.stringify(showCompletedMandateConfirmation)
      );
    } else {
      sessionStorage.removeItem('completedMandateConfirmationData');
    }
  }, [showCompletedMandateConfirmation]);



  // const [showAssignmentModal, setShowAssignmentModal] = useState<{leadId: number; company: Company;currentAssignedInterns?: string[];} | null>(null);

      // Persistent Assignment Modal
  const [showAssignmentModal, setShowAssignmentModal] = useState<{leadId: number; company: Company; currentAssignedInterns?: string[];} | null>(() => {
    const saved = sessionStorage.getItem('assignmentModalData');
    return saved ? JSON.parse(saved) : null;
  });
  useEffect(() => {
    if (showAssignmentModal) {
      sessionStorage.setItem('assignmentModalData', JSON.stringify(showAssignmentModal));
    } else {
      sessionStorage.removeItem('assignmentModalData');
    }
  }, [showAssignmentModal]);

  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  // const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
 
     // Persistent Bulk Assign Modal
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(() => {
    return sessionStorage.getItem('isBulkAssignOpen') === 'true';
  });
  useEffect(() => {
    sessionStorage.setItem('isBulkAssignOpen', showBulkAssignModal.toString());
  }, [showBulkAssignModal]);

  const [bulkAssignToUser, setBulkAssignToUser] = useState<string>("");
  // const [showCsvUploadModal, setShowCsvUploadModal] = useState(false);
  
   // Persistent CSV Upload Modal
  const [showCsvUploadModal, setShowCsvUploadModal] = useState(() => {
    return sessionStorage.getItem('isCsvUploadOpen') === 'true';
  });
  useEffect(() => {
    sessionStorage.setItem('isCsvUploadOpen', showCsvUploadModal.toString());
  }, [showCsvUploadModal]);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploadResults, setCsvUploadResults] = useState<any>(null);
  // const [showIndividualLeadForm, setShowIndividualLeadForm] = useState(false);
     // Initialize state from SessionStorage to survive tab switches/re-renders
  const [showIndividualLeadForm, setShowIndividualLeadForm] = useState(() => {
    return sessionStorage.getItem('isAddLeadOpen') === 'true';
  });

  // Keep SessionStorage in sync
  useEffect(() => {
    sessionStorage.setItem('isAddLeadOpen', showIndividualLeadForm.toString());
  }, [showIndividualLeadForm]);

  
  // Fetch leads for this stage
  // Universe tab shows all leads across all stages
  // const { data: leads = [], isLoading, error } = useQuery({
  //   queryKey: stage === 'universe' ? ['/api/leads/all'] : [`/api/leads/stage/${stage}`],
  // });

// Redirect old leadId query-param deep links to the new outreach management page
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const leadId = params.get("leadId");

  if (leadId) {
    console.log("Redirecting leadId to new outreach page:", leadId);
    setLocation(`/outreach-status/${leadId}`);
  }
}, [setLocation]);


   // ✅ Fetch leads for this stage (typed & structured query key)
const UNIVERSE_STAGES = [
  "universe",
  "qualified",
  "outreach",
  "pitching",
  "mandates",
  "hold",
  "dropped",
  "rejected",
  "won",
  "lost",
] as const;

const { data: leads = [], isLoading, error } = useQuery<LeadWithDetails[]>({
  queryKey:
    stage === "universe"
      ? ["leads", "stage", "universe_all_pipeline"]
      : ["leads", "stage", stage],
  refetchOnWindowFocus: true,
  staleTime: 0,
  retry: 1,
  queryFn: async () => {
    // ✅ Universe = combined list (your current intent)
    if (stage === "universe") {
      const results = await Promise.all(
        UNIVERSE_STAGES.map(async (st) => {
          const res = await apiRequest("GET", `/leads/stage/${st}`);
          return res.json();
        })
      );

      const flat = results.flat() as LeadWithDetails[];

      // dedupe by lead.id
      const uniq = new Map<number, LeadWithDetails>();
      for (const l of flat) uniq.set(l.id, l);
      return Array.from(uniq.values());
    }

    // ✅ Other stages unchanged
    const res = await apiRequest("GET", `/leads/stage/${stage}`);
    return res.json();
  },
});

// ✅ Fetch EPN Universe (for filter dropdown options)
const { data: epnUniverse = [] } = useQuery<any[]>({
  queryKey: ["epn", "universe"],
  enabled: ["admin", "partner"].includes(currentUser.role),
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const res = await apiRequest("GET", "/epn/universe");
    return res.json();
  },
});

// ✅ Fetch EPN links for this lead stage (one-shot)
const epnLinksEnabled =
  ["admin", "partner"].includes(currentUser.role) &&
  ["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage);

const epnLinkStagesForUniverse = [
  "universe",
  "qualified",
  "outreach",
  "pitching",
  "mandates",
  "hold",
  "dropped",
  "rejected",
  "won",
  "lost",
];

const { data: epnLinks = [] } = useQuery<Array<{ leadId: number; epns: any[] }>>({
  queryKey: stage === "universe" ? ["epn", "links", "universe-all"] : ["epn", "links", stage],
  enabled: epnLinksEnabled,
  refetchOnWindowFocus: true,
  staleTime: 0,
  queryFn: async () => {
    // ✅ Universe shows ALL leads, so we need ALL links across stages
    if (stage === "universe") {
      const results = await Promise.all(
        epnLinkStagesForUniverse.map(async (st) => {
          const res = await apiRequest("GET", `/epn/links?stage=${st}`);
          return res.json();
        })
      );
      return results.flat();
    }

    // ✅ Non-universe stages: just fetch links for that stage
    const res = await apiRequest("GET", `/epn/links?stage=${stage}`);
    return res.json();
  },
});

// ✅ leadId -> linked epns map
const epnByLeadId = useMemo(() => {
  const m = new Map<number, any[]>();
  for (const row of epnLinks || []) {
    m.set(row.leadId, row.epns || []);
  }
  return m;
}, [epnLinks]);


  // ✅ Fetch all org users (needed to display Partner name on lead cards)
const { data: orgUsers = [] } = useQuery<UserType[]>({
  queryKey: ["/users", "org"],
  enabled: ["admin", "partner", "analyst"].includes(currentUser.role),
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const res = await apiRequest("GET", "/users");
    return res.json();
  },
});

const partnerOptions = useMemo(() => {
  const partners = orgUsers
    .filter((u) => u.role === "partner")
    .map((u) => ({
      id: u.id,
      name:
        u.firstName && u.lastName
          ? `${u.firstName} ${u.lastName}`
          : u.email || u.id,
    }));

  const uniq = new Map<string, { id: string; name: string }>();
  for (const p of partners) uniq.set(p.id, p);

  return Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));
}, [orgUsers]);


// ✅ helper: read partner id from lead (supports multiple possible field names)
const getPartnerId = (lead: any): string | null => {
  return (
    lead?.assignedPartnerId ??
    lead?.partnerId ??        // fallback
    lead?.managerId ??        // fallback if schema uses managerId
    null
  );
};

// ✅ helper: map partner user from orgUsers
const getPartnerUser = (lead: any) => {
  const pid = getPartnerId(lead);
  if (!pid) return undefined;
  return orgUsers.find((u) => u.id === pid);
};



  // Fetch all users for bulk assignment (partners/admins only)
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['/users'],
    enabled: currentUser.role === 'admin',
    refetchOnWindowFocus: false,
    // enabled: showBulkAssignModal && ['partner', 'admin'].includes(currentUser.role),

  });

  // Bulk assign leads mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ leadIds, assignedTo }: { leadIds: number[]; assignedTo: string }) => {
      return apiRequest('POST', '/leads/bulk-assign', { leadIds, assignedTo });
    },
    onSuccess: (data: any) => {
      // Invalidate the correct query key based on stage
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ['/users/analytics'] });
      toast({
        title: "Bulk Assignment Complete",
        description: data.message || 'Companies assigned successfully',
      });
      setShowBulkAssignModal(false);
      setSelectedLeads([]);
      setBulkAssignToUser("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign companies",
        variant: "destructive",
      });
    },
  });
  const updateLeadStatusMutation = useMutation({
  mutationFn: async ({ leadId, notes }: { leadId: number; notes: string | null }) => {
    const res = await apiRequest("PATCH", `/leads/${leadId}`, { notes });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  onSuccess: async () => {
    // this matches your query keys because they start with ["leads", ...]
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  },
});
const handleSaveStatus = async (leadId: number, status: string | null) => {
  try {
    await updateLeadStatusMutation.mutateAsync({ leadId, notes: status });
    toast({ title: "Status saved" });
  } catch (err: any) {
    toast({
      variant: "destructive",
      title: "Failed to save status",
      description: err?.message || "Unknown error",
    });
    throw err;
  }
};

const updateLeadSourceMutation = useMutation({
  mutationFn: async ({ leadId, leadSource }: { leadId: number; leadSource: string | null }) => {
    const res = await apiRequest("PATCH", `/leads/${leadId}/source`, { leadSource });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  },
});

const handleSaveLeadSource = async (leadId: number, leadSource: string | null) => {
  try {
    await updateLeadSourceMutation.mutateAsync({ leadId, leadSource });
    toast({ title: "Lead source saved" });
  } catch (err: any) {
    toast({
      variant: "destructive",
      title: "Failed to save lead source",
      description: err?.message || "Unknown error",
    });
    throw err;
  }
};


const updateLeadTemperatureMutation = useMutation({
  mutationFn: async ({ leadId, leadTemperature }: { leadId: number; leadTemperature: string | null }) => {
    const res = await apiRequest("PATCH", `/leads/${leadId}/temperature`, { leadTemperature });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
  },
});

const handleSaveLeadTemperature = async (leadId: number, leadTemperature: string | null) => {
  try {
    await updateLeadTemperatureMutation.mutateAsync({ leadId, leadTemperature });
    toast({ title: "Lead temperature saved" });
  } catch (err: any) {
    toast({
      variant: "destructive",
      title: "Failed to save lead temperature",
      description: err?.message || "Unknown error",
    });
    throw err;
  }
};





  // CSV upload mutation
const csvUploadMutation = useMutation({
  mutationFn: async (csvData: string) => {
    const res = await apiRequest("POST", "/companies/csv-upload", { csvData });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.message || "CSV upload failed");
    }

    return json;
  },

  onSuccess: async (data: any) => {
    try {
      const results = data?.results || {};
      setCsvUploadResults(results);

      toast({
        title: "Companies Uploaded",
        description: `${results.successfulCompanies ?? 0} companies created successfully.`,
      });

      // ✅ refresh all lead lists
      queryClient.invalidateQueries({ queryKey: ["leads"] });

      // ✅ refresh counters if you show them
      queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/users/analytics"] });

      setCsvFile(null);
    } catch (err: any) {
      console.error("Error after CSV upload:", err);
      toast({
        title: "Error",
        description: err?.message || "Upload succeeded but UI refresh failed",
        variant: "destructive",
      });
    }
  },

  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to process CSV file",
      variant: "destructive",
    });
  },
});

 
    // Fetch interns for displaying assigned intern names in LeadCard
  const { data: allInterns = [] } = useQuery<UserType[]>({
    queryKey: ['/users/interns'],
    queryFn: async () => {
      if (currentUser.role === 'analyst') {
        // Fetch analyst's assigned interns
        const response = await apiRequest('GET', `/analysts/${currentUser.id}/interns`);
        const data = await response.json();
        console.log('analyst', data);
        return data;
      } else if (['partner', 'admin'].includes(currentUser.role)) {
        // Fetch all interns in the organization
        const response = await apiRequest('GET', '/users');
        const allUsers = await response.json();
        console.log('partner/admin', allUsers);
        return allUsers.filter((u: UserType) => u.role === 'intern');
      }
      return [];
    },
    enabled: ['analyst', 'partner', 'admin'].includes(currentUser.role),
    refetchOnWindowFocus: false,

  });

  
    // // ✅ Corrected intern fetch logic
    // const { data: allInterns = [] } = useQuery<User[]>({
    //   queryKey: ['/api/users/interns'],
    //   enabled: ['analyst', 'partner', 'admin'].includes(currentUser.role),
    //   queryFn: async () => {
    //     if (currentUser.role === 'analyst') {
    //       // Analyst: fetch assigned interns
    //       const data = await apiRequest('GET', `/api/analysts/${currentUser.id}/interns`);
    //       console.log('analyst interns:', data);
    //       return data;
    //     }

    //     if (['partner', 'admin'].includes(currentUser.role)) {
    //       // Partner/Admin: fetch all interns in the organization
    //       const allUsers = await apiRequest('GET', '/api/users');
    //       console.log('partner/admin users:', allUsers);
    //       return allUsers.filter((u: User) => u.role === 'intern');
    //     }

    //     return [];
    //   },
    // });



  // Download CSV sample
  const handleDownloadSample = async () => {
    try {
      const response = await apiRequest('GET', '/companies/csv-sample');
      if (!response.ok) throw new Error('Failed to download sample');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'company_upload_sample.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Sample Downloaded",
        description: "CSV sample file has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download sample file",
        variant: "destructive",
      });
    }
  };


  // Download Active Leads CSV (Qualified + Outreach + Pitching + Mandates)
const handleDownloadActiveLeadsCsv = async () => {
  try {
    const response = await apiRequest("GET", "/leads/export/active-csv");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const date = new Date().toISOString().slice(0, 10);
    a.download = `active_leads_${date}.csv`;

    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: "Active leads CSV has been downloaded",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to download active leads CSV",
      variant: "destructive",
    });
  }
};


  // Handle CSV file upload
  const handleCsvUpload = () => {
    if (!csvFile) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      csvUploadMutation.mutate(csvData);
    };
    reader.readAsText(csvFile);
  };

  // Get unique sectors and assignees for filter options
  const sectorOptions = useMemo(() => {
    // Always show all master sectors + any extra sectors already in DB
    const used = leads
      .map((l) => (l.company.sector || "").trim())
      .filter(Boolean);

    return Array.from(new Set([...SECTOR_OPTIONS, ...used])).sort();
  }, [leads]);
  
  // ✅ Sub-sector dropdown options (depends on selected sector)
const uniqueSubSectors = useMemo(() => {
  const norm = (s: string) => s.trim().toLowerCase();

  const base = isAll(filterSector)
    ? leads
    : leads.filter((lead) => filterSector.map(norm).includes(norm(lead.company.sector || "")));

  const subSectors = base
    .map((lead) => getCompanySubSector(lead.company))
    .filter((ss) => Boolean(ss));

  return Array.from(new Set(subSectors)).sort((a, b) => a.localeCompare(b));
}, [leads, filterSector, getCompanySubSector]);


  const uniqueLocations = useMemo(() => {
    const locations = leads
      .map(lead => lead.company.location)
      .filter((location): location is string => Boolean(location));
    return Array.from(new Set(locations)).sort();
  }, [leads]);
  const uniqueAssignees = useMemo(() => {
    const assignees = leads
      .map(lead => lead.assignedToUser ? {
        id: lead.assignedToUser.id,
        name: `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.trim() || lead.assignedToUser.email || ''
      } : null)
      .filter(Boolean) as { id: string; name: string }[];
    
    const uniqueMap = new Map(assignees.map(a => [a.id, a]));
    return Array.from(uniqueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);


  const epnBucketOptions = useMemo(() => {
  return [
    { value: "idfc", label: "IDFC" },
    { value: "other_channel_partner", label: "Other Channel Partners" },
    { value: "other_epn", label: "Other EPN" },
  ];
}, []);

const epnStageOptions = useMemo(() => {
  return [
    { value: "outreach", label: "Outreach" },
    { value: "active", label: "Active" },
    { value: "rainmaking", label: "Rainmaking" },
  ];
}, []);

const epnCategoryOptions = useMemo(() => {
  const cats = (epnUniverse || [])
    .map((p: any) => (p.category || "").trim())
    .filter(Boolean);
  return Array.from(new Set(cats)).sort((a, b) => a.localeCompare(b));
}, [epnUniverse]);

const epnPartnerOptions = useMemo(() => {
  const items = (epnUniverse || [])
    .map((p: any) => ({ id: String(p.id), name: p.name }))
    .filter((p: any) => p.id && p.name);

  // unique by id
  const uniq = new Map<string, { id: string; name: string }>();
  for (const it of items) uniq.set(it.id, it);
  return Array.from(uniq.values()).sort((a, b) => a.name.localeCompare(b.name));
}, [epnUniverse]);



  // Apply filters and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    // Apply search filter
    if (searchTerm) {
      result = result.filter(lead => {
        const companyMatch = lead.company.name.toLowerCase().includes(searchTerm.toLowerCase());
        const assigneeMatch = lead.assignedToUser ? 
          `${lead.assignedToUser.firstName || ''} ${lead.assignedToUser.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) :
          false;
        return companyMatch || assigneeMatch;
      });
    }

    // Apply sector filter
  const norm = (s: string) => s.trim().toLowerCase();

if (!isAll(filterSector)) {
  const selected = filterSector.map(norm);
  result = result.filter((lead) => selected.includes(norm(lead.company.sector || "")));
}

// ✅ Apply sub-sector filter
// ✅ Apply sub-sector filter (normalized match)
if (!isAll(filterSubSector)) {
  const normSS = (s: string) => s.trim().toLowerCase();
  const selectedSS = filterSubSector.map(normSS);

  result = result.filter((lead) =>
    selectedSS.includes(normSS(getCompanySubSector(lead.company)))
  );
}




    // Apply assigned to filter
if (!isAll(filterAssignedTo)) {
  result = result.filter((lead) => {
    const assignee = lead.assignedTo || null;
    const wantsUnassigned = filterAssignedTo.includes("unassigned");
    const wantsIds = filterAssignedTo.filter((x) => x !== "unassigned");

    return (
      (wantsUnassigned && !assignee) ||
      (assignee && wantsIds.includes(assignee))
    );
  });
}


    // ✅ Apply partner filter (ALL stages)
if (showPartnerFilter && !isAll(filterPartner)) {
  result = result.filter((lead: any) => {
    const pid = getPartnerId(lead);
    const wantsUnassigned = filterPartner.includes("unassigned");
    const wantsIds = filterPartner.filter((x) => x !== "unassigned");
    return (wantsUnassigned && !pid) || (pid && wantsIds.includes(pid));
  });
}

// ✅ Apply EPN relation filters (Lead -> linked EPN partners)
// Works only for stages where epnLinksEnabled = true
if (epnLinksEnabled) {
  // 1) Linked / Unlinked
  if (!isAll(filterEpnLinkage)) {
    const wantsLinked = filterEpnLinkage.includes("linked");
    const wantsUnlinked = filterEpnLinkage.includes("unlinked");

    // if both selected, treat as "all" (no filter)
    if (!(wantsLinked && wantsUnlinked)) {
      result = result.filter((lead: any) => {
        const linked = (epnByLeadId.get(lead.id) || []).length > 0;
        return wantsLinked ? linked : !linked;
      });
    }
  }

  // helper: does lead have ANY linked epn matching predicate
  const anyLinkedMatch = (leadId: number, pred: (p: any) => boolean) => {
    const linked = epnByLeadId.get(leadId) || [];
    return linked.some(pred);
  };

  // 2) Bucket
  if (!isAll(filterEpnBucket)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnBucket.includes((p.bucket || "").trim()))
    );
  }

  // 3) Category
  if (!isAll(filterEpnCategory)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnCategory.includes((p.category || "").trim()))
    );
  }

  // 4) Partner Stage
  if (!isAll(filterEpnStage)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnStage.includes((p.stage || "").trim()))
    );
  }

  // 5) Specific Partner IDs
  if (!isAll(filterEpnPartnerIds)) {
    result = result.filter((lead: any) =>
      anyLinkedMatch(lead.id, (p) => filterEpnPartnerIds.includes(String(p.id)))
    );
  }
}

    // Apply stage filter (for universe tab - filter by lead stage)
if (stage === "universe" && !isAll(filterStage)) {
  result = result.filter((lead) => filterStage.includes(lead.stage));
}

// ✅ Apply location filter (Universe + Active stages)
const showLocationFilter = ["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage);

if (showLocationFilter && !isAll(filterLocation)) {
  const selected = filterLocation.map((x) => (x || "").trim());
  result = result.filter((lead) => selected.includes((lead.company.location || "").trim()));
}


    // ✅ Apply leadSource filter
if (!isAll(filterLeadSource)) {
  result = result.filter((lead: any) => {
    const src = (lead.leadSource || "").trim();
    return filterLeadSource.includes(src);
  });
}

    // ✅ Apply leadTemperature filter
// ✅ Apply leadTemperature filter (multi-select)
// supports: hot, warm, not_reached, not_set
const showTemperatureFilter = ["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage);

if (showTemperatureFilter && !isAll(filterLeadTemperature)) {
  result = result.filter((lead: any) => {
    const temp = (lead.leadTemperature ?? lead.lead_temperature ?? null) as string | null;

    return filterLeadTemperature.some((sel) => {
      if (sel === "not_set") return !temp || temp === "not_set";
      if (sel === "not_reached") return temp === "not_reached";
      return temp === sel; // hot/warm
    });
  });
}



    // ✅ Apply POC filter
// ✅ Apply POC filter (multi-select OR across selected rules)
if (!isAll(filterPoc)) {
  const normalize = (v: string) =>
    v === "poc1" ? "has_poc1" :
    v === "poc2" ? "has_poc2" :
    v === "poc3" ? "has_poc3" :
    v;

  const countFor = (v: string) =>
    v.endsWith("poc1") ? 1 :
    v.endsWith("poc2") ? 2 :
    3;

  result = result.filter((lead: any) => {
    const selections = filterPoc.map(normalize);

    // OR across selected POC filters
    return selections.some((sel) => {
      if (sel.startsWith("has_")) {
        const min = countFor(sel);
        return getPocCount(lead) >= min;
      }
      if (sel.startsWith("only_")) {
        const exact = countFor(sel);
        return getPocCount(lead) === exact;
      }
      return false;
    });
  });
}



    // Apply channel partner filter (for universe tab)
    // Apply sorting
    const [sortField, sortOrder] = sortBy.split('-');
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'company':
          comparison = a.company.name.localeCompare(b.company.name);
          break;
        case 'sector':
          comparison = (a.company.sector || '').localeCompare(b.company.sector || '');
          break;
        case 'assignedTo':
          const aName = a.assignedToUser ? 
            `${a.assignedToUser.firstName || ''} ${a.assignedToUser.lastName || ''}`.trim() : 'Unassigned';
          const bName = b.assignedToUser ? 
            `${b.assignedToUser.firstName || ''} ${b.assignedToUser.lastName || ''}`.trim() : 'Unassigned';
          comparison = aName.localeCompare(bName);
          break;
        case 'revenue':
          const aRev = a.company.revenueInrCr ? parseFloat(String(a.company.revenueInrCr)) : 0;
          const bRev = b.company.revenueInrCr ? parseFloat(String(b.company.revenueInrCr)) : 0;
          comparison = aRev - bRev;
          break;
        case 'dateAdded':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'dateUpdated':
          comparison = new Date(a.stageUpdatedAt || 0).getTime() - new Date(b.stageUpdatedAt || 0).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });


    return result;
  }, [leads, searchTerm, filterSector, filterSubSector, filterAssignedTo,  filterPartner, filterStatus, filterStage,filterLocation,filterLocation,filterPoc, filterLeadSource, filterLeadTemperature, sortBy, stage]);

  

  const stageConfig = {
    universe: { 
      title: 'Universe', 
      description: 'Master list of all leads and prospects',
      action: 'Qualify Lead'
    },
    qualified: { 
      title: 'Qualified', 
      description: 'Leads with complete contact information ready for outreach',
      action: 'Start Outreach'
    },
    outreach: { 
      title: 'Outreach', 
      description: 'Active outreach and communication with prospects',
      action: 'Move to Pitching'
    },
    pitching: { 
      title: 'Pitching', 
      description: 'Active deal discussions and presentations',
      action: 'Move to Mandates'
    },
    mandates: { 
      title: 'Mandates', 
      description: 'Active mandates and contract management',
      action: 'Move to Completed Mandate'
    },
    completed_mandate: {
      title: 'Completed Mandate',
      description: 'Mandates that have been completed and documented',
      action: 'Archive'
    },
    won: { 
      title: 'Won', 
      description: 'Successfully closed deals',
      action: 'Archive'
    },
    lost: { 
      title: 'Lost', 
      description: 'Deals that were not won',
      action: 'Archive'
    },
    hold: {
      title: "Hold",
      description: "Paused leads that can be resumed later",
      action: "Move To",
    },
    dropped: {
      title: "Dropped",
      description: "Dropped leads that can be resumed later",
      action: "Move To",
    },
    rejected: { 
      title: 'Rejected', 
      description: 'Leads that did not progress or were declined',
      action: 'Archive'
    },
  };

  const config = stageConfig[stage] ?? {
  title: stage,
  description: "",
  action: "",
};

if (!stageConfig[stage]) {
  console.error("Unknown stage received in LeadManagement:", stage);
}


const handleEditLead = (leadId: number) => {
  setLocation(`/leads/${leadId}/edit`);
};


  const handleAssignLead = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowAssignmentModal({ leadId, company: lead.company });
    }
  };

  const handleReassignLead = (leadId: number) => {
    // For now, just open the same assignment modal - we'll add challenge later
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowAssignmentModal({ leadId, company: lead.company,currentAssignedInterns: lead.assignedInterns || []  // ✅ Pass current assignments
 });
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.length > 0 && bulkAssignToUser) {
      bulkAssignMutation.mutate({ leadIds: selectedLeads, assignedTo: bulkAssignToUser });
    }
  };

  const handleSelectLead = (leadId: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredAndSortedLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleOutreachClick = (leadId: number) => {
    console.log("Open new outreach management page for:", leadId);
    setLocation(`/outreach-status/${leadId}`);
  };

  const handleInterventionClick = (leadId: number) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setShowInterventionTracker({
        leadId,
        companyName: lead.company.name
      });
    }
  };

    // ✅ Move to Hold mutation
  const moveToHoldMutation = useMutation({
    mutationFn: async (leadId: number) => {
      return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "hold" });
    },
    onSuccess: () => {
      // refresh current stage + hold stage + dashboard
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", "stage", "hold"] });
      queryClient.invalidateQueries({ queryKey: ["leads", "stage", "dropped"] });
      queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });

      toast({
        title: "Moved to Hold",
        description: "Lead moved to Hold stage",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to move lead to Hold",
        variant: "destructive",
      });
    },
  });

  const handleMoveToHold = (leadId: number) => {
    moveToHoldMutation.mutate(leadId);
  };

    // ✅ Move to Dropped mutation
  const moveToDroppedMutation = useMutation({
  mutationFn: async (leadId: number) => {
    return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "dropped" });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["leads", "stage", "dropped"] });
    queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });

    toast({
      title: "Moved to Dropped",
      description: "Lead moved to Dropped stage",
    });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to move lead to Dropped",
      variant: "destructive",
    });
  },
});

const handleMoveToDropped = (leadId: number) => {
  moveToDroppedMutation.mutate(leadId);
};


  // ✅ From Hold tab: Move to another stage
// ✅ Unified stage move targets used by LeadCard Actions dropdown (ALL stages)
type StageMoveTarget =
  | "qualified"
  | "outreach"
  | "pitching"
  | "mandates"
  | "completed_mandate"
  | "hold"
  | "dropped";

// ✅ Direct stage move (for backward/skip moves)
const moveToStageMutation = useMutation({
  mutationFn: async ({ leadId, stage: nextStage }: { leadId: number; stage: StageMoveTarget }) => {
    return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: nextStage });
  },
  onSuccess: (_data, vars) => {
    // Refresh ALL stage tabs + dashboard
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "leads" &&
        q.queryKey[1] === "stage",
    });
    queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });

    toast({
      title: "Stage updated",
      description: `Lead moved to ${vars.stage}`,
    });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error?.message || "Failed to move lead",
      variant: "destructive",
    });
  },
});

// ✅ LeadCard calls this for ANY “Move to X”
const handleMoveToStage = (leadId: number, nextStage: StageMoveTarget) => {
  if (nextStage === "hold") return handleMoveToHold(leadId);
  if (nextStage === "dropped") return handleMoveToDropped(leadId);
  if (nextStage === "outreach") return handleMoveToOutreach(leadId);

  const lead = leads.find((l) => l.id === leadId);
  const fromStage = lead?.stage;

  if (nextStage === "pitching" && fromStage === "outreach") {
    return handleMoveToPitching(leadId);
  }

  if (nextStage === "mandates" && fromStage === "pitching") {
    return handleMoveToMandates(leadId);
  }

  if (nextStage === "completed_mandate" && fromStage === "mandates") {
    return handleMoveToCompletedMandate(leadId);
  }

  moveToStageMutation.mutate({ leadId, stage: nextStage });
};

    // Move to Outreach mutation — instant update
    const moveToOutreachMutation = useMutation({
      mutationFn: async (leadId: number) => {
        // Send request to backend
        return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "outreach" });
      },

      // 👇 Optimistic UI: update immediately
      onMutate: async (leadId: number) => {
        await queryClient.cancelQueries({ queryKey: ["leads", "stage", stage] });

        // Snapshot current list
        const previous = queryClient.getQueryData<Lead[]>(["leads", "stage", stage]);

        // Optimistically mark this lead as outreach
        queryClient.setQueryData(["leads", "stage", stage], (old: any) =>
          old
            ? old.map((lead: Lead) =>
                lead.id === leadId ? { ...lead, stage: "outreach" } : lead
              )
            : []
        );

        return { previous };
      },

      // Roll back on error
      onError: (error: any, leadId, context) => {
        if (context?.previous) {
          queryClient.setQueryData(["leads", "stage", stage], context.previous);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to move lead to outreach",
          variant: "destructive",
        });
      },

      // Sync with backend when done
        onSettled: () => {
          invalidateAllLeadUI();
        },

      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lead moved to Outreach stage",
        });
      },
    });

    const handleMoveToOutreach = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        moveToOutreachMutation.mutate(leadId);
      }
    };



  // // Move to Mandates mutation
  // const moveToMandatesMutation = useMutation({
  //   mutationFn: async (leadId: number) => {
  //     return apiRequest('PATCH', `/api/leads/${leadId}/stage`, { stage: 'mandates' });
  //   },
  //   onSuccess: () => {
  //     // Invalidate pitching and mandates stages, and dashboard
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'pitching'] });
  //     queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'mandates'] });
  //     queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
  //     toast({
  //       title: "Success",
  //       description: "Lead moved to Mandates stage",
  //     });
  //   },
  //   onError: (error: any) => {
  //     toast({
  //       title: "Error",
  //       description: error.message || "Failed to move lead to mandates",
  //       variant: "destructive",
  //     });
  //   },
  // });

  // const handleMoveToPitching = (leadId: number) => {
  //   const lead = leads.find(l => l.id === leadId);
  //   if (lead) {
  //     setShowEngagementGate({
  //       leadId,
  //       companyId: lead.company.id,
  //       companyName: lead.company.name
  //     });
  //   }
  // };

  // const handleMoveToMandates = (leadId: number) => {
  //   const lead = leads.find(l => l.id === leadId);
  //   if (lead) {
  //     // Show confirmation dialog first
  //     setShowMandateConfirmation({
  //       leadId,
  //       companyName: lead.company.name
  //     });
  //   }
  // };

  // const confirmMoveToMandates = () => {
  //   if (showMandateConfirmation) {
  //     // Move lead to Mandates stage
  //     const leadId = showMandateConfirmation.leadId;
  //     setShowMandateConfirmation(null);
  //     moveToMandatesMutation.mutate(leadId);
  //   }
  // };


    // ✅ Move to Mandates mutation — instant update (no refresh needed)
    const moveToMandatesMutation = useMutation({
      mutationFn: async (leadId: number) => {
        return apiRequest("PATCH", `/leads/${leadId}/stage`, { stage: "mandates" });
      },

      onMutate: async (leadId: number) => {
        await queryClient.cancelQueries({ queryKey: ["leads", "stage", stage] });

        const previous = queryClient.getQueryData<Lead[]>(["leads", "stage", stage]);

        // Optimistically mark as moved to mandates
        queryClient.setQueryData(["leads", "stage", stage], (old: any) =>
          old
            ? old.map((lead: Lead) =>
                lead.id === leadId ? { ...lead, stage: "mandates" } : lead
              )
            : []
        );

        return { previous };
      },

      onError: (error: any, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(["leads", "stage", stage], context.previous);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to move lead to mandates",
          variant: "destructive",
        });
      },

      onSettled: () => {
        invalidateAllLeadUI();
      },

      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lead moved to Mandates stage",
        });
      },
    });

        const moveToCompletedMandateMutation = useMutation({
      mutationFn: async ({ leadId, note }: { leadId: number; note: string }) => {
        return apiRequest("PATCH", `/leads/${leadId}/stage`, {
          stage: "completed_mandate",
          note,
        });
      },

      onMutate: async ({ leadId }) => {
        await queryClient.cancelQueries({ queryKey: ["leads", "stage", stage] });

        const previous = queryClient.getQueryData<Lead[]>(["leads", "stage", stage]);

        queryClient.setQueryData(["leads", "stage", stage], (old: any) =>
          old
            ? old.map((lead: Lead) =>
                lead.id === leadId ? { ...lead, stage: "completed_mandate" } : lead
              )
            : []
        );

        return { previous };
      },

      onError: (error: any, _vars, context) => {
        if (context?.previous) {
          queryClient.setQueryData(["leads", "stage", stage], context.previous);
        }
        toast({
          title: "Error",
          description: error.message || "Failed to move lead to Completed Mandate",
          variant: "destructive",
        });
      },

      onSettled: () => {
        invalidateAllLeadUI();
      },

      onSuccess: () => {
        toast({
          title: "Success",
          description: "Lead moved to Completed Mandate stage",
        });
      },
    });

    // ✅ Keep these handler functions (unchanged)
    const handleMoveToPitching = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setShowEngagementGate({
          leadId,
          companyId: lead.company.id,
          companyName: lead.company.name,
        });
      }
    };

    const handleMoveToMandates = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setShowMandateConfirmation({
          leadId,
          companyName: lead.company.name,
        });
      }
    };

    const handleMoveToCompletedMandate = (leadId: number) => {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setShowCompletedMandateConfirmation({
          leadId,
          companyName: lead.company.name,
          note: "",
        });
      }
    };

    const confirmMoveToMandates = () => {
      if (showMandateConfirmation) {
        const leadId = showMandateConfirmation.leadId;
        setShowMandateConfirmation(null);
        moveToMandatesMutation.mutate(leadId);
      }
    };

    const confirmMoveToCompletedMandate = () => {
      if (!showCompletedMandateConfirmation) return;

      const note = showCompletedMandateConfirmation.note.trim();
      if (!note) {
        toast({
          title: "Note required",
          description: "Please enter a note before moving to Completed Mandate.",
          variant: "destructive",
        });
        return;
      }

      const leadId = showCompletedMandateConfirmation.leadId;
      setShowCompletedMandateConfirmation(null);
      moveToCompletedMandateMutation.mutate({ leadId, note });
    };






  if (showInterventionTracker) {
    return (
      <div className="flex justify-center">
        <InterventionTracker
          leadId={showInterventionTracker.leadId}
          companyName={showInterventionTracker.companyName}
          onClose={() => setShowInterventionTracker(null)}
        />
      </div>
    );
  }

  // if (showAssignmentModal) {
  //   const lead = leads.find(l => l.id === showAssignmentModal.leadId);
  //   return (
  //     <div className="flex justify-center">
  //       <AssignmentModal
  //         lead={lead || null}
  //         company={showAssignmentModal.company}
  //         currentAssignedInterns={showAssignmentModal.currentAssignedInterns}  // ✅ Pass this
  //         isOpen={true}
  //         onClose={() => {
  //           setShowAssignmentModal(null);
  //           // Invalidate and refetch leads data after assignment changes
  //           queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
  //         }}
  //         currentUser={currentUser}
  //       />
  //     </div>
  //   );
  // }


  // ✅ Always enable stage moves from Actions dropdown in LeadCard
  const onMoveToStageProp = handleMoveToStage;

  return (
    <div className="space-y-6" data-testid={`lead-management-${stage}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{config.title}</h2>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" data-testid={`count-${stage}`}>
              {filteredAndSortedLeads.length} leads
            </Badge>
            {stage === 'universe' && ['partner', 'admin','analyst'].includes(currentUser.role) && (
              <>
              {
                console.log('currentUser.role',currentUser.role)
              }
                <Button
                  onClick={() => setShowBulkAssignModal(true)}
                  disabled={selectedLeads.length === 0}
                  variant="outline"
                  size="sm"
                  data-testid="button-bulk-assign"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Assign Selected</span>
                  <span className="sm:hidden">Assign</span>
                  <span className="ml-1">({selectedLeads.length})</span>
                </Button>

                <Button
                  onClick={handleDownloadActiveLeadsCsv}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-active-leads-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Download Active Leads CSV</span>
                  <span className="md:hidden">Active CSV</span>
                </Button>

                <Button
                  onClick={handleDownloadSample}
                  variant="outline"
                  size="sm"
                  data-testid="button-download-csv-sample"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">Download Sample CSV</span>
                  <span className="md:hidden">Sample CSV</span>
                </Button>
                <Button
                  onClick={() => setShowIndividualLeadForm(true)}
                  variant="default"
                  size="sm"
                  data-testid="button-add-individual-lead"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Individual Lead</span>
                  <span className="sm:hidden">Add Lead</span>
                </Button>
                <Button
                  onClick={() => setShowCsvUploadModal(true)}
                  variant="outline"
                  size="sm"
                  data-testid="button-upload-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Upload CSV</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search, Sort, and Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by company or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-leads"
              />
            </div>
            
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[180px] min-w-[140px]" data-testid="select-sort">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="company-asc">Company (A-Z)</SelectItem>
                <SelectItem value="company-desc">Company (Z-A)</SelectItem>
                <SelectItem value="sector-asc">Sector (A-Z)</SelectItem>
                <SelectItem value="sector-desc">Sector (Z-A)</SelectItem>
                <SelectItem value="assignedTo-asc">Assignee (A-Z)</SelectItem>
                <SelectItem value="assignedTo-desc">Assignee (Z-A)</SelectItem>
                <SelectItem value="revenue-asc">Revenue (Low-High)</SelectItem>
                <SelectItem value="revenue-desc">Revenue (High-Low)</SelectItem>
                <SelectItem value="dateAdded-asc">Date Added (Old-New)</SelectItem>
                <SelectItem value="dateAdded-desc">Date Added (New-Old)</SelectItem>
                <SelectItem value="dateUpdated-asc">Last Updated (Old-New)</SelectItem>
                <SelectItem value="dateUpdated-desc">Last Updated (New-Old)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap gap-2">
            {/* Sector Filter */}
{/* ✅ Sector Filter (multi-select) */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto min-w-[160px] justify-between"
      data-testid="select-filter-sector"
    >
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm">
          {isAll(filterSector)
            ? "All Sectors"
            : filterSector.length === 1
              ? filterSector[0]
              : `${filterSector.length} Sectors`}
        </span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
    <DropdownMenuCheckboxItem
      checked={isAll(filterSector)}
      onCheckedChange={() => clearOne("filterSector")}
    >
      All Sectors
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    {sectorOptions.map((sector) => (
      <DropdownMenuCheckboxItem
        key={sector}
        checked={filterSector.includes(sector)}
        onCheckedChange={() => toggleFilterSector(sector)}
      >
        {sector}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>

          
            {/* ✅ Sub-sector Filter */}
{/* ✅ Sub-sector Filter (multi-select) */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      disabled={uniqueSubSectors.length === 0}
      className="w-full sm:w-auto min-w-[180px] justify-between"
      data-testid="select-filter-subsector"
    >
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm">
          {uniqueSubSectors.length === 0
            ? "No Sub-sectors"
            : isAll(filterSubSector)
              ? "All Sub-sectors"
              : filterSubSector.length === 1
                ? filterSubSector[0]
                : `${filterSubSector.length} Sub-sectors`}
        </span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
    <DropdownMenuCheckboxItem
      checked={isAll(filterSubSector)}
      onCheckedChange={() => clearOne("filterSubSector")}
    >
      All Sub-sectors
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    {uniqueSubSectors.map((ss) => (
      <DropdownMenuCheckboxItem
        key={ss}
        checked={filterSubSector.includes(ss)}
        onCheckedChange={() => toggleFilterSubSector(ss)}
      >
        {ss}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>



            {/* Assigned To Filter */}
{/* ✅ Assigned To Filter (multi-select) */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto min-w-[180px] justify-between"
      data-testid="select-filter-assignee"
    >
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <span className="text-sm">
          {isAll(filterAssignedTo)
            ? "All Assignees"
            : filterAssignedTo.length === 1
              ? (filterAssignedTo[0] === "unassigned"
                  ? "Unassigned"
                  : (uniqueAssignees.find(a => a.id === filterAssignedTo[0])?.name || "Selected"))
              : `${filterAssignedTo.length} Assignees`}
        </span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
    <DropdownMenuCheckboxItem
      checked={isAll(filterAssignedTo)}
      onCheckedChange={() => clearOne("filterAssignedTo")}
    >
      All Assignees
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    <DropdownMenuCheckboxItem
      checked={filterAssignedTo.includes("unassigned")}
      onCheckedChange={() => toggleFilterAssignedTo("unassigned")}
    >
      Unassigned
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    {uniqueAssignees.map((assignee) => (
      <DropdownMenuCheckboxItem
        key={assignee.id}
        checked={filterAssignedTo.includes(assignee.id)}
        onCheckedChange={() => toggleFilterAssignedTo(assignee.id)}
      >
        {assignee.name}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>


            {/* ✅ Partner Filter (ALL stages) */}
{/* ✅ Partner Filter (multi-select, ALL stages) */}
{showPartnerFilter && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto min-w-[180px] justify-between"
        data-testid="select-filter-partner"
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="text-sm">
            {isAll(filterPartner)
              ? "All Partners"
              : filterPartner.length === 1
                ? (filterPartner[0] === "unassigned"
                    ? "Unassigned Partner"
                    : (partnerOptions.find(p => p.id === filterPartner[0])?.name || "Selected"))
                : `${filterPartner.length} Partners`}
          </span>
        </div>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
      <DropdownMenuCheckboxItem
        checked={isAll(filterPartner)}
        onCheckedChange={() => clearOne("filterPartner")}
      >
        All Partners
      </DropdownMenuCheckboxItem>

      <DropdownMenuSeparator />

      <DropdownMenuCheckboxItem
        checked={filterPartner.includes("unassigned")}
        onCheckedChange={() => toggleFilterPartner("unassigned")}
      >
        Unassigned Partner
      </DropdownMenuCheckboxItem>

      <DropdownMenuSeparator />

      {partnerOptions.map((p) => (
        <DropdownMenuCheckboxItem
          key={p.id}
          checked={filterPartner.includes(p.id)}
          onCheckedChange={() => toggleFilterPartner(p.id)}
        >
          {p.name}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)}


{/* ✅ EPN Filters (Lead -> linked Network Partners) */}
{["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage) && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto min-w-[160px] justify-between"
        data-testid="select-filter-epn"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm">
            {[
              filterEpnLinkage,
              filterEpnBucket,
              filterEpnCategory,
              filterEpnStage,
              filterEpnPartnerIds,
            ].every(isAll)
              ? "EPN: All"
              : "EPN: Filtered"}
          </span>
        </div>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="bg-gray-50 max-h-80 overflow-y-auto w-[280px]">
      {/* Linkage */}
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Linkage</div>
      <DropdownMenuCheckboxItem
        checked={isAll(filterEpnLinkage)}
        onCheckedChange={() => clearOne("filterEpnLinkage")}
      >
        All
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={filterEpnLinkage.includes("linked")}
        onCheckedChange={() => toggleFilterEpnLinkage("linked")}
      >
        Linked
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={filterEpnLinkage.includes("unlinked")}
        onCheckedChange={() => toggleFilterEpnLinkage("unlinked")}
      >
        Unlinked
      </DropdownMenuCheckboxItem>

      <DropdownMenuSeparator />

      {/* Bucket */}
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Bucket</div>
      <DropdownMenuCheckboxItem
        checked={isAll(filterEpnBucket)}
        onCheckedChange={() => clearOne("filterEpnBucket")}
      >
        All Buckets
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {epnBucketOptions.map((b) => (
        <DropdownMenuCheckboxItem
          key={b.value}
          checked={filterEpnBucket.includes(b.value)}
          onCheckedChange={() => toggleFilterEpnBucket(b.value)}
        >
          {b.label}
        </DropdownMenuCheckboxItem>
      ))}

      <DropdownMenuSeparator />

      {/* Partner Stage */}
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Partner Stage</div>
      <DropdownMenuCheckboxItem
        checked={isAll(filterEpnStage)}
        onCheckedChange={() => clearOne("filterEpnStage")}
      >
        All Stages
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {epnStageOptions.map((s) => (
        <DropdownMenuCheckboxItem
          key={s.value}
          checked={filterEpnStage.includes(s.value)}
          onCheckedChange={() => toggleFilterEpnStage(s.value)}
        >
          {s.label}
        </DropdownMenuCheckboxItem>
      ))}

      <DropdownMenuSeparator />

      {/* Category */}
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Category</div>
      <DropdownMenuCheckboxItem
        checked={isAll(filterEpnCategory)}
        onCheckedChange={() => clearOne("filterEpnCategory")}
      >
        All Categories
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {epnCategoryOptions.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">No categories found</div>
      ) : (
        epnCategoryOptions.map((c) => (
          <DropdownMenuCheckboxItem
            key={c}
            checked={filterEpnCategory.includes(c)}
            onCheckedChange={() => toggleFilterEpnCategory(c)}
          >
            {c}
          </DropdownMenuCheckboxItem>
        ))
      )}

      <DropdownMenuSeparator />

      {/* Partner */}
      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Partner</div>
      <DropdownMenuCheckboxItem
        checked={isAll(filterEpnPartnerIds)}
        onCheckedChange={() => clearOne("filterEpnPartnerIds")}
      >
        All Partners
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {epnPartnerOptions.length === 0 ? (
        <div className="px-2 py-2 text-xs text-muted-foreground">No partners found</div>
      ) : (
        epnPartnerOptions.map((p) => (
          <DropdownMenuCheckboxItem
            key={p.id}
            checked={filterEpnPartnerIds.includes(p.id)}
            onCheckedChange={() => toggleFilterEpnPartnerId(p.id)}
          >
            {p.name}
          </DropdownMenuCheckboxItem>
        ))
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}



            {/* Location Filter (Universe tab only) */}
         {/* ✅ Location Filter (Universe tab only) - multi-select */}
{["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage) && (
  <DropdownMenu>

    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto min-w-[160px] justify-between"
        data-testid="select-filter-location"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm">
            {isAll(filterLocation)
              ? "All Locations"
              : filterLocation.length === 1
                ? filterLocation[0]
                : `${filterLocation.length} Locations`}
          </span>
        </div>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
      <DropdownMenuCheckboxItem
        checked={isAll(filterLocation)}
        onCheckedChange={() => clearOne("filterLocation")}
      >
        All Locations
      </DropdownMenuCheckboxItem>

      <DropdownMenuSeparator />

      {uniqueLocations.map((loc) => (
        <DropdownMenuCheckboxItem
          key={loc}
          checked={filterLocation.includes(loc)}
          onCheckedChange={() => toggleFilterLocation(loc)}
        >
          {loc}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)}


            {/* ✅ Lead Source Filter */}
{/* ✅ Lead Source Filter (multi-select) */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto min-w-[160px] justify-between"
      data-testid="select-filter-lead-source"
    >
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4" />
        <span className="text-sm">
          {isAll(filterLeadSource)
            ? "All Sources"
            : filterLeadSource.length === 1
              ? filterLeadSource[0]
              : `${filterLeadSource.length} Sources`}
        </span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
    <DropdownMenuCheckboxItem
      checked={isAll(filterLeadSource)}
      onCheckedChange={() => clearOne("filterLeadSource")}
    >
      All Sources
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    {[
      { value: "inbound", label: "Inbound" },
      { value: "outbound", label: "Outbound" },
      { value: "otherchannelpartner", label: "Other Channel Partner" },
      { value: "idfc", label: "IDFC" },
      { value: "maheen", label: "Maheen" },
      { value: "altmount", label: "Altmount" },
    ].map((opt) => (
      <DropdownMenuCheckboxItem
        key={opt.value}
        checked={filterLeadSource.includes(opt.value)}
        onCheckedChange={() => toggleFilterLeadSource(opt.value)}
      >
        {opt.label}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>


            {/* ✅ POC Filter */}
{/* ✅ POC Filter (multi-select) */}
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className="w-full sm:w-auto min-w-[160px] justify-between"
      data-testid="select-filter-poc"
    >
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <span className="text-sm">
          {isAll(filterPoc)
            ? "All POCs"
            : filterPoc.length === 1
              ? filterPoc[0].replaceAll("_", " ")
              : `${filterPoc.length} POC rules`}
        </span>
      </div>
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
    <DropdownMenuCheckboxItem
      checked={isAll(filterPoc)}
      onCheckedChange={() => clearOne("filterPoc")}
    >
      All POCs
    </DropdownMenuCheckboxItem>

    <DropdownMenuSeparator />

    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Has (at least)</div>
    {["has_poc1", "has_poc2", "has_poc3"].map((v) => (
      <DropdownMenuCheckboxItem
        key={v}
        checked={filterPoc.includes(v)}
        onCheckedChange={() => toggleFilterPoc(v)}
      >
        {v === "has_poc1" ? "Has POC 1" : v === "has_poc2" ? "Has POC 2" : "Has POC 3"}
      </DropdownMenuCheckboxItem>
    ))}

    <DropdownMenuSeparator />

    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Only (exact)</div>
    {["only_poc1", "only_poc2", "only_poc3"].map((v) => (
      <DropdownMenuCheckboxItem
        key={v}
        checked={filterPoc.includes(v)}
        onCheckedChange={() => toggleFilterPoc(v)}
      >
        {v === "only_poc1" ? "Only POC 1" : v === "only_poc2" ? "Only POC 2" : "Only POC 3"}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>


            {/* Lead Temperature Filter */}   
{/* ✅ Lead Temperature Filter (multi-select) */}
{["universe", "qualified", "outreach", "pitching", "mandates", "completed_mandate"].includes(stage) && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto min-w-[180px] justify-between"
        data-testid="select-filter-temperature"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm">
            {isAll(filterLeadTemperature)
              ? "All Temperatures"
              : filterLeadTemperature.length === 1
                ? filterLeadTemperature[0].replaceAll("_", " ")
                : `${filterLeadTemperature.length} Temps`}
          </span>
        </div>
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
      <DropdownMenuCheckboxItem
        checked={isAll(filterLeadTemperature)}
        onCheckedChange={() => clearOne("filterLeadTemperature")}
      >
        All Lead Temperatures
      </DropdownMenuCheckboxItem>

      <DropdownMenuSeparator />

      {[
        { value: "hot", label: "Hot" },
        { value: "warm", label: "Warm" },
        { value: "not_reached", label: "Not reached" },
        { value: "not_set", label: "Not set" },
      ].map((opt) => (
        <DropdownMenuCheckboxItem
          key={opt.value}
          checked={filterLeadTemperature.includes(opt.value)}
          onCheckedChange={() => toggleFilterLeadTemperature(opt.value)}
        >
          {opt.label}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)}






            {/* Stage Filter (Universe tab only) */}
           {/* ✅ Stage Filter (Universe tab only) - multi-select */}
            {stage === "universe" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto min-w-[160px] justify-between"
                    data-testid="select-filter-stage"
                  >
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <span className="text-sm">
                        {isAll(filterStage)
                          ? "All Stages"
                          : filterStage.length === 1
                            ? filterStage[0]
                            : `${filterStage.length} Stages`}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="bg-gray-50 max-h-64 overflow-y-auto">
                  <DropdownMenuCheckboxItem
                    checked={isAll(filterStage)}
                    onCheckedChange={() => clearOne("filterStage")}
                  >
                    All Stages
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />

                 {["qualified","outreach","pitching","mandates","completed_mandate","hold","dropped","rejected"].map((st) => (
                    <DropdownMenuCheckboxItem
                      key={st}
                      checked={filterStage.includes(st)}
                      onCheckedChange={() => toggleFilterStage(st)}
                    >
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}


            {/* Clear Filters Button */}
            {/* Clear Filters Button */}
            {(
  !isAll(filterSector) ||
  !isAll(filterSubSector) ||
  !isAll(filterAssignedTo) ||
  !isAll(filterPartner) ||
  !isAll(filterStage) ||
  !isAll(filterLocation) ||
  !isAll(filterPoc) ||
  !isAll(filterLeadSource) ||
  !isAll(filterLeadTemperature) ||
  !isAll(filterEpnLinkage) ||
  !isAll(filterEpnBucket) ||
  !isAll(filterEpnCategory) ||
  !isAll(filterEpnStage) ||
  !isAll(filterEpnPartnerIds) ||
  filterStatus !== "all" ||
  !!searchTerm
) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
  clearFilters();
  setFilterStatus("all");
}}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}

          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      )}

      {/* Error state (prevents "blank page" mystery) */}
{!isLoading && error && (
  <div className="p-4 border rounded-md bg-red-50 text-red-700">
    <div className="font-semibold mb-2">Failed to load leads</div>
    <pre className="text-xs whitespace-pre-wrap">
      {String((error as any)?.message ?? error)}
    </pre>
  </div>
)}
      
      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load leads</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      )}
      
      {/* Leads Grid */}
      {!isLoading && !error && filteredAndSortedLeads.length > 0 ? (
        <div className="space-y-4">
          {/* Column Headers - Hidden on mobile */}
          <div className="hidden lg:grid grid-cols-12 gap-4 items-center border-b pb-2 text-sm font-medium text-muted-foreground">
            {stage === 'universe' && currentUser.role === 'admin' && (              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={selectedLeads.length === filteredAndSortedLeads.length && filteredAndSortedLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
              </div>
            )}
            <div className={stage === 'universe' && currentUser.role === 'admin' ? "col-span-4" : "col-span-4"}>Company</div>
            <div className={stage === 'universe' ? "col-span-3" : "col-span-3"}>Sector</div>
            {stage === 'universe' && (
              <div className="col-span-2">Owner</div>
            )}
            {stage === 'universe' && (
              <div className="col-span-2">Assigned To</div>
            )}
            {stage !== 'universe' && (
              <div className="col-span-3">Assigned To</div>
            )}
            {stage !== 'universe' && (
              <div className="col-span-2">Actions</div>
            )}
          </div>
          
          {/* Lead Cards */}
          <div className="space-y-2">
            {filteredAndSortedLeads.map((leadData) => (
            <div key={leadData.id} className="space-y-2">
              {stage === 'universe' && ['partner', 'admin'].includes(currentUser.role) ? (
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-1 flex items-center pt-4">
                    <Checkbox
                      checked={selectedLeads.includes(leadData.id)}
                      onCheckedChange={(checked) => handleSelectLead(leadData.id, checked as boolean)}
                      data-testid={`checkbox-lead-${leadData.id}`}
                    />
                  </div>
                  <div className="col-span-11">
                    <LeadCard
                      lead={leadData}
                      company={leadData.company}
                      contact={leadData.contact}
                      linkedEpns={epnByLeadId.get(leadData.id) || []}
                      currentUserName= {currentUser.firstName}
                      assignedToName={leadData.assignedToUser ? 
                        `${leadData.assignedToUser.firstName || ''} ${leadData.assignedToUser.lastName || ''}`.trim() :
                        undefined
                      }
                      assignedToUser={leadData.assignedToUser}
                      assignedPartnerUser={getPartnerUser(leadData)}
                      assignedInternUsers={leadData.assignedInterns 
                        ? leadData.assignedInterns
                            .map((internId: string) => allInterns.find(i => i.id === internId))
                            .filter(Boolean) as UserType[]
                        : []
                      }
                      ownerAnalystName={leadData.createdByUser ? 
                        `${leadData.createdByUser.firstName || ''} ${leadData.createdByUser.lastName || ''}`.trim() || (leadData.createdByUser.email ?? undefined) :
                        "Unassigned"
                      

                      }
                            currentUser={currentUser}
                      stage={stage}
                      onEdit={handleEditLead}
                      onAssign={handleAssignLead}
                      onReassign={handleReassignLead}
                      onIntervention={handleInterventionClick}
                      onMoveToOutreach={handleMoveToOutreach}
                      onManageOutreach={handleOutreachClick}
                      onMoveToPitching={handleMoveToPitching}
                      onMoveToMandates={handleMoveToMandates}
                      onMoveToHold={handleMoveToHold}
                      onMoveToDropped={handleMoveToDropped}
                      onMoveToStage={onMoveToStageProp}

                      
                    />
                  </div>
                </div>
              ) : (
                <LeadCard
                  lead={leadData}
                  company={leadData.company}
                  contact={leadData.contact}
                  linkedEpns={epnByLeadId.get(leadData.id) || []}
                  assignedToName={leadData.assignedToUser ? 
                    `${leadData.assignedToUser.firstName || ''} ${leadData.assignedToUser.lastName || ''}`.trim() :
                    undefined
                  }
                  assignedToUser={leadData.assignedToUser}
                  assignedPartnerUser={getPartnerUser(leadData)}
                  assignedInternUsers={leadData.assignedInterns 
                    ? leadData.assignedInterns
                        .map((internId: string) => allInterns.find(i => i.id === internId))
                        .filter(Boolean) as UserType[]
                    : []
                  }
                  

                    ownerAnalystName={leadData.createdByUser ? 
                      `${leadData.createdByUser.firstName || ''} ${leadData.createdByUser.lastName || ''}`.trim() || (leadData.createdByUser.email ?? undefined) :
                      "Unassigned"
                    }

                  
                  currentUser={currentUser}
                  stage={stage}
                  onEdit={handleEditLead}
                  onAssign={handleAssignLead}
                  onReassign={handleReassignLead}
                  onIntervention={handleInterventionClick}
                  onMoveToOutreach={handleMoveToOutreach}
                  onManageOutreach={handleOutreachClick}
                  onMoveToPitching={handleMoveToPitching}
                  onMoveToMandates={handleMoveToMandates}
                  onMoveToHold={handleMoveToHold}
                  onMoveToDropped={handleMoveToDropped}
                  onMoveToStage={onMoveToStageProp}

                />
              )}
            </div>
          ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "No leads match your search criteria." 
              : `No leads in ${config.title.toLowerCase()} stage yet.`
            }
          </p>
          {stage === 'universe' && (
            <Button 
              onClick={() => setShowIndividualLeadForm(true)}
              data-testid="button-add-first-lead"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Lead
            </Button>
          )}
        </div>
      )}

      {/* Bulk Assignment Dialog */}
      <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
        <DialogContent className="max-w-2xl" data-testid="dialog-bulk-assign">
          <DialogHeader>
            <DialogTitle>Bulk Assign Companies</DialogTitle>
            <DialogDescription>
              Assign {selectedLeads.length} selected companies to a team member
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={bulkAssignToUser} onValueChange={setBulkAssignToUser}>
                <SelectTrigger data-testid="select-bulk-assign-to">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent className="bg-gray-50">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.email
                      } ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Selected Companies ({selectedLeads.length})</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedLeads.map(leadId => {
                  const lead = leads.find(l => l.id === leadId);
                  return lead ? (
                    <div key={leadId} className="text-sm flex items-center gap-2">
                      <CheckSquare className="h-3 w-3" />
                      {lead.company.name}
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkAssignModal(false);
                  setSelectedLeads([]);
                  setBulkAssignToUser("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={!bulkAssignToUser || selectedLeads.length === 0 || bulkAssignMutation.isPending}
                data-testid="button-confirm-bulk-assign"
              >
                {bulkAssignMutation.isPending ? "Assigning..." : `Assign ${selectedLeads.length} Companies`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvUploadModal} onOpenChange={setShowCsvUploadModal}>
        <DialogContent className="max-w-3xl" data-testid="dialog-csv-upload">
          <DialogHeader>
            <DialogTitle>Upload Companies via CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import companies and their primary contacts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                data-testid="input-csv-file"
              />
              <p className="text-sm text-muted-foreground">
                Select a CSV file to upload. Need a template? 
                <Button 
                  variant="ghost" 
                  className="p-0 h-auto text-sm" 
                  onClick={handleDownloadSample}
                  data-testid="link-download-sample"
                >
                  Download sample CSV
                </Button>
              </p>
            </div>

            {csvUploadResults && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium">Upload Results</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Rows:</span> {csvUploadResults.totalRows}
                  </div>
                  <div>
                    <span className="font-medium">Companies Created:</span> {csvUploadResults.successfulCompanies}
                  </div>
                  <div>
                    <span className="font-medium">Contacts Created:</span> {csvUploadResults.successfulContacts}
                  </div>
                  <div>
                    <span className="font-medium">Errors:</span> {csvUploadResults.errors?.length || 0}
                  </div>
                </div>
                
                {csvUploadResults.errors && csvUploadResults.errors.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-medium text-destructive mb-2">Errors:</h5>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {csvUploadResults.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-destructive">
                          Row {error.row}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCsvUploadModal(false);
                  setCsvFile(null);
                  setCsvUploadResults(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCsvUpload}
                disabled={!csvFile || csvUploadMutation.isPending}
                data-testid="button-upload-csv"
              >
                {csvUploadMutation.isPending ? "Uploading..." : "Upload CSV"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Individual Lead Form Dialog */}
      <Dialog open={showIndividualLeadForm} onOpenChange={setShowIndividualLeadForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" data-testid="dialog-individual-lead-form">
          <IndividualLeadForm
            currentUser={{
              ...currentUser,
              // FIX: Ensure these are strings, not undefined
              firstName: currentUser.firstName || "",
              lastName: currentUser.lastName || ""
            }}
            onSuccess={() => {
              setShowIndividualLeadForm(false);
              // Refresh the leads for this stage and related data
              queryClient.invalidateQueries({ queryKey: ['leads', 'stage', stage] });
              queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'] });
            }}
            onCancel={() => setShowIndividualLeadForm(false)}
          />
        </DialogContent>
      </Dialog>


      {/* Engagement Gate Dialog - Required before moving to Pitching */}
      {showEngagementGate && (
        <EngagementGateDialog
          isOpen={!!showEngagementGate}
          leadId={showEngagementGate.leadId}
          companyId={showEngagementGate.companyId}
          companyName={showEngagementGate.companyName}
          onClose={() => setShowEngagementGate(null)}
          onSuccess={() => {
            setShowEngagementGate(null);
            // Refresh leads for both outreach and pitching stages
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'outreach'] });
            queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'pitching'] });
            queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'] });
          }}
        />
      )}

      {/* Mandate Confirmation Dialog */}
      {showMandateConfirmation && (
        <Dialog open={!!showMandateConfirmation} onOpenChange={(open) => !open && setShowMandateConfirmation(null)}>
          <DialogContent data-testid="dialog-mandate-confirmation">
            <DialogHeader>
              <DialogTitle>Confirm Mandate</DialogTitle>
              <DialogDescription>
                Are you sure you have received a mandate to proceed with <strong>{showMandateConfirmation.companyName}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Please confirm that you have received a formal mandate from the client before proceeding to the Mandates stage. 
                  This indicates that the client has committed to working with your firm.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Before confirming, ensure:</p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  <li>• You have received a signed Letter of Engagement</li>
                  <li>• The client has formally committed to the engagement</li>
                  <li>• All terms and conditions have been agreed upon</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMandateConfirmation(null)}
                data-testid="button-cancel-mandate"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmMoveToMandates}
                data-testid="button-confirm-mandate"
              >
                Yes, I Have a Mandate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}


            {/* Completed Mandate Confirmation Dialog */}
      {showCompletedMandateConfirmation && (
        <Dialog
          open={!!showCompletedMandateConfirmation}
          onOpenChange={(open) => !open && setShowCompletedMandateConfirmation(null)}
        >
          <DialogContent data-testid="dialog-completed-mandate-confirmation">
            <DialogHeader>
              <DialogTitle>Move to Completed Mandate</DialogTitle>
              <DialogDescription>
                Add a note and confirm moving <strong>{showCompletedMandateConfirmation.companyName}</strong> to Completed Mandate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Please capture a short completion note before moving this lead.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="completed-mandate-note">Note</Label>
                <textarea
                  id="completed-mandate-note"
                  value={showCompletedMandateConfirmation.note}
                  onChange={(e) =>
                    setShowCompletedMandateConfirmation((prev) =>
                      prev ? { ...prev, note: e.target.value } : prev
                    )
                  }
                  placeholder="Enter completion note..."
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  data-testid="input-completed-mandate-note"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCompletedMandateConfirmation(null)}
                data-testid="button-cancel-completed-mandate"
              >
                No
              </Button>
              <Button
                onClick={confirmMoveToCompletedMandate}
                data-testid="button-confirm-completed-mandate"
              >
                Yes, Move Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}


                {/* ✅ ADD THIS HERE (just before the final closing div) */}
    <AssignmentModal
      lead={
        showAssignmentModal
          ? (leads.find((l: any) => l.id === showAssignmentModal.leadId) || null)
          : null
      }
      company={showAssignmentModal?.company || null}
      currentAssignedInterns={showAssignmentModal?.currentAssignedInterns || []}
      isOpen={!!showAssignmentModal}
      onClose={() => {
        setShowAssignmentModal(null);
        queryClient.invalidateQueries({ queryKey: ["leads", "stage", stage] });
      }}
      currentUser={currentUser}
    />

    </div>
  );
}