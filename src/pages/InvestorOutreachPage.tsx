import { useParams, useLocation } from "wouter";
import { Fragment, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Loader2, 
  ChevronDown, 
  Plus, 
  Mail, 
  Linkedin, 
  Calendar, 
  MessageSquare,
  Building2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import InvestorPocWorkspace from "@/components/manageinvestoroutreach/InvestorPocWorkspace";

// Status Configuration
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  yet_to_contact: { label: "Yet to contact", color: "bg-blue-100 text-blue-800" },
  positive: { label: "Positive", color: "bg-green-100 text-green-800" },
  hold: { label: "Hold", color: "bg-yellow-100 text-yellow-800" },
  no_response: { label: "No Response", color: "bg-gray-100 text-gray-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  dropped: { label: "Dropped", color: "bg-red-600 text-white" },
};

export default function InvestorOutreachPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Handle various route parameter names (id, leadId, etc.)
  const leadId = Number(params.id || params.leadId || params.investorId);

  const [expandedInvestorIds, setExpandedInvestorIds] = useState<Set<number>>(new Set());

  const toggleInvestorExpansion = (investorId: number) => {
    setExpandedInvestorIds((prev) => {
      const next = new Set(prev);
      if (next.has(investorId)) {
        next.delete(investorId);
      } else {
        next.add(investorId);
      }
      return next;
    });
  };

  // 1. Fetch Lead Details (for the header)
  const { data: lead } = useQuery({
    queryKey: ["/leads", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}`);
      return res.json();
    },
    enabled: !!leadId
  });

  // 2. Fetch Linked Investors
  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["/leads/linked-investors", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/linked-investors`);
      return res.json();
    },
    enabled: !!leadId
  });

  // 3. Mutation: Update Status
  const statusMutation = useMutation({
    mutationFn: async ({ investorId, status }: { investorId: number; status: string }) => {
      await apiRequest("PATCH", `/investors/${investorId}/linked-leads/${leadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
      toast({ title: "Status Updated" });
    },
  });

  // 4. Mutation: Update Remarks
  const remarksMutation = useMutation({
    mutationFn: async ({ investorId, remarks }: { investorId: number; remarks: string }) => {
      await apiRequest("PATCH", `/leads/${leadId}/investors/${investorId}/remarks`, { remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
      toast({ title: "Remarks Saved" });
    },
  });

  // 5. Mutation: Update Row-Level Next Action
  const nextActionMutation = useMutation({
    mutationFn: async ({
      investorId,
      nextActionText,
      nextActionAt,
    }: {
      investorId: number;
      nextActionText: string | null;
      nextActionAt: string | null;
    }) => {
      await apiRequest(
        "PATCH",
        `/leads/${leadId}/investors/${investorId}/next-action`,
        { nextActionText, nextActionAt }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
      toast({ title: "Next Action Saved" });
    },
  });

  // 6. Quick Action Helpers
  const openEmail = (email?: string) => {
    if (!email) return toast({ title: "No Email", description: "This investor has no primary email.", variant: "destructive" });
    window.open(`mailto:${email}`, "_blank");
  };

  const openLinkedIn = (url?: string) => {
    if (!url) return toast({ title: "No LinkedIn", description: "This investor has no LinkedIn URL.", variant: "destructive" });
    window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
  };

  const openCalendar = (investorName: string) => {
    const title = encodeURIComponent(`Meeting with ${investorName}`);
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}`, "_blank");
  };

  const openChat = (email?: string) => {
      if (!email) return toast({ title: "No Email for Chat", description: "Need an email to open Google Chat.", variant: "destructive" });
      window.open(`https://chat.google.com/dm/${email}`, "_blank");
    };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!leadId) {
     return <div className="p-6">Invalid Lead ID</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investor Outreach</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
               <Building2 className="h-4 w-4" />
               <span>Target: </span>
               <span className="font-semibold text-foreground">
                 {lead?.company?.name || "Loading..."}
               </span>
            </div>
          </div>
        </div>
        <Button onClick={() => setLocation(`/leads/${leadId}/link-investors`)}>
          <Plus className="mr-2 h-4 w-4" />
          Link New Investor
        </Button>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Investors ({investors.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Investor Details</TableHead>
                <TableHead className="w-[200px]">Status</TableHead>
                <TableHead className="min-w-[260px]">Next Action</TableHead>
                <TableHead className="min-w-[260px]">Remarks</TableHead>
                <TableHead className="w-[200px] text-right">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                       <p>No investors linked yet.</p>
                       <Button variant="ghost" className="text-primary hover:underline" onClick={() => setLocation(`/leads/${leadId}/link-investors`)}>
  Link your first investor
</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                investors.map((inv) => {
                  const currentStatus = STATUS_CONFIG[inv.status] || STATUS_CONFIG["yet_to_contact"];
                  const isExpanded = expandedInvestorIds.has(inv.id);
                  
                  // Use specific selected contacts, or fallback to primary
                  const displayContacts = inv.contacts && inv.contacts.length > 0 
                      ? inv.contacts 
                      : (inv.primaryPoc ? [inv.primaryPoc] : []);

                  // For actions, grab the first available contact
                  const actionPoc = displayContacts[0];

                  return (
                    <Fragment key={inv.id}>
                      <TableRow>
                        {/* Column 1: Investor Details */}
                        <TableCell>
                          <div className="font-semibold text-base">{inv.name}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {inv.investorType && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                {inv.investorType}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {inv.location || "No Location"}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {displayContacts.length > 0 ? displayContacts.map((c: any) => (
                              <div
                                key={c.id}
                                className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded border"
                              >
                                <span className="font-medium text-slate-700">{c.name}</span>
                                <span className="text-slate-500">({c.designation})</span>
                              </div>
                            )) : (
                              <span className="text-[10px] text-muted-foreground italic">No POC</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Column 2: Status Dropdown */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-between font-normal h-8"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${currentStatus.color.split(" ")[0]}`} />
                                  <span className="truncate text-xs">{currentStatus.label}</span>
                                </div>
                                <ChevronDown className="h-3 w-3 opacity-50" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[180px]">
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <DropdownMenuItem
                                  key={key}
                                  onClick={() => statusMutation.mutate({ investorId: inv.id, status: key })}
                                  className="cursor-pointer text-xs"
                                >
                                  <div className={`h-2 w-2 rounded-full mr-2 ${config.color.split(" ")[0]}`} />
                                  {config.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>

                        {/* Column 3: Next Action */}
                        <TableCell>
                          <NextActionInput
                            initialText={inv.nextActionText || ""}
                            initialDate={inv.nextActionAt || null}
                            onSave={({
                              nextActionText,
                              nextActionAt,
                            }: {
                              nextActionText: string | null;
                              nextActionAt: string | null;
                            }) =>
                              nextActionMutation.mutate({
                                investorId: inv.id,
                                nextActionText,
                                nextActionAt,
                              })
                            }
                          />
                        </TableCell>

                        {/* Column 4: Remarks */}
                        <TableCell>
                          <RemarkInput
                            initialValue={inv.remarks || ""}
                            onSave={(val) =>
                              remarksMutation.mutate({ investorId: inv.id, remarks: val })
                            }
                          />
                        </TableCell>

                        {/* Column 5: Quick Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => toggleInvestorExpansion(inv.id)}
                            >
                              Investor Manage Outreach
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title={isExpanded ? "Hide investor manage outreach" : "Open investor manage outreach"}
                              onClick={() => toggleInvestorExpansion(inv.id)}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Send Email"
                              onClick={() => openEmail(actionPoc?.email)}
                              disabled={!actionPoc?.email}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                              title="Open LinkedIn"
                              onClick={() => openLinkedIn(actionPoc?.linkedinProfile)}
                              disabled={!actionPoc?.linkedinProfile}
                            >
                              <Linkedin className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              title="Schedule Meeting"
                              onClick={() => openCalendar(inv.name)}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Google Chat"
                              onClick={() => openChat(actionPoc?.email)}
                              disabled={!actionPoc?.email}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/40">
                          <TableCell colSpan={5} className="p-4">
                            <InvestorPocWorkspace leadId={leadId} investorId={inv.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


  function NextActionInput({
  initialText,
  initialDate,
  onSave,
}: {
  initialText: string;
  initialDate: string | null;
  onSave: (payload: { nextActionText: string | null; nextActionAt: string | null }) => void;
}) {
  const safeInitialText = initialText || "";
  const safeInitialDate = initialDate
    ? new Date(initialDate).toISOString().slice(0, 10)
    : "";

  const [text, setText] = useState(safeInitialText);
  const [date, setDate] = useState(safeInitialDate);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(safeInitialText);
  }, [safeInitialText]);

  useEffect(() => {
    setDate(safeInitialDate);
  }, [safeInitialDate]);

  const handleSave = (nextText = text, nextDate = date) => {
    if (
      nextText !== safeInitialText ||
      nextDate !== safeInitialDate
    ) {
      onSave({
        nextActionText: nextText.trim() || null,
        nextActionAt: nextDate || null,
      });
    }
  };

  return (
    <div className="space-y-1">
      <div className="relative rounded-md border bg-white px-2.5 py-1.5 h-8 flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => handleSave()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Next action..."
          className="w-full bg-transparent pr-8 text-xs outline-none"
        />

        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          onClick={() => {
            const input = dateInputRef.current;
            if (!input) return;
            if ((input as any).showPicker) {
              (input as any).showPicker();
            } else {
              input.click();
            }
          }}
        >
          <Calendar className="h-4 w-4" />
        </button>

        <input
          ref={dateInputRef}
          type="date"
          value={date}
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          onChange={(e) => {
            const nextDate = e.target.value;
            setDate(nextDate);
            handleSave(text, nextDate);
          }}
        />
      </div>

      <div className="text-[10px] text-slate-500">
        {date
          ? `Due: ${new Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(date))}`
          : "No date selected"}
      </div>
    </div>
  );
}


// Helper Component for Remarks to handle local state & debounce
function RemarkInput({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) {

  // Ensure we fallback to an empty string if initialValue is null/undefined
  const safeInitialValue = initialValue || "";
  const [value, setValue] = useState(safeInitialValue);

  // Sync if initialValue updates from server (e.g. after refresh)
  useEffect(() => {
    setValue(safeInitialValue);
  }, [safeInitialValue]);

  // The function that triggers the save
  const handleSave = () => {
    if (value.trim() !== safeInitialValue.trim()) {
      onSave(value.trim());
    }
  };

  return (
    <Input
      className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-primary transition-all"
      placeholder="Add notes..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave} // <-- Auto-saves the exact moment you click away/exit the field
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur(); // Triggers the onBlur above to save immediately
        }
      }}
    />
  );
}
