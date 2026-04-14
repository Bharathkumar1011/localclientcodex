import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  User as UserIcon, 
  ExternalLink, 
  Edit,
  Linkedin,
  CheckCircle,
  AlertCircle,
  UserX,
  Users,
  XCircle,
  MoreHorizontal,
  PauseCircle,
  TrendingDown,
  ChevronDown,
  Phone,
  Mail,
  CheckSquare,
  Calendar,
  Bot,
  MessageSquare,
  Upload,
  Download,
  Trash2,
  Link2,
  FileText,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useState , useEffect, useRef} from "react";
import { useLocation } from "wouter";

import PitchingTrackerDialog from "./PitchingTrackerDialog"; // ✅ NEW COMPONENT FOR PITCHING TRACKER

import LeadCardStageWorkspace from "./LeadCardStageWorkspace"; // ✅ NEW COMPONENT THAT RENDERS DIFFERENT CONTENT BASED ON LEAD STAGE

// Add these to your existing imports
import { Textarea } from "@/components/ui/textarea"; 
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";



// import LeadDetailsModal from "@/components/LeadDetailsModal";
import { RejectLeadDialog } from "./RejectLeadDialog";
import type { Lead, Company, Contact, User as UserType } from "@/lib/types";



type LinkedEpnPartner = {
  id: number;
  name: string;
  bucket?: string | null;
  stage?: string | null;
};

type LeadSolutionNoteData = {
  id?: number;
  leadId?: number;
  pdfPath?: string | null;
  pdfName?: string | null;
  links?: string[];
};

interface LeadCardProps {
  lead: Lead;
  company: Company;
  contact?: Contact;
  currentUserName?: string; // Name of the current user (deprecated)
  assignedToName?: string; // Name of the assigned user (deprecated)
  assignedToUser?: Partial<UserType>; // Analyst
  assignedPartnerUser?: Partial<UserType>; // ✅ Partner
  assignedInternUsers?: Partial<UserType>[]; // Interns
  linkedEpns?: LinkedEpnPartner[];
  ownerAnalystName?: string; // Name of the owner analyst
  currentUser: UserType; // Current user for role-based visibility
  stage: string; // Current stage to determine what to show
  onEdit?: (leadId: number) => void;
  onAssign?: (leadId: number) => void;
  onReassign?: (leadId: number) => void;
  onIntervention?: (leadId: number) => void;
  onMoveToOutreach?: (leadId: number) => void;
  onManageOutreach?: (leadId: number) => void;
  onMoveToPitching?: (leadId: number) => void;
  onMoveToMandates?: (leadId: number) => void;
  onMoveToHold?: (leadId: number) => void; // NEW
  onMoveToDropped?: (leadId: number) => void; // NEW

  onMoveToStage?: (
    leadId: number,
    stage:
      | "qualified"
      | "outreach"
      | "pitching"
      | "mandates"
      | "completed_mandate"
      | "hold"
      | "dropped"
  ) => void;

  onReject?: () => void; // Callback when lead is rejected

}


// Define possible move stages and their order
type MoveStage =
  | "qualified"
  | "outreach"
  | "pitching"
  | "mandates"
  | "completed_mandate"
  | "hold"
  | "dropped";

const MOVE_STAGE_ORDER: MoveStage[] = [
  "qualified",
  "outreach",
  "pitching",
  "mandates",
  "completed_mandate",
  "hold",
  "dropped",
];

const MOVE_STAGE_LABEL: Record<MoveStage, string> = {
  qualified: "Qualified",
  outreach: "Outreach",
  pitching: "Pitching",
  mandates: "Mandates",
  completed_mandate: "Completed Mandate",
  hold: "Hold",
  dropped: "Dropped",
};

const getMoveTargets = (currentStage: string): MoveStage[] => {
  // terminal outcomes -> no stage moves
  if (currentStage === "won" || currentStage === "lost") return [];

  // Universe lead can move to any stage target
  if (currentStage === "universe") return MOVE_STAGE_ORDER;

  // Other stages: show all move targets except its own stage
  return MOVE_STAGE_ORDER.filter((s) => s !== currentStage);
};


