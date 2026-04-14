import { useState , useEffect, useRef} from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  ExternalLink, 
  Phone,
  Mail,
  Linkedin,
  MapPin,
  ChevronDown,
  MoreHorizontal,
  Link as LinkIcon,
  Edit,
  Globe,
  Briefcase,
  PieChart,
  Copy,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Investor } from "@/lib/types";

// ✅ Added 'all' for the Database/Dashboard view
export type InvestorStage = "outreach" | "active" | "warm" | "dealmaking" | "rejected" | "all";

interface InvestorCardProps {
  investor: Investor;
  stage: InvestorStage; 
  
  onSectorToggle?: (investor: Investor, sector: string) => void;
  onManageLinks?: (investor: Investor) => void;
  onManagePOCs?: (investor: Investor) => void;
  onMoveToStage?: (investorId: number, targetStage: string) => void;
}

export default function InvestorCard({ 
  investor, 
  stage, 
  onSectorToggle,
  onManageLinks,
  onManagePOCs,
  onMoveToStage 
}: InvestorCardProps) {
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cardNextActionText, setCardNextActionText] = useState((investor as any).cardNextActionText || "");
  const [hasCardNextActionChanges, setHasCardNextActionChanges] = useState(false);
  const [cardNextActionDate, setCardNextActionDate] = useState(
    (investor as any).cardNextActionDate
      ? new Date((investor as any).cardNextActionDate).toISOString().slice(0, 10)
      : ""
  );
  const [mandateStatus, setMandateStatus] = useState((investor as any).mandateStatus || "");
  const cardNextActionDateInputRef = useRef<HTMLInputElement>(null);
  // --- NEW: Auto-expand and scroll logic ---
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCardNextActionText((investor as any).cardNextActionText || "");
    setCardNextActionDate(
      (investor as any).cardNextActionDate
        ? new Date((investor as any).cardNextActionDate).toISOString().slice(0, 10)
        : ""
    );
    setHasCardNextActionChanges(false);
    setMandateStatus((investor as any).mandateStatus || "");
  }, [investor.id, (investor as any).cardNextActionText, (investor as any).cardNextActionDate, (investor as any).mandateStatus]);

  const saveCardNextActionMutation = useMutation({
    mutationFn: async ({
      cardNextActionText,
      cardNextActionDate,
    }: {
      cardNextActionText: string;
      cardNextActionDate: string;
    }) => {
      await apiRequest("PATCH", `/investors/${investor.id}/card-next-action`, {
        cardNextActionText,
        cardNextActionDate: cardNextActionDate || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Investor next action updated" });
      setHasCardNextActionChanges(false);
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({ title: "Failed to save investor next action", variant: "destructive" });
    },
  });
  const saveMandateStatusMutation = useMutation({
    mutationFn: async (newValue: string) => {
      await apiRequest("PATCH", `/investors/${investor.id}`, {
        mandateStatus: newValue || null,
      });
    },
    onSuccess: () => {
      toast({ title: "Investor status updated" });
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({ title: "Failed to update investor status", variant: "destructive" });
      setMandateStatus((investor as any).mandateStatus || "");
    },
  });

  useEffect(() => {
    // Check if there is a 'highlight' parameter in the URL
    const params = new URLSearchParams(window.location.search);
    const highlightId = params.get("highlight");

    // If the ID matches this investor, expand and scroll into view
    if (highlightId && Number(highlightId) === investor.id) {
      setIsExpanded(true);
      
      // Small delay to ensure the DOM has rendered the expansion
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "center" 
        });
      }, 300);
    }
  }, [investor.id]);

  // Helper: Determine valid move targets
  const getMoveTargets = (currentStage: InvestorStage): string[] => {
    const allStages = ["outreach", "active", "warm", "dealmaking"];
    // ✅ If in 'all' (Database), allow moving to any specific stage
    if (currentStage === "all") return allStages;
    return allStages.filter(s => s !== currentStage);
  };


const resolveLeadId = (lead: any) => {
  const raw = lead?.leadId ?? lead?.id ?? lead?.lead_id;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
};

