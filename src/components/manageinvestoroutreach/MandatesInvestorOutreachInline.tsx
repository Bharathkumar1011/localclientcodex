import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  ChevronDown,
  Plus,
  Mail,
  Linkedin,
  Calendar,
  MessageSquare,
  Loader2,
  Building2,
} from "lucide-react";

import InvestorPocWorkspace from "@/components/manageinvestoroutreach/InvestorPocWorkspace";

type Props = {
  leadId: number;
  companyName: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  yet_to_contact: { label: "Yet to contact", color: "bg-blue-100 text-blue-800", },
  positive: { label: "Positive", color: "bg-green-100 text-green-800" },
  hold: { label: "Hold", color: "bg-yellow-100 text-yellow-800" },
  no_response: { label: "No Response", color: "bg-gray-100 text-gray-800" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800" },
  dropped: { label: "Dropped", color: "bg-red-600 text-white" },
};


function hasInvestorNextAction(inv: any) {
  return Boolean(
    (inv?.nextActionText && String(inv.nextActionText).trim()) || inv?.nextActionAt
  );
}

function hasInvestorRemarks(inv: any) {
  return Boolean(inv?.remarks && String(inv.remarks).trim());
}

function buildInvestorSearchText(inv: any) {
  const statusKey = String(inv?.status || "yet_to_contact");
  const statusLabel = STATUS_CONFIG[statusKey]?.label || statusKey;

  return [
    inv?.name || "",
    statusKey,
    statusLabel,
    inv?.nextActionText || "",
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeLinkedinUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

type AssignableUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

function getAssignableUserLabel(user?: AssignableUser | null) {
  if (!user) return "Unassigned";
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.email || "Unknown User";
}

function RemarkInput({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (val: string) => void;
}) {
  const safeInitialValue = initialValue || "";
  const [value, setValue] = useState(safeInitialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "48px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    setValue(safeInitialValue);
  }, [safeInitialValue]);

  useEffect(() => {
    autoResize();
  }, [value]);

  const handleSave = () => {
    if (value.trim() !== safeInitialValue.trim()) {
      onSave(value.trim());
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className="min-h-[48px] max-h-[120px] w-full resize-none overflow-y-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-primary"
      placeholder="Add remarks..."
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
    />
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
    if (nextText !== safeInitialText || nextDate !== safeInitialDate) {
      onSave({
        nextActionText: nextText.trim() || null,
        nextActionAt: nextDate || null,
      });
    }
  };

  return (
    <div className="w-full sm:w-[340px] max-w-full space-y-1">
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

export default function MandatesInvestorOutreachInline({
  leadId,
  companyName,
}: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [expandedInvestorIds, setExpandedInvestorIds] = useState<Set<number>>(new Set());


  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [nextActionFilter, setNextActionFilter] = useState("all");
  const [remarksFilter, setRemarksFilter] = useState("all");


  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["/leads/linked-investors", leadId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/${leadId}/linked-investors`);
      return res.json();
    },
    enabled: !!leadId,
    refetchOnWindowFocus: false,
  });


  const { data: assignableUsers = [] } = useQuery<AssignableUser[]>({
  queryKey: ["assignable-task-users"],
  queryFn: async () => {
    const res = await apiRequest("GET", "/users");
    return res.json();
  },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
});


    const filteredInvestors = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return investors.filter((inv) => {
      const investorStatus = String(inv?.status || "yet_to_contact");

      const matchesSearch =
        !search || buildInvestorSearchText(inv).includes(search);

      const matchesStatus =
        statusFilter === "all" || investorStatus === statusFilter;

      const investorHasNextAction = hasInvestorNextAction(inv);
      const matchesNextAction =
        nextActionFilter === "all" ||
        (nextActionFilter === "yes" && investorHasNextAction) ||
        (nextActionFilter === "no" && !investorHasNextAction);

      const investorHasRemarks = hasInvestorRemarks(inv);
      const matchesRemarks =
        remarksFilter === "all" ||
        (remarksFilter === "yes" && investorHasRemarks) ||
        (remarksFilter === "no" && !investorHasRemarks);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesNextAction &&
        matchesRemarks
      );
    });
  }, [investors, searchTerm, statusFilter, nextActionFilter, remarksFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "all" ||
    nextActionFilter !== "all" ||
    remarksFilter !== "all";



  const statusMutation = useMutation({
    mutationFn: async ({
      investorId,
      status,
    }: {
      investorId: number;
      status: string;
    }) => {
      await apiRequest(
        "PATCH",
        `/investors/${investorId}/linked-leads/${leadId}/status`,
        { status }
      );
    },
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ["/leads/linked-investors", leadId],
  });
  queryClient.invalidateQueries({
    queryKey: ["interventions", "scheduled"],
  });
  toast({ title: "Status Updated" });
},
    onError: () => {
      toast({
        title: "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const remarksMutation = useMutation({
    mutationFn: async ({
      investorId,
      remarks,
    }: {
      investorId: number;
      remarks: string;
    }) => {
      await apiRequest(
        "PATCH",
        `/leads/${leadId}/investors/${investorId}/remarks`,
        { remarks }
      );
    },
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ["/leads/linked-investors", leadId],
  });
  queryClient.invalidateQueries({
    queryKey: ["interventions", "scheduled"],
  });
  toast({ title: "Remarks Saved" });
},
    onError: () => {
      toast({
        title: "Failed to save remarks",
        variant: "destructive",
      });
    },
  });

  const nextActionMutation = useMutation({
    mutationFn: async ({
      investorId,
      nextActionText,
      nextActionAt,
      taskAssignedTo,
    }: {
      investorId: number;
      nextActionText: string | null;
      nextActionAt: string | null;
      taskAssignedTo: string | null;
    }) => {
      await apiRequest(
        "PATCH",
        `/leads/${leadId}/investors/${investorId}/next-action`,
        { nextActionText, nextActionAt, taskAssignedTo }
      );
    },
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ["/leads/linked-investors", leadId],
  });
  queryClient.invalidateQueries({
    queryKey: ["interventions", "scheduled"],
  });
  toast({ title: "Next Action Saved" });
},
    onError: () => {
      toast({
        title: "Failed to save next action",
        variant: "destructive",
      });
    },
  });


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

  const openEmail = (email?: string) => {
    if (!email) {
      toast({
        title: "No Email",
        description: "This investor has no email.",
        variant: "destructive",
      });
      return;
    }
    window.open(`mailto:${email}`, "_blank");
  };

  const openLinkedIn = (url?: string) => {
    const normalized = normalizeLinkedinUrl(url);
    if (!normalized) {
      toast({
        title: "No LinkedIn",
        description: "This investor has no LinkedIn URL.",
        variant: "destructive",
      });
      return;
    }
    window.open(normalized, "_blank");
  };

  const openCalendar = (investorName: string) => {
    const title = encodeURIComponent(`Meeting with ${investorName}`);
    window.open(
      `https://calendar.google.com/calendar/u/0/r/eventedit?text=${title}`,
      "_blank"
    );
  };

  const openChat = (email?: string) => {
    if (!email) {
      toast({
        title: "No Email for Chat",
        description: "Need an email to open Google Chat.",
        variant: "destructive",
      });
      return;
    }
    window.open(`https://chat.google.com/dm/${email}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading investor outreach...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">
              Investor Outreach
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Target: {companyName}</span>
            </div>
          </div>

          <Button onClick={() => setLocation(`/leads/${leadId}/link-investors`)}>
            <Plus className="mr-2 h-4 w-4" />
            Link New Investor
          </Button>
        </div>
      </div>


            {/* Filters */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 flex-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Search
              </label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Investor / status / next action"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All statuses</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Next Action
              </label>
              <select
                value={nextActionFilter}
                onChange={(e) => setNextActionFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Remarks
              </label>
              <select
                value={remarksFilter}
                onChange={(e) => setRemarksFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-700"
            >
              Showing {filteredInvestors.length} of {investors.length}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setNextActionFilter("all");
                setRemarksFilter("all");
              }}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>



      {/* Empty state */}
      {investors.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          <div className="flex flex-col items-start gap-3">
            <div>No investors linked yet.</div>
            <Button
              variant="outline"
              onClick={() => setLocation(`/leads/${leadId}/link-investors`)}
            >
              Link your first investor
            </Button>
          </div>
        </div>
      ) : filteredInvestors.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          No investors match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
           {filteredInvestors.map((inv) => {
            const isExpanded = expandedInvestorIds.has(inv.id);
            const currentStatus =
              STATUS_CONFIG[inv.status] || STATUS_CONFIG["yet_to_contact"];

            const displayContacts =
              inv.contacts && inv.contacts.length > 0
                ? inv.contacts
                : inv.primaryPoc
                ? [inv.primaryPoc]
                : [];

            const actionPoc = displayContacts[0];


            const assignedUserLabel = inv.taskAssignedTo
                ? getAssignableUserLabel(
                    assignableUsers.find((u) => u.id === inv.taskAssignedTo)
                    )
                : "Unassigned";
                
            return (
              <div
                    key={inv.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/65 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                {/* Investor row */}
<div className="p-4">
  <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)] gap-4">
    {/* Left column */}
    <div className="min-w-0">
      <div className="text-base font-semibold text-slate-900 break-words">
        {inv.name}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {inv.investorType ? (
          <Badge
            variant="secondary"
            className="text-[10px] px-1 py-0 h-5"
          >
            {inv.investorType}
          </Badge>
        ) : null}

        <span className="text-muted-foreground">
          {inv.location || "No Location"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {displayContacts.length > 0 ? (
          displayContacts.map((c: any) => (
            <div
              key={c.id}
              className="inline-flex items-center gap-1.5 rounded-md border bg-slate-50 px-2 py-1 text-[11px]"
            >
              <span className="font-medium text-slate-700">
                {c.name || "Unnamed"}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                {c.designation || "No designation"}
              </span>
            </div>
          ))
        ) : (
          <span className="text-[11px] text-muted-foreground italic">
            No POC
          </span>
        )}
      </div>

      <div className="mt-3 h-[48px] flex items-start">
        <div className="flex items-start gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
            title={isExpanded ? "Hide investor manage outreach" : "Open investor manage outreach"}
            onClick={() => toggleInvestorExpansion(inv.id)}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </Button>

          <div className="pt-0.5 text-[11px] leading-4 text-slate-700">
            <div className="font-medium">Investor</div>
            <div className="font-medium">manage outreach</div>
          </div>
        </div>
      </div>
    </div>

    {/* Right column */}
    <div className="min-w-0">
<div className="flex flex-col gap-1.5">
  <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[150px_minmax(0,340px)_auto] lg:items-start">
    <div className="min-w-0 space-y-2">
      <div className="w-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between font-normal h-8"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`h-2 w-2 rounded-full shrink-0 ${currentStatus.color.split(" ")[0]}`}
                />
                <span className="truncate text-xs">
                  {currentStatus.label}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[200px]">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <DropdownMenuItem
                key={key}
                onClick={() =>
                  statusMutation.mutate({
                    investorId: inv.id,
                    status: key,
                  })
                }
                className="cursor-pointer text-xs"
              >
                <div
                  className={`h-2 w-2 rounded-full mr-2 ${config.color.split(" ")[0]}`}
                />
                {config.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={inv.taskAssignedTo ?? "__unassigned"}
          onChange={(e) => {
            const value = e.target.value;
            nextActionMutation.mutate({
              investorId: inv.id,
              nextActionText: inv.nextActionText || null,
              nextActionAt: inv.nextActionAt
                ? new Date(inv.nextActionAt).toISOString().slice(0, 10)
                : null,
              taskAssignedTo: value === "__unassigned" ? null : value,
            });
          }}
          className="h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-primary"
        >
          <option value="__unassigned">Unassigned</option>
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {getAssignableUserLabel(user)}
            </option>
          ))}
        </select>

        <Badge
          variant="outline"
          className="h-8 max-w-full sm:max-w-[140px] px-2 text-[10px] inline-flex items-center"
        >
          <span className="truncate">{assignedUserLabel}</span>
        </Badge>
      </div>
    </div>

    <div className="min-w-0">
      <NextActionInput
        initialText={inv.nextActionText || ""}
        initialDate={inv.nextActionAt || null}
        onSave={({ nextActionText, nextActionAt }) =>
          nextActionMutation.mutate({
            investorId: inv.id,
            nextActionText,
            nextActionAt,
            taskAssignedTo: inv.taskAssignedTo || null,
          })
        }
      />
    </div>

    <div className="flex items-center gap-1 flex-wrap lg:justify-end">
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
        onClick={() =>
          openLinkedIn(
            actionPoc?.linkedinProfile ||
              actionPoc?.linkedin ||
              actionPoc?.linkedIn
          )
        }
        disabled={
          !(
            actionPoc?.linkedinProfile ||
            actionPoc?.linkedin ||
            actionPoc?.linkedIn
          )
        }
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
  </div>

  <div className="min-w-0">
    <RemarkInput
      initialValue={inv.remarks || ""}
      onSave={(val) =>
        remarksMutation.mutate({
          investorId: inv.id,
          remarks: val,
        })
      }
    />
  </div>
</div>
    </div>
  </div>
</div>

                {/* Expanded inline workspace */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white/55 p-3">
                    <InvestorPocWorkspace leadId={leadId} investorId={inv.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}