// Helper component for Quick Actions
const ContactAction = ({ 
  icon: Icon, 
  label, 
  contacts, 
  field, 
  action 
}: { 
  icon: any, 
  label: string, 
  contacts: Contact[], 
  field: 'phone' | 'email' | 'linkedinProfile', 
  action: (value: string) => void 
}) => {
  // Filter contacts that actually have this field
  const validContacts = contacts.filter(c => c[field] && c[field]!.trim() !== '');

  // Case 0: No data -> Disabled Button
  if (validContacts.length === 0) {
    return (
      <Button variant="outline" size="icon" className="h-8 w-8" disabled title={`No ${label}`}>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  // Case 1: Single Contact -> Direct Action
  if (validContacts.length === 1) {
    const contact = validContacts[0];
    return (
      <Button 
        variant="outline" 
        size="icon" 
        className="h-8 w-8" 
        title={`${label}: ${contact[field]}`}
        onClick={(e) => {
          e.stopPropagation();
          action(contact[field]!);
        }}
      >
        <Icon className={`h-4 w-4 ${label === 'Email' ? 'text-red-500' : label === 'LinkedIn' ? 'text-blue-700' : 'text-blue-600'}`} />
      </Button>
    );
  }

  // Case 2: Multiple Contacts -> Dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 relative" 
          title={`Select ${label}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon className={`h-4 w-4 ${label === 'Email' ? 'text-red-500' : label === 'LinkedIn' ? 'text-blue-700' : 'text-blue-600'}`} />
          {/* Small indicator dot for multiple options */}
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-sky-200 border border-sky-100 mix-blend-plus-lighter shadow-lg">
        {validContacts.map(c => (
          <DropdownMenuItem 
            key={c.id} 
            onClick={(e) => {
              e.stopPropagation();
              action(c[field]!);
            }}
          >
            <span className="font-medium mr-2">{c.name}:</span>
            <span className="text-muted-foreground truncate max-w-[150px]">{c[field]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



export default function LeadCard({ 
  lead, 
  company, 
  contact,
  currentUserName,
  assignedToName,
  assignedToUser,
  assignedPartnerUser,
  assignedInternUsers,
  linkedEpns = [],
  ownerAnalystName,
  currentUser,
  stage,
  onEdit,
  onAssign,
  onReassign,
  onIntervention,
  onMoveToOutreach,
  onManageOutreach,
  onMoveToPitching,
  onMoveToMandates,
  onMoveToHold,
  onMoveToDropped,
  onMoveToStage,
  onReject,
}: LeadCardProps) {
  // ✅ NEW: Initialize state from localStorage so it "holds" across tab switches/refreshes
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(`lead-expanded-${lead.id}`);
    return saved === "true";
  });


  // ✅ STAGE AGING CALCULATION
  const aging = (() => {
    if (!lead.stageUpdatedAt) return null;
    const days = Math.floor((new Date().getTime() - new Date(lead.stageUpdatedAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (days >= 30) return { days, color: "text-red-600", label: "Stagnant Deal (30+ Days)" };
    if (days >= 14) return { days, color: "text-amber-500", label: "Deal Aging (14+ Days)" };
    return null;
  })();

  // ✅ NEW: Save to localStorage whenever the user toggles the card
const toggleExpanded = () => {
  setIsExpanded((prev) => {
    const newState = !prev;
    localStorage.setItem(`lead-expanded-${lead.id}`, String(newState));

    if (newState) {
      setCanFetchLinkedInvestors(true);
    }

    return newState;
  });
};
  const [, setLocation] = useLocation();

  

  const openManageOutreachPage = () => {
    setLocation(`/outreach-status/${lead.id}`);
  };

  

  // --- NEW: Highlight & Auto-Expand Logic ---
  const cardRef = useRef<HTMLDivElement>(null);
  const hasHandledHighlightRef = useRef(false);
  const [canFetchLinkedInvestors, setCanFetchLinkedInvestors] = useState(false);

  useEffect(() => {
    if (isExpanded && !canFetchLinkedInvestors) {
      setCanFetchLinkedInvestors(true);
    }
  }, [isExpanded, canFetchLinkedInvestors]);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const highlightId = params.get("highlightLead");

  if (highlightId !== String(lead.id) || hasHandledHighlightRef.current) return;

  hasHandledHighlightRef.current = true;

  localStorage.setItem(`lead-expanded-${lead.id}`, "true");
  setIsExpanded(true);

  requestAnimationFrame(() => {
    cardRef.current?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });

    window.setTimeout(() => {
      setCanFetchLinkedInvestors(true);
    }, 120);

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("highlightLead");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  });
}, [lead.id]);

  const [showPitchingDialog, setShowPitchingDialog] = useState(false); // State for Pitching Tracker Dialog


  // ✅ ADD THIS LOGIC BLOCK AT THE TOP OF THE FUNCTION
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(lead.notes || "");
  const [hasChanges, setHasChanges] = useState(false);

  const [cardNextActionText, setCardNextActionText] = useState((lead as any).cardNextActionText || "");
  const [hasCardNextActionChanges, setHasCardNextActionChanges] = useState(false);
  const [cardNextActionDate, setCardNextActionDate] = useState(
    (lead as any).cardNextActionDate
      ? new Date((lead as any).cardNextActionDate).toISOString().slice(0, 10)
      : ""
  );
  const cardNextActionDateInputRef = useRef<HTMLInputElement>(null);
  const [solutionLinkInput, setSolutionLinkInput] = useState("");

  useEffect(() => {
    setCardNextActionText((lead as any).cardNextActionText || "");
    setCardNextActionDate(
      (lead as any).cardNextActionDate
        ? new Date((lead as any).cardNextActionDate).toISOString().slice(0, 10)
        : ""
    );
    setHasCardNextActionChanges(false);
  }, [lead.id, (lead as any).cardNextActionText, (lead as any).cardNextActionDate]);

  const saveNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      await apiRequest("PATCH", `/leads/${lead.id}`, { notes: newNotes });
    },
    onSuccess: () => {
      toast({ title: "Notes updated" });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  });

  const saveCardNextActionMutation = useMutation({
    mutationFn: async ({
      cardNextActionText,
      cardNextActionDate,
    }: {
      cardNextActionText: string;
      cardNextActionDate: string;
    }) => {
      await apiRequest("PATCH", `/leads/${lead.id}/card-next-action`, {
        cardNextActionText,
        cardNextActionDate: cardNextActionDate || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Lead next action updated" });
      setHasCardNextActionChanges(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => {
      toast({ title: "Failed to save lead next action", variant: "destructive" });
    }
  });

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    setHasChanges(true);
  };

  // --- NEW: Fetch Investors linked to this Lead ---
const { data: linkedInvestors = [] } = useQuery<any[]>({
  queryKey: ["/leads/linked-investors", lead.id],
  queryFn: async () => {
    const res = await apiRequest("GET", `/leads/${lead.id}/linked-investors`);
    return res.json();
  },
  enabled: isExpanded && canFetchLinkedInvestors,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
});


// --- NEW: Fetch Solution Note for this Lead ---
  const solutionNoteQueryKey = ["/leads", lead.id, "solution-note"];

  const { data: leadSolutionNote } = useQuery<LeadSolutionNoteData>({
    queryKey: solutionNoteQueryKey,
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${lead.id}/solution-note`);
      return res.json();
    },
    enabled: isExpanded,
  });

  const saveSolutionLinksMutation = useMutation({
    mutationFn: async (links: string[]) => {
      const res = await apiRequest("POST", `/leads/${lead.id}/solution-note`, { links });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solutionNoteQueryKey });
    },
    onError: () => {
      toast({ title: "Failed to save solution note links", variant: "destructive" });
    },
  });