const handleOpenInvestorManageOutreach = (
  e?: { stopPropagation?: () => void }
) => {
  e?.stopPropagation?.();

  const rawLinkedLeads = Array.isArray((investor as any).linkedLeads)
    ? (investor as any).linkedLeads
    : [];

  const linkedLeads = rawLinkedLeads
    .map((l: any) => ({
      ...l,
      resolvedLeadId: resolveLeadId(l),
    }))
    .filter((l: any) => l.resolvedLeadId);

  console.log("Manage Outreach clicked", {
    investorId: investor.id,
    rawLinkedLeads,
    linkedLeads,
  });

  if (linkedLeads.length > 0) {
    setLocation(`/investor-outreach/${linkedLeads[0].resolvedLeadId}/${investor.id}`);
    return;
  }

  window.alert("No linked company found for this investor. Please link a company first.");
};


  const SECTOR_OPTIONS = [
    "Auto Components", "Building Materials", "Chemicals & Materials", "Consumer",
    "Defence", "Financial Services", "Healthcare", "Healthcare & Pharma", "HR",
    "Industrials", "IPP", "IT", "Logistics", "Others", "Pharma", "Renewables",
    "Specialty Chemicals", "Travel and Hospitality"
  ];

  const toSafeUrl = (u?: string | null) => {
    if (!u) return "";
    const s = String(u).trim();
    return s.startsWith("http") ? s : `https://${s}`;
  };

    const handleCopy = async (
    e: React.MouseEvent,
    value: string,
    successMessage: string
  ) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(value);
      toast({ title: successMessage });
    } catch {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const topContacts = (investor.contacts || [])
    .sort((a, b) => (b.isPrimary === a.isPrimary ? 0 : b.isPrimary ? 1 : -1))
    .slice(0, 3);

  // Helper for Middle Column
  const renderMiddleColumn = () => {
    // Outreach: Show Manage Button
if (stage === "outreach") {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleOpenInvestorManageOutreach}
    >
      Manage
    </Button>
  );
}

    // All other stages (including 'all'/Database): Show Linked Companies
    const linkedLeads = (investor as any).linkedLeads || [];
    if (linkedLeads.length > 0) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8" onClick={(e) => e.stopPropagation()}>
                        {linkedLeads.length} Companies{" "}
                        <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {linkedLeads.map((l: any) => (
                        <DropdownMenuItem key={l.leadId}>
                            {l.companyName}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return <span className="text-muted-foreground text-sm pl-2">—</span>;
  };

  return (
    <div 
      ref={cardRef} 
      className={`border rounded-lg transition-all duration-200 mb-2 ${isExpanded ? 'bg-indigo-50/30 border-indigo-200 shadow-sm' : 'bg-white hover:bg-gray-50'}`}
    >
      
      {/* --- Main Row --- */}
      <div className="grid grid-cols-12 items-center px-2 py-3">
        
        {/* 1. Name (4 Cols) */}
        <div 
            className="col-span-4 flex items-center gap-2 cursor-pointer group select-none"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 group-hover:bg-indigo-100 transition-colors">
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180 text-indigo-600" : ""}`} />
            </div>
            <span className="font-semibold text-sm truncate group-hover:text-primary group-hover:underline transition-colors">
                {investor.name}
            </span>
            {investor.website && (
                  <a 
                    href={toSafeUrl(investor.website)} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary ml-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
            )}
        </div>

        {/* 2. Sector (3 Cols) */}
        <div className="col-span-3 pr-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto py-1 px-2 w-full justify-between text-left font-normal border border-dashed text-muted-foreground hover:text-foreground bg-transparent bg-blue-50" onClick={(e) => e.stopPropagation()}>
                        <span className="truncate">
                            {investor.sector ? investor.sector : "Select Sector"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50 flex-shrink-0 ml-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] max-h-[300px] overflow-y-auto bg-cyan-50">
                    {SECTOR_OPTIONS.map((option) => {
                        const isSelected = (investor.sector || "").split(",").map(s => s.trim()).includes(option);
                        return (
                            <DropdownMenuItem 
                                key={option} 
                                onSelect={(e) => {
                                    e.preventDefault();
                                    onSectorToggle?.(investor, option);
                                }}
                            >
                                <Checkbox checked={isSelected} className="mr-2" />
                                {option}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {/* 3. Middle Column (3 Cols) */}
        <div className="col-span-3">
            {renderMiddleColumn()}
        </div>

        {/* 4. Actions (2 Cols) */}
        <div className="col-span-2 flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-cyan-50">
                    
                    {/* ✅ New: Edit Investor Details */}
                    <DropdownMenuItem onClick={() => setLocation(`/investors/${investor.id}/edit`)}>
                        <Edit className="h-3 w-3 mr-2" />
                        Edit Investor Details
                    </DropdownMenuItem>

                    {/* ✅ New: Link Companies Button */}
                    <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onManageLinks?.(investor);
                    }}>
                        <LinkIcon className="h-3 w-3 mr-2" />
                        Link Companies
                    </DropdownMenuItem>



                    <DropdownMenuItem onClick={() => onManagePOCs?.(investor)}>
                        View / Edit POCs
                    </DropdownMenuItem>
                    
                 {/* ✅ ONLY SHOW FOR OUTREACH STAGE */}
                  {stage === "outreach" && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInvestorManageOutreach();
                      }}
                    >
                      Manage Outreach Page
                    </DropdownMenuItem>
                  )}
                    <DropdownMenuSeparator />

                    <div className="px-2 py-1 text-xs text-muted-foreground font-semibold bg-blue-300">Move To:</div>
                    {getMoveTargets(stage).map((target) => (
                        <DropdownMenuItem 
                            key={target} 
                            onClick={() => onMoveToStage?.(investor.id, target)}
                            className="capitalize"
                        >
                            {target}
                        </DropdownMenuItem>
                    ))}
                    

                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      {/* --- Expanded Details --- */}
{/* --- Expanded Details --- */}
      {isExpanded && (
        <div ref={cardRef} className="px-4 pb-4 pt-1 border-t border-dashed border-indigo-100 bg-gray-50/50 animate-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col lg:flex-row gap-4 mt-3">
            
            {/* LEFT AREA: Info & Contacts (Takes up remaining space) */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Type & Website */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Briefcase className="h-3 w-3" /> Type
                    </span>
                    <p className="text-sm font-medium text-gray-900">
                      {(investor as any).investorType || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                      <Globe className="h-3 w-3" /> Website
                    </span>
                    {investor.website ? (
                      <a 
                        href={toSafeUrl(investor.website)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sm text-blue-600 hover:underline truncate block"
                      >
                        {investor.website}
                      </a>
                    ) : <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                </div>

                {/* Column 2: Sectors & Location */}
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                      <PieChart className="h-3 w-3" /> Sectors
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {investor.sector ? (
                        investor.sector.split(',').map((s, i) => (
                          <Badge key={i} variant="secondary" className="px-1.5 py-0 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                            {s.trim()}
                          </Badge>
                        ))
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                    {stage === "all" && (
                      <Badge variant="outline" className="capitalize text-[10px] h-5">
                        {investor.stage}
                      </Badge>
                    )}
                    <span className="text-sm flex items-center text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" /> {investor.location || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Contacts Section */}
              <div className="border-t border-dashed pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Key Contacts</h4>
                  {(investor.contacts?.length || 0) > 3 && (
                    <span className="text-xs text-indigo-600 cursor-pointer hover:underline" onClick={() => onManagePOCs?.(investor)}>
                      View all {investor.contacts!.length}
                    </span>
                  )}
                </div>
                
                {topContacts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {topContacts.map((poc) => (
                      <div key={poc.id} className="p-3 rounded-md border bg-white shadow-sm text-sm space-y-1">
                        <div className="font-medium truncate text-indigo-900" title={poc.name}>{poc.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{poc.designation || "-"}</div>
<div className="flex items-center gap-4 pt-2 mt-1 border-t">
  {poc.phone && (
    <div className="flex items-center gap-1.5">
      <a
        href={`tel:${poc.phone}`}
        className="text-muted-foreground hover:text-primary"
        onClick={(e) => e.stopPropagation()}
        title={`Call ${poc.phone}`}
      >
        <Phone className="h-3 w-3" />
      </a>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary"
        onClick={(e) => handleCopy(e, String(poc.phone), "Phone number copied")}
        title="Copy phone number"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )}

  {poc.email && (
    <div className="flex items-center gap-1.5">
      <a
        href={`mailto:${poc.email}`}
        className="text-muted-foreground hover:text-primary"
        onClick={(e) => e.stopPropagation()}
        title={`Email ${poc.email}`}
      >
        <Mail className="h-3 w-3" />
      </a>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary"
        onClick={(e) => handleCopy(e, String(poc.email), "Email copied")}
        title="Copy email"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )}

  {poc.linkedinProfile && (
    <div className="flex items-center gap-1.5">
      <a
        href={toSafeUrl(poc.linkedinProfile)}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:text-blue-800"
        onClick={(e) => e.stopPropagation()}
        title="Open LinkedIn"
      >
        <Linkedin className="h-3 w-3" />
      </a>
      <button
        type="button"
        className="text-muted-foreground hover:text-primary"
        onClick={(e) =>
          handleCopy(e, toSafeUrl(poc.linkedinProfile), "LinkedIn profile copied")
        }
        title="Copy LinkedIn profile"
      >
        <Copy className="h-3 w-3" />
      </button>
    </div>
  )}
</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic bg-gray-100/50 p-3 rounded text-center border border-dashed">
                    No contacts added. <span className="ml-1 text-indigo-600 cursor-pointer underline" onClick={() => onManagePOCs?.(investor)}>Add one?</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE BOX: Styled to match LeadCard exactly */}
            <div className="w-full lg:w-[260px] rounded border border-gray-200 p-3 bg-gray-100 dark:bg-zinc-900 space-y-3">
              
              
              <Button
                className="w-full bg-cyan-600 hover:bg-indigo-700 text-white shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/investors/${investor.id}/edit`);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                EDIT INVESTOR DETAILS
              </Button>

               <div className="border-t pt-3 space-y-3"></div>

              <Button
                variant="outline"
                className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onManageLinks?.(investor);
                }}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                LINK COMPANIES
              </Button>

                            <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Investor Status
                  </label>
                  {saveMandateStatusMutation.isPending && (
                    <span className="text-[11px] text-muted-foreground">Saving...</span>
                  )}
                </div>

                <select
                  value={mandateStatus}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setMandateStatus(newValue);
                    saveMandateStatusMutation.mutate(newValue);
                  }}
                  className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm dark:bg-zinc-800"
                  onClick={(e) => e.stopPropagation()}
                  disabled={saveMandateStatusMutation.isPending}
                >
                  <option value="">Select Status</option>
                  <option value="mandate">Mandate</option>
                  <option value="not_mandate">Not Mandate</option>
                </select>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Card Next Action
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border cursor-pointer hover:bg-muted bg-white dark:bg-zinc-800"
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
                    const originalText = (investor as any).cardNextActionText || "";
                    const originalDate = (investor as any).cardNextActionDate
                      ? new Date((investor as any).cardNextActionDate).toISOString().slice(0, 10)
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
                  className="min-h-[90px] resize-none bg-white dark:bg-zinc-800"
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

              {/* --- NEW: Linked Companies List --- */}
        {(investor as any).linkedLeads && (investor as any).linkedLeads.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-zinc-800">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Linked Companies ({(investor as any).linkedLeads.length})
            </label>
            <div className="flex flex-col gap-1.5">
              {(investor as any).linkedLeads.map((l: any) => (
                <div
                  key={l.leadId}
                  className="text-[11px] py-2 px-2 bg-white dark:bg-zinc-800 border border-gray-200 rounded-md hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-all truncate shadow-sm font-medium flex items-center justify-between group"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to the lead stage page (e.g., /pitching, /outreach)
                    const rawStage = String(l.stage || "").toLowerCase().trim();

                    // Map the stage name to the exact route path defined in your App.tsx
                    let stagePath = "/universe"; // Default fallback

                    if (rawStage === "qualified") stagePath = "/qualified";
                    else if (rawStage === "outreach") stagePath = "/outreach";
                    else if (rawStage === "pitching") stagePath = "/pitching";
                    else if (rawStage === "mandates") stagePath = "/mandates";
                    else if (rawStage === "hold") stagePath = "/hold";
                    else if (rawStage === "dropped") stagePath = "/dropped";
                    else if (rawStage === "rejected") stagePath = "/rejected";

                    // Navigate to the correct route with the highlight signal
                    setLocation(`${stagePath}?highlightLead=${l.leadId}`);
                  }}
                >
                  <span className="truncate">{l.companyName}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}