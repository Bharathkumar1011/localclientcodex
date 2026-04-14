import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Briefcase, Linkedin, Edit, Globe2, Building2, Save, X, MessageSquare, Calendar, MessageCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { EpnPartnerRow } from "./EpnUniverseTable";
import { useLocation } from "wouter";

type Props = {
  partner: EpnPartnerRow;
};

type LinkedLead = {
  id: number;
  name: string;
  stage?: string | null;
};

// Helper to clean phone numbers for WhatsApp
const formatWhatsApp = (num: string) => num.replace(/\D/g, '');

export default function EpnCard({ partner }: Props) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Track if we are in edit mode
  const [isEditing, setIsEditing] = useState(false);
  
  // Local form state for inline editing
  const [form, setForm] = useState<EpnPartnerRow>(partner);

  const [cardNextActionText, setCardNextActionText] = useState((partner as any).cardNextActionText || "");
  const [hasCardNextActionChanges, setHasCardNextActionChanges] = useState(false);
  const [cardNextActionDate, setCardNextActionDate] = useState(
    (partner as any).cardNextActionDate
      ? new Date((partner as any).cardNextActionDate).toISOString().slice(0, 10)
      : ""
  );
  const cardNextActionDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCardNextActionText((partner as any).cardNextActionText || "");
    setCardNextActionDate(
      (partner as any).cardNextActionDate
        ? new Date((partner as any).cardNextActionDate).toISOString().slice(0, 10)
        : ""
    );
    setHasCardNextActionChanges(false);
    setForm(partner);
  }, [partner]);

  const isIdfc = partner.bucket === "idfc";

  const { data: linkedLeads = [] } = useQuery<LinkedLead[]>({
    queryKey: [`/epn/${partner.id}/linked-leads`],
    enabled: !!partner.id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/epn/${partner.id}/linked-leads`);
      const data = await res.json();

      return (data || []).map((row: any) => ({
        id: row.leadId ?? row.id,
        name:
          row.company?.name ||
          row.companyName ||
          row.name ||
          `Lead #${row.leadId ?? row.id}`,
        stage: row.stage ?? row.lead?.stage ?? "universe",
      }));
    },
  });

  const handleLeadClick = (lead: LinkedLead) => {
    const stageRoutes: Record<string, string> = {
      universe: "/universe",
      qualified: "/qualified",
      outreach: "/outreach",
      pitching: "/pitching",
      mandates: "/mandates",
      hold: "/hold",
      dropped: "/dropped",
      rejected: "/rejected",
      won: "/won",
      lost: "/lost",
    };

    const baseRoute = stageRoutes[(lead.stage || "").toLowerCase()] || "/universe";
    setLocation(`${baseRoute}?highlightLead=${lead.id}`);
  };

  // MUTATION: Save the changes to the database
  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/epn/${partner.id}`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/epn"] });
      setIsEditing(false); // Turn off edit mode on success
    },
  });

  const saveCardNextActionMutation = useMutation({
    mutationFn: async ({
      cardNextActionText,
      cardNextActionDate,
    }: {
      cardNextActionText: string;
      cardNextActionDate: string;
    }) => {
      const res = await apiRequest("PATCH", `/epn/${partner.id}/card-next-action`, {
        cardNextActionText,
        cardNextActionDate: cardNextActionDate || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "EPN next action updated" });
      setHasCardNextActionChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/epn"] });
    },
    onError: () => {
      toast({ title: "Failed to save EPN next action", variant: "destructive" });
    },
  });

  const handleChange = (field: keyof EpnPartnerRow, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getStageVariant = (stage: string) => {
    switch (stage) {
      case "outreach": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "active": return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case "rainmaking": return "bg-green-100 text-green-800 hover:bg-green-100";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50/80 via-white to-blue-50/80 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-900 p-6 border-b border-blue-100 dark:border-neutral-800 shadow-inner">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {isEditing ? (
              <input
                className="text-xl font-bold bg-white dark:bg-neutral-950 border border-blue-300 dark:border-blue-700 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-100 outline-none w-full max-w-md shadow-sm"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
              />
            ) : (
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {partner.name}
              </h3>
            )}
            
            <div className="flex gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold bg-white dark:bg-neutral-900 shadow-sm">
                {isIdfc ? "RM" : "Network Partner"}
              </Badge>
              <Badge className={`text-[10px] uppercase tracking-wider font-semibold ${getStageVariant(partner.stage)} border-0 shadow-sm`}>
                {partner.stage}
              </Badge>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
            <Building2 className="w-4 h-4" />
            {partner.category ? partner.category.replace("_", " ").toUpperCase() : "No Category Assigned"}
          </div>
        </div>

        {/* Content Body - 2 Columns Layout like LeadCard */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN: Contact & Location Details */}
          <div className="flex-1 space-y-6">
            
            {/* Contact Information */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Contact Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Designation */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <Briefcase className="w-3 h-3" /> Designation
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.designation || ""}
                      onChange={(e) => handleChange("designation", e.target.value)}
                      placeholder="e.g. Senior Partner"
                    />
                  ) : (
                    <div className="font-semibold text-sm">{partner.designation || "Not set"}</div>
                  )}
                </div>

                {/* Phone */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <Phone className="w-3 h-3" /> Phone
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.phoneNumber || ""}
                      onChange={(e) => handleChange("phoneNumber", e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  ) : (
                    <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">{partner.phoneNumber || "Not set"}</div>
                  )}
                </div>

                {/* Email */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <Mail className="w-3 h-3" /> Email
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="john@example.com"
                    />
                  ) : (
                    <div className="font-semibold text-sm text-foreground truncate" title={partner.email || ""}>{partner.email || "Not set"}</div>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <Linkedin className="w-3 h-3 text-[#0A66C2]" /> LinkedIn
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.linkedin || ""}
                      onChange={(e) => handleChange("linkedin", e.target.value)}
                      placeholder="https://linkedin.com/..."
                    />
                  ) : partner.linkedin ? (
                    <a href={partner.linkedin} target="_blank" rel="noreferrer" className="font-semibold text-sm text-blue-600 hover:underline">
                      View Profile ↗
                    </a>
                  ) : (
                    <div className="font-semibold text-sm text-muted-foreground">Not set</div>
                  )}
                </div>

              </div>
            </div>

            {/* Location Details */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">Location Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Zone */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <Globe2 className="w-3 h-3" /> Zone
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.zone || ""}
                      onChange={(e) => handleChange("zone", e.target.value)}
                      placeholder="e.g. North"
                    />
                  ) : (
                    <div className="font-semibold text-sm">{partner.zone || "Not set"}</div>
                  )}
                </div>

                {/* City */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <MapPin className="w-3 h-3" /> City
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.city || ""}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="City"
                    />
                  ) : (
                    <div className="font-semibold text-sm">{partner.city || "Not set"}</div>
                  )}
                </div>

                {/* State */}
                <div className="rounded border p-3 bg-white dark:bg-zinc-950 shadow-sm transition-all hover:border-blue-200">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-gray-100 dark:border-neutral-800 pb-1.5 mb-2">
                    <MapPin className="w-3 h-3" /> State
                  </div>
                  {isEditing ? (
                    <input
                      className="w-full border border-gray-200 dark:border-neutral-700 rounded-md px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 focus:border-blue-400 outline-none"
                      value={form.state || ""}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="State"
                    />
                  ) : (
                    <div className="font-semibold text-sm">{partner.state || "Not set"}</div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Sidebar Actions (Matches LeadCard) */}
          <div className="w-full lg:w-[280px] rounded border border-gray-200 dark:border-zinc-800 p-4 bg-gray-50 dark:bg-zinc-900 space-y-5 h-fit shadow-sm">
            
            {/* Quick Actions Bar */}
            <div>
              <div className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Quick Actions</div>
              <div className="grid grid-cols-5 gap-2">
                {partner.phoneNumber && (
                  <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 bg-white" onClick={() => window.open(`tel:${partner.phoneNumber}`)} title="Call">
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
                {partner.email && (
                  <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 bg-white" onClick={() => window.open(`mailto:${partner.email}`)} title="Email">
                    <Mail className="w-4 h-4" />
                  </Button>
                )}
                {partner.linkedin && (
                  <Button variant="outline" size="icon" className="h-8 w-8 text-[#0A66C2] bg-white" onClick={() => window.open(partner.linkedin, '_blank')} title="LinkedIn">
                    <Linkedin className="w-4 h-4" />
                  </Button>
                )}
                {partner.phoneNumber && (
                  <Button variant="outline" size="icon" className="h-8 w-8 text-emerald-600 bg-white" onClick={() => window.open(`https://wa.me/${formatWhatsApp(partner.phoneNumber)}`, '_blank')} title="WhatsApp">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 bg-white" onClick={() => window.open('https://chat.google.com/', '_blank')} title="Google Chat">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 text-orange-500 bg-white" onClick={() => window.open('https://calendar.google.com/calendar/u/0/r/eventedit', '_blank')} title="Google Calendar">
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-zinc-800 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  Card Next Action
                </div>
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
                  const originalText = (partner as any).cardNextActionText || "";
                  const originalDate = (partner as any).cardNextActionDate
                    ? new Date((partner as any).cardNextActionDate).toISOString().slice(0, 10)
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


            {/* Edit / Save Actions */}
            {/* Edit / Save Actions */}
            <div className="border-t border-gray-200 dark:border-zinc-800 pt-4">
              {isEditing ? (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setForm(partner); // Reset form
                      setIsEditing(false);
                    }}
                    className="w-full bg-white hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-cyan-100/80 hover:bg-cyan-200/80 text-cyan-900 font-semibold shadow-sm transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/epn/edit/${partner.id}`);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  EDIT DETAILS
                </Button>
              )}
            </div>

            {linkedLeads.length > 0 && (
              <div className="border-t border-gray-200 dark:border-zinc-800 pt-4 mt-4">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Linked Leads ({linkedLeads.length})
                </label>

                <div className="flex flex-wrap gap-2">
                  {linkedLeads.map((lead) => (
                    <Badge
                      key={lead.id}
                      variant="outline"
                      className="cursor-pointer hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-all text-[11px] py-1 px-2 bg-white shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeadClick(lead);
                      }}
                    >
                      {lead.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}