const uploadSolutionPdfMutation = useMutation({
  mutationFn: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiFetch(`/api/leads/${lead.id}/solution-note/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Upload failed");
    }

    return res.json();
  },
  onSuccess: () => {
    toast({ title: "Solution note PDF uploaded" });
    queryClient.invalidateQueries({ queryKey: solutionNoteQueryKey });
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
  let previewWindow: Window | null = null;

  try {
    if (mode === "preview") {
      previewWindow = window.open("", "_blank");
      if (previewWindow) {
        previewWindow.document.write("<title>Loading preview...</title><p style='font-family: sans-serif; padding: 16px;'>Loading preview...</p>");
      }
    }

    const endpoint =
      mode === "preview"
        ? `/api/leads/${lead.id}/solution-note/preview`
        : `/api/leads/${lead.id}/solution-note/download`;

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
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank");
      }

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
    if (previewWindow && !previewWindow.closed) {
      previewWindow.close();
    }

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

    const existingLinks = Array.isArray(leadSolutionNote?.links) ? leadSolutionNote!.links! : [];

    if (existingLinks.includes(normalized)) {
      setSolutionLinkInput("");
      return;
    }

    saveSolutionLinksMutation.mutate([...existingLinks, normalized]);
    setSolutionLinkInput("");
  };

  const handleRemoveSolutionLink = (linkToRemove: string) => {
    const existingLinks = Array.isArray(leadSolutionNote?.links) ? leadSolutionNote!.links! : [];
    saveSolutionLinksMutation.mutate(existingLinks.filter((link) => link !== linkToRemove));
  };

  const handleSolutionPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadSolutionPdfMutation.mutate(file);
    e.target.value = "";
  };


  // --- NEW: Handler for clicking on linked investors to navigate to the Investor Management page with appropriate filters ---
  const handleInvestorClick = (inv: any) => {
    // Map investor stage to your specific App.tsx routes
    const stageRoutes: Record<string, string> = {
      outreach: "/investor-relation/investor-management/outreach",
      warm: "/investor-relation/investor-management/warm",
      active: "/investor-relation/investor-management/active",
      dealmaking: "/investor-relation/investor-management/dealmaking",
    };
    
    // Default to the main database if stage doesn't match
    const baseRoute = stageRoutes[inv.stage] || "/investor-relation/investor-management/database";
    
    // Reroute with the highlight ID in the URL
    setLocation(`${baseRoute}?highlight=${inv.id}`);
  };


    const handleEpnClick = (epn: LinkedEpnPartner) => {
    const bucketRoutes: Record<string, string> = {
      idfc: "idfc",
      other_channel_partner: "other-channel-partners",
      other_epn: "other-epn",
    };

    const stageRoutes: Record<string, string> = {
      outreach: "outreach",
      active: "active",
      rainmaking: "rainmaking",
    };

    const bucketRoute = bucketRoutes[epn.bucket || ""] || "idfc";
    const stageRoute = stageRoutes[epn.stage || ""] || "outreach";

    setLocation(`/epn/${bucketRoute}/${stageRoute}?highlightEpn=${epn.id}`);
  };

  const leadActionButtonClass =
  "w-full min-h-[46px] px-3 py-2.5 bg-cyan-100/80 hover:bg-cyan-200/80 text-cyan-900 font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 text-sm leading-tight whitespace-normal text-center";




  const LEAD_SOURCE_OPTIONS = [
    { value: "inbound", label: "Inbound" },
    { value: "outbound", label: "Outbound" },
    { value: "otherchannelpartner", label: "Other Channel Partner" },
    { value: "idfc", label: "IDFC" },
    { value: "maheen", label: "Maheen" },
    { value: "altmount", label: "Altmount" },
  ] as const;

  const leadSourceRaw = (lead as any).leadSource ?? (lead as any).lead_source ?? null;
  const leadSourceDisplay =
    leadSourceRaw
      ? (LEAD_SOURCE_OPTIONS.find((o) => o.value === String(leadSourceRaw))?.label ?? String(leadSourceRaw))
      : "Not set";

   // leadtempararture 
  const temperatureRaw = (lead as any).leadTemperature ?? (lead as any).lead_temperature ?? null;

  const temperatureLabel =
    temperatureRaw === "hot"
      ? "Hot"
      : temperatureRaw === "warm"
      ? "Warm"
      : temperatureRaw === "not_reached"
      ? "Not reached"
      : null;

  const leadTemperatureDisplay =
    temperatureRaw === "hot"
      ? "Hot"
      : temperatureRaw === "warm"
      ? "Warm"
      : temperatureRaw === "not_reached"
      ? "Not reached"
      : "Not set";


    const toSafeUrl = (u?: string) => {
      if (!u) return "";
      const s = String(u).trim();
      if (!s) return "";
      return s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
    };



  // ✅ Lead Location (prefer lead-level, fallback to company if needed)
  const leadLocation =
    (lead as any).location ??
    (lead as any).city ??
    (company as any).location ??
    (company as any).city ??
    "";



 
  const AssigneesDropdown = () => {
    const analystLabel =
      assignedToUser
        ? (assignedToUser.firstName && assignedToUser.lastName
            ? `${assignedToUser.firstName} ${assignedToUser.lastName}`
            : assignedToUser.email || "Assigned")
        : "Assigned";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2 w-fit"
            onClick={(e) => e.stopPropagation()}
            data-testid={`button-assignees-${lead.id}`}
          >
            <span className="mr-1">{analystLabel}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="z-[9999] min-w-[240px] rounded-md border border-gray-200 bg-gray-50 p-2 text-foreground shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Analyst */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Analyst</span>
            <span className="text-sm font-medium">
              {assignedToUser
                ? (assignedToUser.firstName && assignedToUser.lastName
                    ? `${assignedToUser.firstName} ${assignedToUser.lastName}`
                    : assignedToUser.email || "—")
                : "—"}
            </span>
          </div>

          {/* Partner */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-muted-foreground">Partner</span>
            <span className="text-sm font-medium">
              {assignedPartnerUser
                ? (assignedPartnerUser.firstName && assignedPartnerUser.lastName
                    ? `${assignedPartnerUser.firstName} ${assignedPartnerUser.lastName}`
                    : assignedPartnerUser.email || "—")
                : "—"}
            </span>
          </div>

          {/* Interns */}
          {assignedInternUsers && assignedInternUsers.length > 0 && (
            <>
              <div className="my-2 border-t border-border" />
              <div className="text-xs text-muted-foreground mb-1">Interns</div>
              <div className="flex flex-wrap gap-1">
                {assignedInternUsers.map((intern, index) => (
                  <Badge key={intern?.id || index} variant="secondary" className="text-xs">
                    {intern?.firstName && intern?.lastName
                      ? `${intern.firstName} ${intern.lastName}`
                      : intern?.email || "Unknown"}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };



  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  // const [showLeadDetails, setShowLeadDetails] = useState(false);
  console.log("currentUserName", currentUser.firstName);


  // Derive contact completeness for color coding
  // Red: No contact details, Amber: Partial details, Green: Open (complete details)
  const getContactCompleteness = () => {
    if (!contact) return 'red'; // No contact details
    
    const requiredFields = [contact.name, contact.designation, contact.linkedinProfile, contact.phone, contact.email];
    const filledFields = requiredFields.filter(field => field && field.trim() !== '').length;
    
    if (filledFields === 0) return 'red'; // No details
    if (filledFields === requiredFields.length) return 'green'; // Complete details
    return 'amber'; // Partial details
  };
  
  const contactCompleteness = getContactCompleteness();
  
  // Get contact status badge variant based on contact completeness
  const getContactStatusBadgeVariant = () => {
    switch (contactCompleteness) {
      case 'red': return 'destructive' as const;
      case 'amber': return 'warning' as const;
      case 'green': return 'default' as const;
      default: return 'destructive' as const;
    }
  };
  
  const getContactStatusText = () => {
    switch (contactCompleteness) {
      case 'red': return null; // No badge if no contact details
      case 'amber': return null; // Could return "Incomplete" if you want a badge for partial details
      case 'green': return null; // Could return "Complete" if you want a badge for complete details
      default: return null; // No badge
    }
  };


  const stageConfig = {
    universe: { label: 'Universe', color: 'secondary' },
    qualified: { label: 'Qualified', color: 'default' },
    outreach: { label: 'Outreach', color: 'default' },
    pitching: { label: 'Pitching', color: 'default' },
    mandates: { label: 'Mandates', color: 'default' },
    hold: { label: 'Hold', color: 'warning' },
    dropped: { label: 'Dropped', color: 'warning' },
    rejected: { label: 'Rejected', color: 'destructive' },
  } as const;

    // for the assigned analyst display in leadcard
    const formatUserDisplay = (u?: Partial<UserType>) => {
    if (!u) return "Not set";
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return full || u.email || "Not set";
  };

  const assignedAnalystDisplay = formatUserDisplay(assignedToUser);
  const assignedPartnerDisplay = formatUserDisplay(assignedPartnerUser);

  const stageKey = String(lead?.stage ?? "").toLowerCase().trim();
  const currentStageDisplay =
    (stageConfig as any)?.[stageKey]?.label ??
    (MOVE_STAGE_LABEL as any)?.[stageKey] ??
    (stageKey ? stageKey.charAt(0).toUpperCase() + stageKey.slice(1) : "Not set");




  // Universe sub-state configuration for Open/Assigned indicators
  const getUniverseSubStateConfig = () => {
    if (lead.stage !== 'universe') return null;
    
    const isAssigned = lead.assignedTo !== null;
    const universeStatus = (lead as any).universeStatus || (isAssigned ? 'assigned' : 'open');
    
    return {
      label: universeStatus === 'assigned' ? 'Assigned' : 'Open',
      color: universeStatus === 'assigned' ? 'default' : 'outline'
    };
  };


const handleCompanyClick = () => {
    toggleExpanded();
  };


  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Assigning lead: ${company.name}`);
    onAssign?.(lead.id);
  };

  const handleReassignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Opening reassign modal for: ${company.name}`);
    onReassign?.(lead.id);
  };


  const handleInterventionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`Opening intervention tracker for: ${company.name}`);
    onIntervention?.(lead.id);
  };


// Responsive card view
  return (
    <>
    <Card 
    ref={cardRef} // <-- Add this here
      // Shiny effect: Blue tint gradient similar to sidebar
      className="hover-elevate bg-gradient-to-br from-blue-100/90 via-white to-blue-100/90 border-blue-200" 
      data-testid={`lead-card-${lead.id}`}
    >
      <CardHeader className="py-4">
        {/* Desktop Grid Layout (lg and up) */}
        <div className={`hidden lg:grid gap-4 items-center ${stage === 'universe' ? 'grid-cols-12' : 'grid-cols-12'}`}>
          {/* Company Name with POC Status - 4 columns (Universe and other stages) */}
        <div className="min-w-0 col-span-4">
          <div className="flex items-start gap-2 min-w-0">
            {/* Chevron */}
            <div
              className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 hover:bg-blue-100 cursor-pointer transition-colors flex-shrink-0 mt-0.5"
              onClick={handleCompanyClick}
            >
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180 text-blue-600" : ""
                }`}
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Company name row */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={handleCompanyClick}
                  className="text-base font-semibold hover:underline focus:outline-none focus:underline text-foreground truncate"
                  data-testid={`button-company-${lead.id}`}
                >
                  {company.name}
                </button>

                {aging && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`cursor-help flex-shrink-0 ml-1.5 ${aging.color}`}>
                          <AlertCircle className="h-4 w-4 animate-pulse" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        className={`border shadow-md p-2 z-[9999] ${
                          aging.days >= 30
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-white"
                        }`}
                      >
                        <p
                          className={`font-bold text-xs uppercase tracking-tight ${
                            aging.days >= 30 ? "text-red-700" : "text-foreground"
                          }`}
                        >
                          {aging.label}
                        </p>
                        <p
                          className={`text-[10px] italic mt-0.5 ${
                            aging.days >= 30 ? "text-red-600" : "text-muted-foreground"
                          }`}
                        >
                          This deal has been in {currentStageDisplay} for {aging.days} days.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Badges below company name */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-xs capitalize border border-slate-200 bg-white text-slate-700"
                >
                  {currentStageDisplay}
                </Badge>

                <Badge
                  variant={getContactStatusBadgeVariant()}
                  className="text-xs"
                  data-testid={`badge-poc-status-${lead.id}`}
                >
                  {getContactStatusText()}
                </Badge>

                {temperatureLabel && (
                  <Badge
                    variant={
                      temperatureRaw === "hot"
                        ? "destructive"
                        : temperatureRaw === "warm"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-xs"
                    data-testid={`badge-temperature-${lead.id}`}
                  >
                    {temperatureLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          </div>
          
          {/* Sector - 3 columns */}
          <div className="col-span-3 min-w-0">
            <div className="text-sm text-foreground truncate">
              {company.sector || "Not specified"}
              {leadLocation ? ` • ${leadLocation}` : ""}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-1">
              {(company as any).subSector || "Sub-sector not set"}
            </div>
          </div>
          {/* Owner Analyst - only for Universe tab - 2 columns */}
          {stage === 'universe' && (
            <div className="col-span-2 truncate">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Owner:</span>
                <span className="text-sm font-medium">
                  {lead.createdByUser
                    ? `${lead.createdByUser.firstName || ''} ${lead.createdByUser.lastName || ''}`.trim() ||
                      lead.createdByUser.email
                    : 'Unassigned'}
                </span>
              </div>
            </div>
          )}

          
          {/* Assigned To - 2 columns (Universe) or 3 columns (other stages) */}
{/* Assigned To - 2 columns (Universe) or 3 columns (other stages) */}
          <div className={stage === 'universe' ? 'col-span-2' : 'col-span-3'}>
            {(assignedToUser || (assignedInternUsers && assignedInternUsers.length > 0)) ? (
              <div className="flex flex-col gap-1">
                {/* Direct Display of Assignees */}
                <div className="flex flex-col text-xs">
                  <div className="font-medium text-foreground">
                    {assignedToUser ? `${assignedToUser.firstName} ${assignedToUser.lastName}` : "—"}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    {assignedPartnerUser ? `${assignedPartnerUser.firstName} ${assignedPartnerUser.lastName}` : "—"}
                  </div>
                </div>

                {(['admin', 'analyst'].includes(currentUser.role)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReassignClick}
                    data-testid={`button-reassign-${lead.id}`}
                    className="h-5 text-xs px-2 w-fit"
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Reassign
                  </Button>
                )}
              </div>
            ) : currentUser.role === 'admin' ? (              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAssignClick}
                data-testid={`button-assign-${lead.id}`}
                className="h-6 text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                Assign
              </Button>
            ) : null}
          </div>
          
          {/* Reject Button for Universe - 1 column */}
          {stage === "universe" && !["won", "lost"].includes(lead.stage) && (
            <div className="col-span-1 flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3 mr-1" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="z-[9999] min-w-[220px] rounded-md border border-gray-200 bg-gray-50 p-1 text-foreground shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                  onClick={(e) => e.stopPropagation()}
                >


                  {/* Stage-specific manage actions based on the LEAD's actual stage */}
                  {lead.stage === "outreach" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "pitching" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/pitching/${lead.id}`);
                        }}
                      >
                        Manage Pitching
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "mandates" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}



                  {/* ✅ Move targets */}
                  {getMoveTargets(lead.stage).map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStage?.(lead.id, target);
                      }}
                      disabled={!onMoveToStage}
                    >
                      Move to {MOVE_STAGE_LABEL[target]}
                    </DropdownMenuItem>
                  ))}

                  {/* ✅ Reject (hide if already rejected) */}
                  {lead.stage !== "rejected" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>

              </DropdownMenu>
            </div>
          )}
          
          {/* Actions - 2 columns (non-Universe stages only) */}
          <div className={`${stage !== 'universe' ? 'col-span-2 flex justify-end gap-2' : 'hidden'}`}>
            {/* {stage === 'qualified' && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => {
                  // Handle move to outreach
                  if (onMoveToOutreach) {
                    onMoveToOutreach(lead.id);
                  }
                }}
                data-testid={`button-move-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Move to Outreach
              </Button>
            )} */}
            {/* {stage === 'outreach' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Handle manage outreach
                    if (onManageOutreach) {
                      onManageOutreach(lead.id);
                    }
                  }}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {stage === 'outreach' ? 'Manage Outreach' : 'Manage Pitching'}
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    // Handle move to pitching
                    if (onMoveToPitching) {
                      onMoveToPitching(lead.id);
                    }
                  }}
                  data-testid={`button-move-pitching-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Pitching
                </Button>
              </>
            )} */}
            {/* {stage === 'pitching' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Handle manage outreach
                    if (onManageOutreach) {
                      onManageOutreach(lead.id);
                    }
                  }}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <Users className="h-3 w-3 mr-1" />
                  {stage === 'pitching' ? 'Manage Pitching' : 'Manage Outreach'}
                
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    // Handle move to mandates
                    if (onMoveToMandates) {
                      onMoveToMandates(lead.id);
                    }
                  }}
                  data-testid={`button-move-mandates-${lead.id}`}
                  className="h-6 text-xs"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Mandates
                </Button>
              </>
            )} */}
            {/* {stage === 'mandates' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  // Handle manage outreach
                  if (onManageOutreach) {
                    onManageOutreach(lead.id);
                  }
                }}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="h-6 text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Manage Outreach
              </Button>
            )} */}
            
            {/* Reject Button - visible on all stages except rejected, won, lost */}
            {/* Hold/Dropped/Rejected tab: allow moving to stages */}
            {/* {(stage === "hold" || stage === "dropped" || stage === "rejected") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs" data-testid={`button-move-from-hold-${lead.id}`}>
                    Move To
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-50">
                  <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "qualified")}>Qualified</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "outreach")}>Outreach</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "pitching")}>Pitching</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "mandates")}>Mandates</DropdownMenuItem>
                    {stage === "rejected" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "hold")}>Hold</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMoveToStage?.(lead.id, "dropped")}>Dropped</DropdownMenuItem>
                      </>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            )} */}
            

            {/* Reject dropdown - visible on all stages except rejected, won, lost */}
            {!["won", "lost"].includes(lead.stage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    data-testid={`button-reject-${lead.id}`} // keep testid if you already use it
                  >
                    <MoreHorizontal className="h-3 w-3 mr-1" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="z-[9999] min-w-[220px] rounded-md border border-gray-200 bg-gray-50 p-1 text-foreground shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                  onClick={(e) => e.stopPropagation()}
                >



                                      {/* Stage-specific manage actions based on the LEAD's actual stage */}
                  {lead.stage === "outreach" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "pitching" && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // OLD: onManageOutreach?.(lead.id);
                        // NEW:
                        setLocation(`/pitching/${lead.id}`); // ✅ Navigate to Dashboard
                      }}
                    >
                      Manage Pitching
                    </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "mandates" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}





                  {/* ✅ Move targets */}
                  {getMoveTargets(lead.stage).map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStage?.(lead.id, target);
                      }}
                      disabled={!onMoveToStage}
                    >
                      Move to {MOVE_STAGE_LABEL[target]}
                    </DropdownMenuItem>
                  ))}

                  {/* ✅ Reject (hide if already rejected) */}
                  {lead.stage !== "rejected" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>

              </DropdownMenu>
            )}
          </div>
        </div>


        {/* Mobile Stacked Layout (smaller than lg) */}
        <div className="lg:hidden space-y-3">
          {/* Company Name and POC Status */}
          <div className="flex items-start gap-2">
             {/* ✅ NEW: Dropdown Chevron Button (Mobile) */}
             <div 
              className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 hover:bg-blue-100 cursor-pointer transition-colors flex-shrink-0 mt-0.5"
              onClick={handleCompanyClick}
            >
               <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-600" : ""}`} />
            </div>

            <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCompanyClick}
                  className="text-base font-semibold hover:underline focus:outline-none focus:underline text-foreground text-left truncate max-w-full"
                  data-testid={`button-company-${lead.id}`}
                >
                  {company.name}
                </button>


                {/* ✅ AGING WARNING ICON */}
{aging && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`cursor-help flex-shrink-0 ml-1.5 ${aging.color}`}>
          <AlertCircle className="h-4 w-4 animate-pulse" />
        </div>
      </TooltipTrigger>
