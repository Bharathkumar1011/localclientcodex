import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
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

type Lead = {
  id: number;
  stage?: string; // ✅ Added stage for routing
  company?: {     // ✅ Added nested company object
    name: string;
  };
  companyName?: string;
  name?: string;
};

// Status Configuration (Same as Investor Outreach)
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  yet_to_contact: { label: "Yet to contact", color: "bg-blue-100 text-blue-800" },
  positive: { label: "Positive", color: "bg-green-100 text-green-800" },
  hold: { label: "Hold", color: "bg-yellow-100 text-yellow-800" },
  no_response: { label: "No Response", color: "bg-gray-100 text-gray-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  dropped: { label: "Dropped", color: "bg-red-600 text-white" },
};

export default function ManageEpnPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const leadId = Number(params.id);

// 1. Fetch Lead Details (for the header)
const { data: lead } = useQuery<Lead>({
    // ✅ Ensure we are hitting the /api route correctly
    queryKey: [`/api/leads/${leadId}`], 
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}`);
      return res.json();
    },
    enabled: !!leadId
  });

  // 2. Fetch Linked Network Partners (EPNs)
  // This expects the updated backend endpoint that returns { ...epn, status, remarks }
  const { data: epns = [], isLoading } = useQuery<any[]>({
    queryKey: [`/epn/linked-to-lead/${leadId}`],
    enabled: !!leadId
  });

  // 3. Mutation: Update Status
  const statusMutation = useMutation({
    mutationFn: async ({ epnId, status }: { epnId: number; status: string }) => {
      await apiRequest("PATCH", `/epn/${epnId}/link-lead/${leadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/epn/linked-to-lead/${leadId}`] });
      toast({ title: "Status Updated" });
    },
  });

  // 4. Mutation: Update Remarks (Auto-save)
  const remarksMutation = useMutation({
    mutationFn: async ({ epnId, remarks }: { epnId: number; remarks: string }) => {
      await apiRequest("PATCH", `/epn/${epnId}/link-lead/${leadId}/remarks`, { remarks });
    },
    onSuccess: () => {
      toast({ title: "Remarks Saved" });
    },
  });

  // 5. Quick Action Helpers
  const openEmail = (email?: string) => {
    if (!email) return toast({ title: "No Email", description: "This partner has no email.", variant: "destructive" });
    window.open(`mailto:${email}`, "_blank");
  };

  const openLinkedIn = (url?: string) => {
    if (!url) return toast({ title: "No LinkedIn", description: "This partner has no LinkedIn URL.", variant: "destructive" });
    window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
  };

  const openChat = (email?: string) => {
    if (!email) return toast({ title: "No Email for Chat", description: "Need an email to open Google Chat.", variant: "destructive" });
    // This attempts to open a direct message in Google Chat with the provided email
    window.open(`https://chat.google.com/dm/${email}`, "_blank");
  };

  const openCalendar = (partnerName: string) => {
    const title = encodeURIComponent(`Meeting with ${partnerName}`);
    window.open(`https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}`, "_blank");
  };

  const getPartnerLabel = (bucket: string) => {
    return bucket === "idfc" ? "RM" : "Network Partner";
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

// ✅ Now correctly checks the nested company object first
  const companyName = lead?.company?.name || lead?.companyName || lead?.name || "Loading...";

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => {
              // ✅ Dynamically route back to the specific stage tab
              if (lead?.stage) {
                setLocation(`/${lead.stage}`);
              } else {
                setLocation('/dashboard'); // Fallback
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Network Partner Outreach</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
               <Building2 className="h-4 w-4" />
               <span>Target: </span>
               <span className="font-semibold text-foreground">
                 {companyName}
               </span>
            </div>
          </div>
        </div>
        <Button onClick={() => setLocation(`/leads/${leadId}/link-epn`)}>
          <Plus className="mr-2 h-4 w-4" />
          Link New Partner
        </Button>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Partners ({epns.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Partner Details</TableHead>
                <TableHead className="w-[200px]">Status</TableHead>
                <TableHead className="min-w-[300px]">Remarks</TableHead>
                <TableHead className="w-[200px] text-right">Quick Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {epns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                       <p>No network partners linked yet.</p>
                       <Button variant="ghost" className="text-primary hover:underline" onClick={() => setLocation(`/leads/${leadId}/link-epn`)}>
                          Link your first partner
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                epns.map((epn) => {
                  const currentStatus = STATUS_CONFIG[epn.status] || STATUS_CONFIG["yet_to_contact"];
                  
                  return (
                    <TableRow key={epn.id}>
                      {/* Column 1: EPN Details */}
                      <TableCell>
                        <div className="font-semibold text-base">{epn.name}</div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                {getPartnerLabel(epn.bucket)}
                            </Badge>
                            {epn.category && (
                                <span className="text-xs text-muted-foreground">
                                    • {epn.category}
                                </span>
                            )}
                        </div>
                        
                        {/* POC Info */}
                        <div className="flex flex-wrap gap-1 mt-2">
                           {epn.pocName ? (
                             <div className="flex items-center gap-1 text-[10px] bg-slate-100 px-2 py-0.5 rounded border">
                               <span className="font-medium text-slate-700">{epn.pocName}</span>
                               {epn.designation && <span className="text-slate-500">({epn.designation})</span>}
                             </div>
                           ) : (
                             <span className="text-[10px] text-muted-foreground italic">No specific POC added</span>
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
                                onClick={() => statusMutation.mutate({ epnId: epn.id, status: key })}
                                className="cursor-pointer text-xs"
                              >
                                <div className={`h-2 w-2 rounded-full mr-2 ${config.color.split(" ")[0]}`} />
                                {config.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Column 3: Remarks (Auto-save on blur) */}
                      <TableCell>
                         <RemarkInput 
                           initialValue={epn.remarks || ""} 
                           onSave={(val) => remarksMutation.mutate({ epnId: epn.id, remarks: val })} 
                         />
                      </TableCell>

                      {/* Column 4: Quick Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Email */}
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Send Email"
                            onClick={() => openEmail(epn.email)}
                            disabled={!epn.email}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>

                          {/* LinkedIn */}
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                            title="Open LinkedIn"
                            onClick={() => openLinkedIn(epn.linkedin)}
                            disabled={!epn.linkedin}
                          >
                            <Linkedin className="h-4 w-4" />
                          </Button>

                          {/* Google Chat */}
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Google Chat"
                            onClick={() => openChat(epn.email)}
                            disabled={!epn.email}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>

                          {/* Google Calendar */}
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            title="Schedule Meeting"
                            onClick={() => openCalendar(epn.pocName || epn.name)}
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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

// Helper Component for Remarks to handle local state & debounce
function RemarkInput({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) {
  const [value, setValue] = useState(initialValue);

  // Sync if initialValue updates from server (e.g. after refresh)
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <Input
      className="h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-primary transition-all"
      placeholder="Add notes..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) {
          onSave(value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur(); // Trigger save
        }
      }}
    />
  );
}