<TooltipContent
  className={`border shadow-md p-2 z-[9999] ${
    aging.days >= 30
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-white"
  }`}
>
  <p
    className={`font-bold text-xs uppercase tracking-tight ${
      aging.days >= 30 ? "text-red-700" : "text-foreground"
    }`}
  >
    {aging.label}
  </p>
  <p
    className={`text-[10px] italic mt-0.5 ${
      aging.days >= 30 ? "text-red-600" : "text-muted-foreground"
    }`}
  >
    This deal has been in {currentStageDisplay} for {aging.days} days.
  </p>
</TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}

                {/* External Link (Mobile) moved here or kept separate as per your preference */}
                 {company.website && (
                  <a 
                    href={toSafeUrl(company.website)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-blue-600 flex-shrink-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
            </div>

              {/* 2. EXTERNAL LINK (Mobile) */}
                {company.website && (
                  <a 
                    href={toSafeUrl(company.website)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-blue-600 flex-shrink-0 cursor-pointer"
                    // ✅ FIX: Only stop propagation. Do NOT prevent default.
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}


            <Badge 
              variant={getContactStatusBadgeVariant()}
              className="text-xs flex-shrink-0"
              data-testid={`badge-poc-status-${lead.id}`}
            >
              {getContactStatusText()}
            </Badge>

            {temperatureLabel && (
              <Badge
                variant={temperatureRaw === "hot" ? "destructive" : "warning"}
                className="text-xs flex-shrink-0"
                data-testid={`badge-temperature-${lead.id}`}
              >
                {temperatureLabel}
              </Badge>
            )}

          </div>


          {/* Sector and Status Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {company.sector || 'Not specified'}
              {leadLocation ? ` • ${leadLocation}` : ""}
            </span>
            {stage === 'universe' && (
              <Badge variant={stageConfig[lead.stage as keyof typeof stageConfig]?.color || 'secondary'} data-testid={`badge-lead-stage-mobile-${lead.id}`}>
                {stageConfig[lead.stage as keyof typeof stageConfig]?.label || lead.stage}
              </Badge>
            )}
          </div>


          {/* Owner Row - only for Universe tab */}
          {stage === 'universe' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Owner:</span>
              <span className="text-sm font-medium">
                {lead.createdByUser
                  ? `${lead.createdByUser.firstName || ''} ${lead.createdByUser.lastName || ''}`.trim() ||
                    lead.createdByUser.email
                  : 'Unassigned'}
              </span>
            </div>
          )}



          {/* Assigned To Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Assigned to:</span>
            {(assignedToUser || assignedPartnerUser ||  (assignedInternUsers && assignedInternUsers.length > 0)) ? (
              <>
              <AssigneesDropdown />
                {(['admin', 'analyst'].includes(currentUser.role)) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReassignClick}
                    data-testid={`button-reassign-${lead.id}`}
                    className="h-6 text-xs px-2"
                  >
                    <UserX className="h-3 w-3 mr-1" />
                    Reassign
                  </Button>
                )}
              </>
            ) : currentUser.role === 'admin' ? (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAssignClick}
                data-testid={`button-assign-${lead.id}`}
                className="h-6 text-xs"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                Assign
              </Button>
            ) : null}
          </div>


          {/* Action Buttons Row */}
          <div className="flex gap-2 flex-wrap">
            {/* {stage === 'qualified' && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onMoveToOutreach && onMoveToOutreach(lead.id)}
                data-testid={`button-move-outreach-${lead.id}`}
                className="flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Move to Outreach
              </Button>
            )} */}
            {/* {stage === 'outreach' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="flex-1"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Manage Outreach
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onMoveToPitching && onMoveToPitching(lead.id)}
                  data-testid={`button-move-pitching-${lead.id}`}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Pitching
                </Button>
              </>
            )} */}
            {/* {stage === 'pitching' && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onManageOutreach && onManageOutreach(lead.id)}
                  data-testid={`button-manage-outreach-${lead.id}`}
                  className="flex-1"
                >
                  <Users className="h-3 w-3 mr-1" />
                  Manage Pitching
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onMoveToMandates && onMoveToMandates(lead.id)}
                  data-testid={`button-move-mandates-${lead.id}`}
                  className="flex-1"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Move to Mandates
                </Button>
              </>
            )} */}
            {stage === 'mandates' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openManageOutreachPage}
                data-testid={`button-manage-outreach-${lead.id}`}
                className="flex-1"
              >
                <Users className="h-3 w-3 mr-1" />
                Manage Outreach
              </Button>
            )}

            
            {/* Reject dropdown - visible on all stages except rejected, won, lost */}
              {!["won", "lost"].includes(lead.stage) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1" data-testid={`button-reject-${lead.id}`}>
                      <XCircle className="h-3 w-3 mr-1" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="z-[9999] min-w-[220px] rounded-md border border-gray-200 bg-gray-50 p-1 text-foreground shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
                  onClick={(e) => e.stopPropagation()}
                >

                  {/* Stage-specific manage actions based on the LEAD's actual stage */}
                  {lead.stage === "outreach" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "pitching" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageOutreach?.(lead.id);
                        }}
                        disabled={!onManageOutreach}
                      >
                        Manage Pitching
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {lead.stage === "mandates" && (
                    <>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          openManageOutreachPage();
                        }}
                      >
                        Manage Outreach
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* ✅ Move targets */}
                  {getMoveTargets(lead.stage).map((target) => (
                    <DropdownMenuItem
                      key={target}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToStage?.(lead.id, target);
                      }}
                      disabled={!onMoveToStage}
                    >
                      Move to {MOVE_STAGE_LABEL[target]}
                    </DropdownMenuItem>
                  ))}

                  {/* ✅ Reject (hide if already rejected) */}
                  {lead.stage !== "rejected" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRejectDialogOpen(true);
                        }}
                      >
                        Reject
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>

                </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>


{isExpanded && (
  <CardContent className="pt-0">
    <div className="space-y-5">
      <div className="border-t pt-4 space-y-5">
        {/* TOP SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)] gap-4">
          {/* LEFT 75% AREA */}
          <div className="rounded-xl border bg-white p-4 space-y-4">
            {/* Business Description */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Business Description
              </div>
              <div className="text-sm whitespace-pre-wrap break-words leading-6">
                {(company as any).businessDescription
                  ? String((company as any).businessDescription)
                  : "Not set"}
              </div>
            </div>

            {/* Website + AI/Drive row */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <div className="text-sm min-w-0">
                <span className="text-muted-foreground mr-2">Website:</span>
                {company.website ? (
                  <a
                    href={toSafeUrl(company.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1 break-all"
                  >
                    {company.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="font-medium">Not set</span>
                )}
              </div>

              {(lead as any).chatgptLink && String((lead as any).chatgptLink).trim() && (
                <a
                  href={toSafeUrl(String((lead as any).chatgptLink))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 px-2 py-1 rounded border border-emerald-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>AI/Drive Resource</span>
                </a>
              )}
            </div>

            {/* Financial Info */}
            <div className="border-t pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Financial Info (₹ Cr)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Revenue</div>
                  <div className="font-semibold">
                    {(company as any).revenueInrCr || (lead as any).revenue || "Not set"}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">EBITDA</div>
                  <div className="font-semibold">
                    {(company as any).ebitdaInrCr || (lead as any).ebitda || "Not set"}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">PAT</div>
                  <div className="font-semibold">
                    {(company as any).patInrCr || (lead as any).pat || "Not set"}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {/* Card Next Action */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Card Next Action
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border cursor-pointer hover:bg-muted bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        const input = cardNextActionDateInputRef.current;
                        if (!input) return;

                        if (typeof input.showPicker === "function") {
                          input.showPicker();
                        } else {
                          input.click();
                        }
                      }}
                      title="Select due date"
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <input
                      ref={cardNextActionDateInputRef}
                      type="date"
                      value={cardNextActionDate}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        setCardNextActionDate(newDate);
                        setHasCardNextActionChanges(true);
                        saveCardNextActionMutation.mutate({
                          cardNextActionText,
                          cardNextActionDate: newDate,
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                  </div>

                  {saveCardNextActionMutation.isPending && (
                    <span className="text-[11px] text-muted-foreground">Saving...</span>
                  )}
                </div>
              </div>

              <Textarea
                value={cardNextActionText}
                onChange={(e) => {
                  setCardNextActionText(e.target.value);
                  setHasCardNextActionChanges(true);
                }}
                onBlur={() => {
                  const originalText = (lead as any).cardNextActionText || "";
                  const originalDate = (lead as any).cardNextActionDate
                    ? new Date((lead as any).cardNextActionDate).toISOString().slice(0, 10)
                    : "";

                  if (
                    hasCardNextActionChanges &&
                    (cardNextActionText !== originalText || cardNextActionDate !== originalDate)
                  ) {
                    saveCardNextActionMutation.mutate({
                      cardNextActionText,
                      cardNextActionDate,
                    });
                    setHasCardNextActionChanges(false);
                  }
                }}
                placeholder="Add card-level next action..."
                className="min-h-[90px] resize-none"
                onClick={(e) => e.stopPropagation()}
              />

              {cardNextActionDate && (
                <div className="text-xs text-muted-foreground">
                  Due: {new Date(cardNextActionDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              )}

              {cardNextActionDate && (
                <button
                  type="button"
                  className="text-xs text-red-500 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCardNextActionDate("");
                    setHasCardNextActionChanges(true);
                    saveCardNextActionMutation.mutate({
                      cardNextActionText,
                      cardNextActionDate: "",
                    });
                  }}
                >
                  Clear date
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="border-t pt-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status / Notes
              </div>

              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setHasChanges(true);
                }}
                onBlur={() => {
                  if (hasChanges && notes !== (lead.notes || "")) {
                    saveNotesMutation.mutate(notes);
                    setHasChanges(false);
                  }
                }}
                placeholder="Add internal notes..."
                className="min-h-[90px] resize-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* RIGHT 25% AREA — SOLUTION NOTE */}
          <div
            className="rounded-xl border bg-white p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Solution Note
              </div>
              {(uploadSolutionPdfMutation.isPending || saveSolutionLinksMutation.isPending) && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white hover:bg-gray-100 rounded-md border cursor-pointer w-fit">
                <Upload className="h-4 w-4" />
                <span>Upload PDF</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleSolutionPdfUpload}
                />
              </label>

              {leadSolutionNote?.pdfName && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSolutionPdfAction("preview");
                    }}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Preview
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSolutionPdfAction("download");
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </>
              )}
            </div>

            {leadSolutionNote?.pdfName && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {leadSolutionNote.pdfName}
              </p>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Solution Note Links
              </label>

              <input
                type="url"
                value={solutionLinkInput}
                placeholder="Paste solution note link here..."
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                onChange={(e) => setSolutionLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSolutionLink(solutionLinkInput);
                  }
                }}
                onBlur={() => {
                  if (solutionLinkInput.trim()) {
                    handleAddSolutionLink(solutionLinkInput);
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData("text");
                  if (pasted?.trim()) {
                    e.preventDefault();
                    setSolutionLinkInput(pasted);
                    window.setTimeout(() => {
                      handleAddSolutionLink(pasted);
                    }, 0);
                  }
                }}
              />

              {Array.isArray(leadSolutionNote?.links) && leadSolutionNote.links.length > 0 && (
                <div className="space-y-2">
                  {leadSolutionNote.links.map((link) => (
                    <div
                      key={link}
                      className="flex items-center justify-between gap-2 rounded border bg-white px-3 py-2"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link2 className="h-4 w-4 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSolutionLink(link);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4">
          {/* WORKSPACE LEFT — EXPANDED */}
          <div className="min-w-0">
            <LeadCardStageWorkspace
              leadId={lead.id}
              stage={lead.stage}
              companyName={company.name}
            />
          </div>

          {/* RIGHT ACTION RAIL — KEEP AS IS */}
          <div className="w-full rounded-xl border p-3 bg-gray-50 dark:bg-zinc-900 space-y-3">
            {/* Quick Actions Block */}
            <div>
              <div className="text-xs text-muted-foreground mb-3">Quick Actions:</div>
              <div className="grid grid-cols-6 gap-1">
                {(() => {
                  const allContacts =
                    (lead as any).contacts && (lead as any).contacts.length > 0
                      ? (lead as any).contacts
                      : contact
                      ? [contact]
                      : [];

                  return (
                    <>
                      <ContactAction
                        icon={Phone}
                        label="Phone"
                        contacts={allContacts}
                        field="phone"
                        action={(val) => (window.location.href = `tel:${val}`)}
                      />

                      <ContactAction
                        icon={Mail}
                        label="Email"
                        contacts={allContacts}
                        field="email"
                        action={(val) => (window.location.href = `mailto:${val}`)}
                      />

                      <ContactAction
                        icon={Linkedin}
                        label="LinkedIn"
                        contacts={allContacts}
                        field="linkedinProfile"
                        action={(val) => window.open(toSafeUrl(val), "_blank")}
                      />
                    </>
                  );
                })()}

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Open Task Chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("https://chat.google.com/app/chat/AAAAeRXuqCs", "_blank");
                  }}
                >
                  <CheckSquare className="h-4 w-4 text-green-600" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Open Google Calendar"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("https://calendar.google.com/", "_blank");
                  }}
                >
                  <Calendar className="h-4 w-4 text-orange-500" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Open Google Chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("https://chat.google.com/", "_blank");
                  }}
                >
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                className={leadActionButtonClass}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(lead.id);
                }}
                data-testid={`button-edit-lead-${lead.id}`}
              >
                <Edit className="h-4 w-4 shrink-0" />
                <span>EDIT LEADS</span>
              </Button>

              {["universe", "qualified", "outreach", "pitching", "mandates"].includes(stage) && (
                <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-3">
                  <Button
                    className={leadActionButtonClass}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/investor-outreach/${lead.id}`);
                    }}
                    data-testid={`button-investor-outreach-${lead.id}`}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>INVESTOR OUTREACH</span>
                  </Button>

                  {linkedInvestors.length > 0 && (
                    <div className="pt-3 border-t border-dashed border-gray-300">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                        Linked Investors ({linkedInvestors.length})
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {linkedInvestors.map((inv) => (
                          <Badge
                            key={inv.id}
                            variant="outline"
                            className="cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all text-[10px] py-0.5 px-2 bg-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvestorClick(inv);
                            }}
                          >
                            {inv.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 space-y-3">
                <Button
                  className={leadActionButtonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/leads/${lead.id}/epn`);
                  }}
                  data-testid={`button-manage-network-partners-${lead.id}`}
                >
                  <Users className="h-4 w-4 shrink-0" />
                  <span>MANAGE NETWORK PARTNERS</span>
                </Button>

                {linkedEpns.length > 0 && (
                  <div className="pt-3 border-t border-dashed border-gray-300">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Linked Network Partners ({linkedEpns.length})
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {linkedEpns.map((epn) => (
                        <Badge
                          key={epn.id}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all text-[10px] py-0.5 px-2 bg-white shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEpnClick(epn);
                          }}
                        >
                          {epn.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </CardContent>
)}

    </Card>

    {/* Reject Lead Dialog */}
    <RejectLeadDialog
      open={isRejectDialogOpen}
      onOpenChange={setIsRejectDialogOpen}
      leadId={lead.id}
      companyName={company.name}
      currentStage={lead.stage}
      onSuccess={() => {
        setIsRejectDialogOpen(false);
        onReject?.();
      }}
    />

     {/* ✅ PITCHING TRACKER DIALOG */}
    <PitchingTrackerDialog 
      open={showPitchingDialog} 
      onOpenChange={setShowPitchingDialog} 
      leadId={lead.id} 
      companyName={company.name} 
    />

    </>
  );
}
