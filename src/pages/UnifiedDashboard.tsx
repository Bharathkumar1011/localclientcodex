import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { ActivityLog } from "@/components/ActivityLog";
import LeadCard from "@/components/LeadCard";
import InvestorCard from "@/components/InvestorCard";
import AssignmentModal from "@/components/AssignmentModal";
import { InterventionTracker } from "@/components/InterventionTracker";
import EngagementGateDialog from "@/components/EngagementGateDialog";
import InvestorPOCManagement from "@/components/InvestorPOCManagement";
import InvestorLinkedCompaniesDialog from "@/components/InvestorLinkedCompaniesDialog";
import EpnCard from "@/components/epn/EpnCard";
import type { EpnPartnerRow } from "@/components/epn/EpnUniverseTable";
import { apiFetch } from "@/lib/apiFetch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  UnifiedSearchResponse,
  UnifiedSearchResult,
  Lead,
  Company,
  Contact,
  Investor,
  User as UserType,
} from "@/lib/types";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Loader2, 
  Briefcase, 
  Users, 
  TrendingUp, 
  Globe, 
  Newspaper, 
  ExternalLink,
  PieChart as PieChartIcon,
  BarChart3,
  Link as LinkIcon,
  Activity,
  Info,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  Clock,
  Search,
  X,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  ListTodo
} from "lucide-react";


import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// --- Types ---
interface DashboardMetrics {
  totalLeads: number;
  qualified: number;
  inOutreach: number;
  inPitching: number;
  inMandates?: number;
  leadsCountByStage?: Record<string, number>;
}

interface InvestorMetrics {
  totalInvestors: number;
  outreach: number;
  active: number;
  warm: number;
  dealmaking: number;
  rejected: number;
}

interface LinkageMetrics {
  totalActiveLeads: number;
  linkedActiveLeads: number;
  totalInvestors: number;
  linkedInvestors: number;
  totalLinks: number;
}

interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

type ScheduledTaskItem = {
  id: string;
  stage: "outreach" | "pitching" | "mandates";
  source:
    | "lead_poc_outreach"
    | "pitching"
    | "investor_link"
    | "investor_poc_outreach";
  taskType: string;
  title: string;
  scheduledAt: string;
  nextActionText?: string | null;
  notes?: string | null;
  relatedName?: string | null;
  ownerName?: string | null;
  createdByName?: string | null;
  taskAssignedTo?: string | null;
  taskAssignedToName?: string | null;
  taskAssignedBy?: string | null;
  taskAssignedByName?: string | null;
  lead: Lead & {
    company?: Company;
    contact?: Contact;
    createdBy?: string | null;
    assignedPartnerId?: string | null;
    assignedInterns?: string[];
  };
};



// ✅ NEW Types for Momentum and Activity
interface MomentumStats {
  leadsAdded: number;
  leadsDropped: number;
  mandatesSigned: number;
  investorsMapped: number;
  meetingsLogged: number;
  tasksCompleted: number;
  stageMovements: number;
}

interface WeeklyMomentum {
  currentWeek: MomentumStats;
  prevWeek: MomentumStats;
}



// --- Helper Components ---

function MetricCard({ title, value, icon: Icon, subtext, colorClass }: any) {
  return (
    <Card className="border-l-4 shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: colorClass }}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-full opacity-10`} style={{ backgroundColor: colorClass }}>
          <Icon className="h-6 w-6" style={{ color: colorClass }} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ label, value, total, colorClass, subText }: any) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-muted-foreground">{value} / {total} ({percentage}%)</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${percentage}%` }} 
        />
      </div>
      {subText && <p className="text-xs text-muted-foreground pt-1">{subText}</p>}
    </div>
  );
}

function NewsFeedPanel({ category }: { category: 'leads' | 'investors' }) {
  const { data: newsItems, isLoading } = useQuery<NewsItem[]>({ 
    queryKey: ['/news', category], 
    queryFn: async () => {
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await apiFetch(`${baseUrl}/news?category=${category}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to fetch news");
      }
      
      return res.json();
    }
  });

  return (
    <div className="h-[300px] overflow-y-auto pr-2">
      {isLoading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !newsItems?.length ? (
        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground p-4">
          <Newspaper className="mb-2 h-8 w-8 opacity-20" />
          <p>No recent {category} news.</p>
        </div>
      ) : (
        <div className="divide-y">
          {newsItems.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 p-3 hover:bg-muted/50 transition-colors group rounded-md"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </span>
                <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="font-semibold text-primary/70">{item.source || 'News'}</span>
                <span>•</span>
                <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ Updated to make 'equation' optional so it looks clean for basic text explanations
function InfoHelp({ text, equation }: { text: string, equation?: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-slate-400 hover:text-slate-800 cursor-help ml-1.5 transition-colors" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px] p-3 bg-blue-50 dark:bg-slate-950 border shadow-md z-50">
          <div className="space-y-2">
            <p className="text-xs font-medium leading-snug">{text}</p>
            {equation && (
              <div className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {equation}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}



// --- Main Component ---

type LeadWithDetails = Lead & {
  company: Company;
  contact?: Contact;
  assignedToUser?: Partial<UserType>;
  createdByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  assignedInterns?: string[];
  assignedPartnerId?: string | null;
  partnerId?: string | null;
  managerId?: string | null;
};

const LEAD_STAGE_PATH_MAP: Record<string, string> = {
  universe: "/universe",
  qualified: "/qualified",
  outreach: "/outreach",
  pitching: "/pitching",
  mandates: "/mandates",
  completed_mandate: "/completed-mandate",
  hold: "/hold",
  dropped: "/dropped",
  rejected: "/rejected",
  won: "/deals-won",
  lost: "/deals-lost",
};

const INVESTOR_STAGE_PATH_MAP: Record<string, string> = {
  outreach: "/investor-relation/investor-management/outreach",
  warm: "/investor-relation/investor-management/warm",
  active: "/investor-relation/investor-management/active",
  dealmaking: "/investor-relation/investor-management/dealmaking",
};

function getLeadNavigatePath(stage: string, leadId: number) {
  const basePath = LEAD_STAGE_PATH_MAP[stage] || "/universe";
  return `${basePath}?highlightLead=${leadId}`;
}

function getInvestorNavigatePath(stage: string, investorId: number) {
  const basePath =
    INVESTOR_STAGE_PATH_MAP[stage] || "/investor-relation/investor-management/database";
  return `${basePath}?highlight=${investorId}`;
}

function getUserDisplayName(user?: Partial<UserType> | null) {
  if (!user) return "Unknown User";

  const first = String(user.firstName || "").trim();
  const last = String(user.lastName || "").trim();
  const fullName = `${first} ${last}`.trim();

  return fullName || user.email || "Unknown User";
}

function getScheduledTaskBucket(scheduledAt?: string | null) {
  if (!scheduledAt) return "upcoming";

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) return "upcoming";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  if (date < todayStart) return "overdue";
  if (date >= todayStart && date <= todayEnd) return "today";

  return "upcoming";
}

function formatScheduledTaskDate(scheduledAt?: string | null) {
  if (!scheduledAt) return "No due date";

  const date = new Date(scheduledAt);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getScheduledTaskBadgeClass(bucket: string) {
  if (bucket === "overdue") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (bucket === "today") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getScheduledTaskBadgeLabel(bucket: string) {
  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";
  return "Upcoming";
}

function getScheduledTaskStageLabel(stage: ScheduledTaskItem["stage"]) {
  if (stage === "outreach") return "Outreach";
  if (stage === "pitching") return "Pitching";
  return "Mandates";
}

function getScheduledTaskAssigneeLabel(task: ScheduledTaskItem) {
  return (
    task.taskAssignedToName ||
    task.ownerName ||
    task.createdByName ||
    "Unassigned"
  );
}

function ScheduledTasksDashboardCard({
  tasks,
  users,
  currentUser,
  selectedUserFilter,
  onSelectedUserFilterChange,
  canFilterByUser,
  isLoading,
  isError,
  onOpenTask,
  onViewAll,
}: {
  tasks: ScheduledTaskItem[];
  users: UserType[];
  currentUser?: UserType;
  selectedUserFilter: string;
  onSelectedUserFilterChange: (value: string) => void;
  canFilterByUser: boolean;
  isLoading: boolean;
  isError?: boolean;
  onOpenTask: (task: ScheduledTaskItem) => void;
  onViewAll: () => void;
}) {
const safeTasks = useMemo(() => {
  return Array.isArray(tasks)
    ? tasks.filter((task) => task && typeof task === "object" && task.id)
    : [];
}, [tasks]);

const safeUsers = useMemo(() => {
  return Array.isArray(users)
    ? users.filter((user) => user && typeof user === "object" && user.id)
    : [];
}, [users]);

const summary = useMemo(() => {
  return safeTasks.reduce(
    (acc, task) => {
      const bucket = getScheduledTaskBucket(task?.scheduledAt);

      if (bucket === "overdue") acc.overdue += 1;
      else if (bucket === "today") acc.today += 1;
      else acc.upcoming += 1;

      return acc;
    },
    { overdue: 0, today: 0, upcoming: 0 }
  );
}, [safeTasks]);

const previewTasks = useMemo(() => safeTasks.slice(0, 6), [safeTasks]);

  return (
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-5 w-5 text-blue-600" />
              Scheduled Tasks
            </CardTitle>
            <CardDescription>
              Follow-ups, pitching actions, and mandate tasks due across the CRM
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {canFilterByUser ? (
              <Select
                value={selectedUserFilter}
                onValueChange={onSelectedUserFilterChange}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="my">My Tasks</SelectItem>
                  <SelectItem value="all">All Visible Tasks</SelectItem>

                    {safeUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="secondary">
                My Tasks
              </Badge>
            )}

            <Button variant="outline" size="sm" onClick={onViewAll}>
              View All
              <ExternalLink className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-red-700">Overdue</p>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-red-700">
              {summary.overdue}
            </p>
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-amber-700">Today</p>
              <CalendarDays className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {summary.today}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-emerald-700">Upcoming</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {summary.upcoming}
            </p>
          </div>
        </div>

            {isLoading ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading scheduled tasks...
              </div>
            ) : isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                Scheduled tasks could not be loaded for this user. The rest of the dashboard is still available.
              </div>
            ) : previewTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
            <p className="font-medium text-slate-800">No scheduled tasks found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You are all caught up for the selected user filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {previewTasks.map((task) => {
            const bucket = getScheduledTaskBucket(task?.scheduledAt);
            const companyName =
              task?.lead?.company?.name ||
              task?.lead?.companyName ||
              task?.relatedName ||
              "Unknown Lead";

              return (
                <div
                  key={task.id}
                  className="rounded-lg border bg-slate-50/70 p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getScheduledTaskBadgeClass(bucket)}
                        >
                          {getScheduledTaskBadgeLabel(bucket)}
                        </Badge>

                        <Badge variant="outline" className="capitalize">
                          {getScheduledTaskStageLabel(task.stage)}
                        </Badge>

                        <span className="text-xs text-muted-foreground">
                          {formatScheduledTaskDate(task.scheduledAt)}
                        </span>
                      </div>

                      <p className="truncate font-semibold text-slate-900">
                        {companyName}
                      </p>

                      <p className="line-clamp-2 text-sm text-slate-700">
                        {task.nextActionText || task.title || "Scheduled follow-up task"}
                      </p>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Assigned: {getScheduledTaskAssigneeLabel(task)}</span>

                        {task.relatedName ? (
                          <span className="truncate">
                            Related: {task.relatedName}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenTask(task)}
                      >
                        Open Lead
                        <ExternalLink className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {tasks.length > previewTasks.length ? (
              <div className="pt-1 text-center text-xs text-muted-foreground">
                Showing {previewTasks.length} of {tasks.length} scheduled tasks.
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



function getPartnerIdFromLead(lead: any): string | null {
  return (
    lead?.assignedPartnerId ??
    lead?.partnerId ??
    lead?.managerId ??
    null
  );
}

function InlineLeadWorkspace({
  result,
  currentUser,
  onResultPatch,
}: {
  result: UnifiedSearchResult;
  currentUser: UserType;
  onResultPatch: (patch: Partial<UnifiedSearchResult>) => void;
}) {
  const [, setLocation] = useLocation();
  const inlineStage = String(result.stage || "qualified");

  const [showAssignmentModal, setShowAssignmentModal] = useState<{
    leadId: number;
    company: Company;
    currentAssignedInterns?: string[];
  } | null>(null);

  const [showInterventionTracker, setShowInterventionTracker] = useState<{
    leadId: number;
    companyName: string;
  } | null>(null);

  const [showEngagementGate, setShowEngagementGate] = useState<{
    leadId: number;
    companyId: number;
    companyName: string;
  } | null>(null);

  const [showMandateConfirmation, setShowMandateConfirmation] = useState<{
    leadId: number;
    companyName: string;
  } | null>(null);

  const [showCompletedMandateConfirmation, setShowCompletedMandateConfirmation] = useState<{
    leadId: number;
    companyName: string;
    note: string;
  } | null>(null);

  const { data: leadRows = [], isLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ["inline-lead-stage", inlineStage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/leads/stage/${inlineStage}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const leadData = useMemo(
    () => (leadRows || []).find((l: any) => Number(l.id) === Number(result.id)) || null,
    [leadRows, result.id]
  );

  const { data: orgUsers = [] } = useQuery<UserType[]>({
    queryKey: ["inline-org-users"],
    enabled: ["admin", "partner", "analyst"].includes(currentUser.role),
    queryFn: async () => {
      const res = await apiRequest("GET", "/users");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const { data: allInterns = [] } = useQuery<UserType[]>({
    queryKey: ["inline-interns", currentUser.role === "analyst" ? currentUser.id : "org"],
    enabled: ["admin", "partner", "analyst"].includes(currentUser.role),
    queryFn: async () => {
      if (currentUser.role === "analyst") {
        const response = await apiRequest("GET", `/analysts/${currentUser.id}/interns`);
        return response.json();
      }

      const response = await apiRequest("GET", "/users");
      const allUsers = await response.json();
      return allUsers.filter((u: UserType) => u.role === "intern");
    },
    refetchOnWindowFocus: false,
  });

  const { data: epnLinks = [] } = useQuery<Array<{ leadId: number; epns: any[] }>>({
    queryKey: ["inline-epn-links", inlineStage],
    enabled: ["admin", "partner"].includes(currentUser.role),
    queryFn: async () => {
      const res = await apiRequest("GET", `/epn/links?stage=${inlineStage}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const linkedEpns = useMemo(() => {
    if (!leadData) return [];
    return (epnLinks || []).find((row) => Number(row.leadId) === Number(leadData.id))?.epns || [];
  }, [epnLinks, leadData]);

  const assignedPartnerUser = useMemo(() => {
    if (!leadData) return undefined;
    const partnerId = getPartnerIdFromLead(leadData);
    if (!partnerId) return undefined;
    return orgUsers.find((u) => u.id === partnerId);
  }, [leadData, orgUsers]);

  const invalidateLeadUi = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["inline-lead-stage"] });
    queryClient.invalidateQueries({ queryKey: ["inline-epn-links"] });
    queryClient.invalidateQueries({ queryKey: ["/dashboard/metrics"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/unified-search"] });
  };

  const moveLeadStageMutation = useMutation({
    mutationFn: async (payload: {
      leadId: number;
      stage: string;
      defaultPocId?: number | null;
      backupPocId?: number | null;
      note?: string | null;
    }) => {
      const res = await apiRequest("PATCH", `/leads/${payload.leadId}/stage`, {
        stage: payload.stage,
        defaultPocId: payload.defaultPocId,
        backupPocId: payload.backupPocId,
        note: payload.note,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidateLeadUi();
      onResultPatch({
        stage: variables.stage,
        navigatePath: getLeadNavigatePath(variables.stage, Number(result.id)),
      });
    },
  });

  const handleEditLead = (leadId: number) => {
    setLocation(`/leads/${leadId}/edit`);
  };

  const handleAssignLead = (leadId: number) => {
    if (!leadData) return;
    setShowAssignmentModal({
      leadId,
      company: leadData.company,
      currentAssignedInterns: leadData.assignedInterns || [],
    });
  };

  const handleReassignLead = (leadId: number) => {
    if (!leadData) return;
    setShowAssignmentModal({
      leadId,
      company: leadData.company,
      currentAssignedInterns: leadData.assignedInterns || [],
    });
  };

  const handleInterventionClick = (leadId: number) => {
    if (!leadData) return;
    setShowInterventionTracker({
      leadId,
      companyName: leadData.company.name,
    });
  };

  const handleOutreachClick = (leadId: number) => {
    setLocation(`/outreach-status/${leadId}`);
  };

  const handleMoveToOutreach = (leadId: number) => {
    moveLeadStageMutation.mutate({ leadId, stage: "outreach" });
  };

  const handleMoveToHold = (leadId: number) => {
    moveLeadStageMutation.mutate({ leadId, stage: "hold" });
  };

  const handleMoveToDropped = (leadId: number) => {
    moveLeadStageMutation.mutate({ leadId, stage: "dropped" });
  };

  const handleMoveToPitching = (leadId: number) => {
    if (!leadData) return;
    setShowEngagementGate({
      leadId,
      companyId: leadData.company.id,
      companyName: leadData.company.name,
    });
  };

  const handleMoveToMandates = (leadId: number) => {
    if (!leadData) return;
    setShowMandateConfirmation({
      leadId,
      companyName: leadData.company.name,
    });
  };

  const handleMoveToCompletedMandate = (leadId: number) => {
    if (!leadData) return;
    setShowCompletedMandateConfirmation({
      leadId,
      companyName: leadData.company.name,
      note: "",
    });
  };

  const handleMoveToStage = (
    leadId: number,
    nextStage:
      | "qualified"
      | "outreach"
      | "pitching"
      | "mandates"
      | "completed_mandate"
      | "hold"
      | "dropped"
  ) => {
    if (nextStage === "hold") return handleMoveToHold(leadId);
    if (nextStage === "dropped") return handleMoveToDropped(leadId);
    if (nextStage === "outreach") return handleMoveToOutreach(leadId);

    const currentStage = String(leadData?.stage || "");

    if (nextStage === "pitching" && currentStage === "outreach") {
      return handleMoveToPitching(leadId);
    }

    if (nextStage === "mandates" && currentStage === "pitching") {
      return handleMoveToMandates(leadId);
    }

    if (nextStage === "completed_mandate" && currentStage === "mandates") {
      return handleMoveToCompletedMandate(leadId);
    }

    moveLeadStageMutation.mutate({ leadId, stage: nextStage });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Loading LeadCard workspace...
      </div>
    );
  }

  if (!leadData || !leadData.company) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Lead not found in its current stage list.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LeadCard
        lead={leadData}
        company={leadData.company}
        contact={leadData.contact || leadData.contacts?.[0]}
        linkedEpns={linkedEpns}
        currentUserName={currentUser.firstName}
        assignedToName={
          leadData.assignedToUser
            ? `${leadData.assignedToUser.firstName || ""} ${leadData.assignedToUser.lastName || ""}`.trim()
            : undefined
        }
        assignedToUser={leadData.assignedToUser}
        assignedPartnerUser={assignedPartnerUser}
        assignedInternUsers={
          leadData.assignedInterns
            ? leadData.assignedInterns
                .map((internId: string) => allInterns.find((i) => i.id === internId))
                .filter(Boolean) as UserType[]
            : []
        }
        ownerAnalystName={
          leadData.createdByUser
            ? `${leadData.createdByUser.firstName || ""} ${leadData.createdByUser.lastName || ""}`.trim() ||
              (leadData.createdByUser.email ?? "Unassigned")
            : "Unassigned"
        }
        currentUser={currentUser}
        stage={inlineStage}
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
        onMoveToStage={handleMoveToStage}
      />

      {showInterventionTracker && (
        <InterventionTracker
          leadId={showInterventionTracker.leadId}
          companyName={showInterventionTracker.companyName}
          onClose={() => setShowInterventionTracker(null)}
        />
      )}

      <AssignmentModal
        lead={leadData}
        company={showAssignmentModal?.company || null}
        currentAssignedInterns={showAssignmentModal?.currentAssignedInterns || []}
        isOpen={!!showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(null);
          invalidateLeadUi();
        }}
        currentUser={currentUser}
      />

      {showEngagementGate && (
        <EngagementGateDialog
          isOpen={!!showEngagementGate}
          leadId={showEngagementGate.leadId}
          companyId={showEngagementGate.companyId}
          companyName={showEngagementGate.companyName}
          onClose={() => setShowEngagementGate(null)}
          onSuccess={() => {
            setShowEngagementGate(null);
            invalidateLeadUi();
            onResultPatch({
              stage: "pitching",
              navigatePath: getLeadNavigatePath("pitching", Number(result.id)),
            });
          }}
        />
      )}

      {showMandateConfirmation && (
        <Dialog
          open={!!showMandateConfirmation}
          onOpenChange={(open) => !open && setShowMandateConfirmation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to Mandates</DialogTitle>
              <DialogDescription>
                Confirm moving <strong>{showMandateConfirmation.companyName}</strong> to Mandates.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMandateConfirmation(null)}>
                No
              </Button>
              <Button
                onClick={() => {
                  moveLeadStageMutation.mutate({
                    leadId: showMandateConfirmation.leadId,
                    stage: "mandates",
                  });
                  setShowMandateConfirmation(null);
                }}
              >
                Yes, I Have a Mandate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showCompletedMandateConfirmation && (
        <Dialog
          open={!!showCompletedMandateConfirmation}
          onOpenChange={(open) => !open && setShowCompletedMandateConfirmation(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to Completed Mandate</DialogTitle>
              <DialogDescription>
                Add a note and confirm moving <strong>{showCompletedMandateConfirmation.companyName}</strong> to Completed Mandate.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <textarea
                value={showCompletedMandateConfirmation.note}
                onChange={(e) =>
                  setShowCompletedMandateConfirmation((prev) =>
                    prev ? { ...prev, note: e.target.value } : prev
                  )
                }
                placeholder="Enter completion note..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCompletedMandateConfirmation(null)}>
                No
              </Button>
              <Button
                onClick={() => {
                  const note = showCompletedMandateConfirmation.note.trim();
                  if (!note) return;

                  moveLeadStageMutation.mutate({
                    leadId: showCompletedMandateConfirmation.leadId,
                    stage: "completed_mandate",
                    note,
                  });

                  setShowCompletedMandateConfirmation(null);
                }}
              >
                Yes, Move Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function InlineInvestorWorkspace({
  result,
  onResultPatch,
}: {
  result: UnifiedSearchResult;
  onResultPatch: (patch: Partial<UnifiedSearchResult>) => void;
}) {
  const inlineStage = String(result.stage || "outreach");

  const [pocManageOpen, setPocManageOpen] = useState(false);
  const [currentInvestorId, setCurrentInvestorId] = useState<number | null>(null);
  const [currentInvestorName, setCurrentInvestorName] = useState("");
  const [currentInvestorContacts, setCurrentInvestorContacts] = useState<any[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkInvestorId, setLinkInvestorId] = useState<number | null>(null);

  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["inline-investor-stage", inlineStage],
    queryFn: async () => {
      const res = await apiRequest("GET", `/investors?stage=${inlineStage}`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const investor = useMemo(
    () => (investors || []).find((inv) => Number(inv.id) === Number(result.id)) || null,
    [investors, result.id]
  );

  const updateInvestorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const res = await apiRequest("PATCH", `/investors/${id}`, updates);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["inline-investor-stage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/unified-search"] });

      if (variables.updates?.stage) {
        onResultPatch({
          stage: variables.updates.stage,
          navigatePath: getInvestorNavigatePath(variables.updates.stage, Number(result.id)),
        });
      }
    },
  });

  const handleMoveStage = (id: number, stage: string) => {
    updateInvestorMutation.mutate({ id, updates: { stage } });
  };

  const handleSectorToggle = (investorRow: Investor, sector: string) => {
    const currentSectors = investorRow.sector
      ? investorRow.sector.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const newSectors = currentSectors.includes(sector)
      ? currentSectors.filter((s) => s !== sector)
      : [...currentSectors, sector];

    updateInvestorMutation.mutate({
      id: investorRow.id,
      updates: { sector: newSectors.join(", ") },
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Loading InvestorCard workspace...
      </div>
    );
  }

  if (!investor) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Investor not found in its current stage list.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <InvestorCard
        investor={investor}
        stage={inlineStage as any}
        onMoveToStage={handleMoveStage}
        onSectorToggle={handleSectorToggle}
        onManageLinks={(i) => {
          setLinkInvestorId(i.id);
          setLinkOpen(true);
        }}
        onManagePOCs={(i) => {
          setCurrentInvestorId(i.id);
          setCurrentInvestorName(i.name);
          setCurrentInvestorContacts(i.contacts || []);
          setPocManageOpen(true);
        }}
      />

      <Dialog open={pocManageOpen} onOpenChange={setPocManageOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage POCs - {currentInvestorName}</DialogTitle>
          </DialogHeader>

          {currentInvestorId && (
            <InvestorPOCManagement
              investorId={currentInvestorId}
              initialContacts={currentInvestorContacts}
            />
          )}
        </DialogContent>
      </Dialog>

      <InvestorLinkedCompaniesDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        investorId={linkInvestorId}
      />
    </div>
  );
}

function InlineEpnWorkspace({ result }: { result: UnifiedSearchResult }) {
  const bucket = String(result.bucket || "other_epn");
  const stage = String(result.stage || "outreach");

  const { data: epnRows = [], isLoading } = useQuery<EpnPartnerRow[]>({
    queryKey: ["inline-epn-stage", bucket, stage],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/epn?bucket=${encodeURIComponent(bucket)}&stage=${encodeURIComponent(stage)}`
      );
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const epnRow = useMemo(
    () => (epnRows || []).find((row) => Number(row.id) === Number(result.id)) || null,
    [epnRows, result.id]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Loading EpnCard workspace...
      </div>
    );
  }

  if (!epnRow) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        EPN not found in its current bucket/stage list.
      </div>
    );
  }

  return <EpnCard partner={epnRow} />;
}

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // 1. Fetch Lead Metrics
  const { data: leadData, isLoading: leadsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/dashboard/metrics'],
    refetchInterval: 60000,
  });

  // 2. Fetch Investor Metrics
  const { data: investorData, isLoading: investorsLoading } = useQuery<InvestorMetrics>({
    queryKey: ['/dashboard/investor-metrics'],
    refetchInterval: 60000,
  });

  // 3. Fetch Linkage Metrics
  const { data: linkageData, isLoading: linkageLoading } = useQuery<LinkageMetrics>({
    queryKey: ['/dashboard/linkage-metrics'],
    refetchInterval: 60000,
  });

  // 4. Fetch Weekly Momentum
  const { data: momentumData, isLoading: momentumLoading } = useQuery<WeeklyMomentum>({
    queryKey: ['/dashboard/weekly-momentum'],
    refetchInterval: 60000,
  });


// 6. ✅ Fetch Pipeline Aging Analytics
const { data: agingStats = [] } = useQuery({
  queryKey: ["/api/analytics/pipeline-aging"],
  queryFn: async () => {
    const res = await apiFetch("/api/analytics/pipeline-aging");
    return res.json();
  }
});

const currentUser = user as UserType | undefined;
const canFilterScheduledTasksByUser = ["admin", "partner"].includes(
  String(currentUser?.role || "")
);

const [scheduledTaskUserFilter, setScheduledTaskUserFilter] = useState<string>("my");

useEffect(() => {
  if (!canFilterScheduledTasksByUser && scheduledTaskUserFilter !== "my") {
    setScheduledTaskUserFilter("my");
  }
}, [canFilterScheduledTasksByUser, scheduledTaskUserFilter]);

const { data: scheduledTaskUsers = [] } = useQuery<UserType[]>({
  queryKey: ["unified-dashboard", "scheduled-task-users"],
  enabled: Boolean(currentUser?.id) && canFilterScheduledTasksByUser,
  queryFn: async () => {
    const res = await apiRequest("GET", "/users");
    return res.json();
  },
  staleTime: 5 * 60 * 1000,
});

const {
  data: scheduledTasksRaw = [],
  isLoading: scheduledTasksLoading,
  isError: scheduledTasksError,
} = useQuery<ScheduledTaskItem[]>({
  queryKey: [
    "unified-dashboard",
    "scheduled-tasks",
    currentUser?.id,
    canFilterScheduledTasksByUser ? scheduledTaskUserFilter : "my",
  ],
  enabled: Boolean(currentUser?.id),
  queryFn: async () => {
    const assignedTo = canFilterScheduledTasksByUser
      ? scheduledTaskUserFilter
      : "my";

    const res = await apiRequest(
      "GET",
      `/interventions/scheduled?assignedTo=${encodeURIComponent(assignedTo)}`
    );

    const data = await res.json();

    return Array.isArray(data) ? data : [];
  },
  staleTime: 60 * 1000,
});

const scheduledTasks = Array.isArray(scheduledTasksRaw)
  ? scheduledTasksRaw.filter((task) => task && typeof task === "object")
  : [];


  const [unifiedSearch, setUnifiedSearch] = useState("");
  const trimmedUnifiedSearch = unifiedSearch.trim();

  const { data: unifiedSearchData, isFetching: isUnifiedSearchLoading } = useQuery<UnifiedSearchResponse>({
    queryKey: ["/api/dashboard/unified-search", trimmedUnifiedSearch],
    enabled: trimmedUnifiedSearch.length >= 2,
    queryFn: async () => {
      const res = await apiFetch(
        `/api/dashboard/unified-search?q=${encodeURIComponent(trimmedUnifiedSearch)}`
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000,
  });

  const unifiedSearchResults = unifiedSearchData?.results || [];


  const [selectedInlineResult, setSelectedInlineResult] = useState<UnifiedSearchResult | null>(null);
 
  const inlineWorkspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedInlineResult) return;

    const timer = window.setTimeout(() => {
      inlineWorkspaceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [selectedInlineResult]);

  useEffect(() => {
    if (trimmedUnifiedSearch.length < 2) {
      setSelectedInlineResult(null);
    }
  }, [trimmedUnifiedSearch]);


  if (leadsLoading || investorsLoading || linkageLoading || momentumLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Unified View...</span>
      </div>
    );
  }

  // --- Data Prep for Charts ---
  const getStageCount = (data: DashboardMetrics | undefined, stage: string) => {
    if (!data?.leadsCountByStage) return 0;
    if (data.leadsCountByStage[stage] !== undefined) return Number(data.leadsCountByStage[stage]);
    const key = Object.keys(data.leadsCountByStage).find(k => k.toLowerCase() === stage.toLowerCase());
    return key ? Number(data.leadsCountByStage[key]) : 0;
  };

  const countQualified = getStageCount(leadData, 'qualified');
  const countOutreach = getStageCount(leadData, 'outreach');
  const countPitching = getStageCount(leadData, 'pitching');
  const countMandates = getStageCount(leadData, 'mandates');

  const activeLeads = countQualified + countOutreach + countPitching + countMandates;
  
  const leadChartData = [
    { name: 'Qualified', value: countQualified, color: '#94a3b8' },
    { name: 'Outreach', value: countOutreach, color: '#60a5fa' },
    { name: 'Pitching', value: countPitching, color: '#3b82f6' },
    { name: 'Mandates', value: countMandates, color: '#2563eb' },
  ].filter(d => d.value > 0);

  const activeInvestors = (investorData?.active || 0) + (investorData?.warm || 0) + (investorData?.dealmaking || 0);
  
  const investorChartData = [
    { name: 'Outreach', count: Number(investorData?.outreach || 0) },
    { name: 'Active', count: Number(investorData?.active || 0) },
    { name: 'Warm', count: Number(investorData?.warm || 0) },
    { name: 'Dealmaking', count: Number(investorData?.dealmaking || 0) },
  ];

  const networkDensity = linkageData?.linkedActiveLeads ? (linkageData.totalLinks / linkageData.linkedActiveLeads).toFixed(1) : "0";

  // Helper for Momentum Arrows
  const renderTrend = (key: keyof MomentumStats, isNegativeGood = false) => {
    if (!momentumData) return null;
    const current = momentumData.currentWeek[key];
    const prev = momentumData.prevWeek[key];
    const diff = current - prev;

    if (diff === 0) return <span className="text-slate-400 flex items-center text-xs ml-2"><MinusIcon className="h-3 w-3 mr-0.5"/> 0</span>;
    
    const isPositive = diff > 0;
    const isGood = isNegativeGood ? !isPositive : isPositive;
    const color = isGood ? "text-emerald-500" : "text-rose-500";
    const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon;
    
    return (
      <span className={`${color} flex items-center text-xs font-semibold ml-2`}>
        <Icon className="h-3 w-3 mr-0.5"/> {Math.abs(diff)}
      </span>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <Card className="shadow-sm border-dashed border-slate-300">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Unified Search</CardTitle>
          <CardDescription>
            Search leads, investors, and EPNs by entity name, POC name, email, or LinkedIn.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={unifiedSearch}
                onChange={(e) => setUnifiedSearch(e.target.value)}
                placeholder="Search lead / investor / EPN..."
                className="pl-10"
              />
            </div>

            {unifiedSearch.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setUnifiedSearch("")}
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {trimmedUnifiedSearch.length > 0 && trimmedUnifiedSearch.length < 2 && (
            <p className="text-sm text-muted-foreground">
              Type at least 2 characters to start searching.
            </p>
          )}

          {trimmedUnifiedSearch.length >= 2 && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">LeadCard: {unifiedSearchData?.counts.leads || 0}</Badge>
                <Badge variant="secondary">InvestorCard: {unifiedSearchData?.counts.investors || 0}</Badge>
                <Badge variant="secondary">EpnCard: {unifiedSearchData?.counts.epns || 0}</Badge>

                {unifiedSearchData && !unifiedSearchData.epnAccess && (
                  <Badge variant="outline">EPN hidden for analyst role</Badge>
                )}
              </div>

              {isUnifiedSearchLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching...
                </div>
              ) : unifiedSearchResults.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No matches found.
                </div>
              ) : (
                <div className="space-y-2">
                  {unifiedSearchResults.map((item) => (
                    <div
                      key={`${item.entityType}-${item.id}-${item.matchedOn || "match"}`}
                      className="rounded-lg border bg-white p-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{item.title}</p>

                            <Badge variant="secondary">{item.cardTypeLabel}</Badge>

                            {item.stage && (
                              <Badge variant="outline" className="capitalize">
                                {item.stage.replaceAll("_", " ")}
                              </Badge>
                            )}

                            {item.bucket && (
                              <Badge variant="outline">
                                {item.bucket.replaceAll("_", " ")}
                              </Badge>
                            )}
                          </div>

                          {item.subtitle && (
                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                          )}

                          {(item.matchedOn || item.matchedValue) && (
                            <p className="break-all text-xs text-muted-foreground">
                              Matched by: {item.matchedOn}
                              {item.matchedValue ? ` • ${item.matchedValue}` : ""}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant={
                              selectedInlineResult?.entityType === item.entityType &&
                              selectedInlineResult?.id === item.id
                                ? "default"
                                : "secondary"
                            }
                            size="sm"
                            onClick={() => {
                              setSelectedInlineResult(item);
                            }}
                          >
                            {selectedInlineResult?.entityType === item.entityType &&
                            selectedInlineResult?.id === item.id
                              ? "Opened Below"
                              : "Open Here"}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(item.navigatePath)}
                          >
                            Navigate
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedInlineResult && (
                <div
                  ref={inlineWorkspaceRef}
                  className="space-y-3 border-t pt-4 mt-4 rounded-xl border border-slate-300 bg-slate-50/70 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        Opened Below
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Working on: {selectedInlineResult.title} • {selectedInlineResult.cardTypeLabel}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInlineResult(null)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Close
                    </Button>
                  </div>

                  {selectedInlineResult.entityType === "lead" && (
                    <InlineLeadWorkspace
                      result={selectedInlineResult}
                      currentUser={user as UserType}
                      onResultPatch={(patch) =>
                        setSelectedInlineResult((prev) =>
                          prev ? { ...prev, ...patch } : prev
                        )
                      }
                    />
                  )}

                  {selectedInlineResult.entityType === "investor" && (
                    <InlineInvestorWorkspace
                      result={selectedInlineResult}
                      onResultPatch={(patch) =>
                        setSelectedInlineResult((prev) =>
                          prev ? { ...prev, ...patch } : prev
                        )
                      }
                    />
                  )}

                  {selectedInlineResult.entityType === "epn" && (
                    <InlineEpnWorkspace result={selectedInlineResult} />
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

{/* KPI Cards (Top Row) */}
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <MetricCard title="Active Deals" value={activeLeads} icon={Briefcase} subtext="Total Live Pipeline" colorClass="#2563eb" />
  <MetricCard title="Live Mandates" value={countMandates} icon={TrendingUp} subtext="Highest Priority" colorClass="#16a34a" />
  <MetricCard title="Total Investors" value={investorData?.totalInvestors || 0} icon={Globe} subtext="Global Database" colorClass="#8b5cf6" />
  <MetricCard title="Active Conversations" value={activeInvestors} icon={Users} subtext="Engaged Investors" colorClass="#f59e0b" />
</div>

<ScheduledTasksDashboardCard
  tasks={scheduledTasks}
  users={Array.isArray(scheduledTaskUsers) ? scheduledTaskUsers : []}
  currentUser={currentUser}
  selectedUserFilter={scheduledTaskUserFilter}
  onSelectedUserFilterChange={setScheduledTaskUserFilter}
  canFilterByUser={canFilterScheduledTasksByUser}
  isLoading={scheduledTasksLoading}
  isError={scheduledTasksError}
  onOpenTask={(task) => {
    const leadId = Number(task?.lead?.id);

    if (!leadId) return;

    setLocation(getLeadNavigatePath(task.stage, leadId));
  }}
  onViewAll={() => {
    setLocation("/scheduled-tasks");
  }}
/>

{/* Network Health & Linkages */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <LinkIcon className="h-4 w-4 text-emerald-500 mr-2" />
              Deal Coverage
              <InfoHelp text="Percentage of Active Deals that have at least one investor linked." equation="(Linked Deals / Active Deals) × 100" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <h3 className="text-2xl font-bold mb-4">
                {linkageData?.linkedActiveLeads || 0} <span className="text-sm font-normal text-muted-foreground">linked deals</span>
              </h3>
              <ProgressBar 
                label="Active Deals Linked"
                value={linkageData?.linkedActiveLeads || 0}
                total={linkageData?.totalActiveLeads || 0}
                colorClass="bg-emerald-500"
                subText={`${(linkageData?.totalActiveLeads || 0) - (linkageData?.linkedActiveLeads || 0)} active deals have NO investors added yet.`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Activity className="h-4 w-4 text-blue-500 mr-2" />
              Investor Utilization
              <InfoHelp text="Percentage of your total Investor Database that is currently connected to a deal." equation="(Linked Investors / Total Investors) × 100" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <h3 className="text-2xl font-bold mb-4">
                {linkageData?.linkedInvestors || 0} <span className="text-sm font-normal text-muted-foreground">engaged investors</span>
              </h3>
              <ProgressBar 
                label="Database Utilization"
                value={linkageData?.linkedInvestors || 0}
                total={linkageData?.totalInvestors || 0}
                colorClass="bg-blue-500"
                subText={`Investors connected to at least one active deal.`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="h-4 w-4 text-indigo-500 mr-2" />
              Network Density
              <InfoHelp text="The average number of investors being pitched for every linked deal." equation="Total Connections / Linked Deals" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-4xl font-bold text-indigo-900">
                {networkDensity}
              </h3>
              <span className="text-sm font-medium text-muted-foreground">investors / deal</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              On average, each linked deal is being pitched to <strong>{networkDensity}</strong> investors.
              <br/>
              Total Connections: <span className="font-semibold text-foreground">{linkageData?.totalLinks || 0}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NEW SECTION: Weekly Momentum (Velocity Bar) */}
      <Card className="shadow-sm bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center text-slate-700 dark:text-slate-300">
              <Activity className="h-4 w-4 mr-2 text-primary" />
              Weekly Momentum (Last 7 Days vs Prior 7 Days)
            </h3>
          </div>
          <div className="flex flex-wrap gap-y-4 gap-x-8">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Leads Added <InfoHelp text="New companies or deals added to the pipeline this week." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.leadsAdded || 0}</span>
              {renderTrend('leadsAdded')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Leads Dropped <InfoHelp text="Deals that were marked as dropped or lost this week." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.leadsDropped || 0}</span>
              {renderTrend('leadsDropped', true)} {/* Negative is good */}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Mandates Signed <InfoHelp text="Deals that successfully progressed to the signed mandate stage." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.mandatesSigned || 0}</span>
              {renderTrend('mandatesSigned')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Investors Mapped <InfoHelp text="New connections made between investors and active deals." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.investorsMapped || 0}</span>
              {renderTrend('investorsMapped')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Meetings Logged <InfoHelp text="Total number of meetings scheduled or logged by the team." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.meetingsLogged || 0}</span>
              {renderTrend('meetingsLogged')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Tasks Completed <InfoHelp text="To-dos, follow-ups, and interventions marked as done." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.tasksCompleted || 0}</span>
              {renderTrend('tasksCompleted')}
            </div>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground flex items-center mr-2">
                Stage Movements <InfoHelp text="Total number of times deals advanced or moved across pipeline stages." />:
              </span>
              <span className="text-lg font-bold">{momentumData?.currentWeek?.stageMovements || 0}</span>
              {renderTrend('stageMovements')}
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        <Card className="col-span-3 lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-600" />
              Deal Flow Distribution
            </CardTitle>
            <CardDescription>Breakdown of active leads by stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {leadChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leadChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active leads data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-4 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              Investor Pipeline
            </CardTitle>
            <CardDescription>Volume of investors across relationship stages</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={investorChartData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
                 <YAxis axisLine={false} tickLine={false} />
                 <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                 <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
               </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>



      {/* Intelligence / News */}
      <div className="grid gap-4">
        {/* ✅ PIPELINE HEALTH: STAGNANT DEALS BY ANALYST */}
      <Card className="shadow-sm border-red-100 bg-white/50 mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
              <Clock className="h-4 w-4" />
              PIPELINE AGING BY ANALYST
            </CardTitle>
            <CardDescription className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Monitoring deals stuck in the current stage
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="h-9 px-4 text-left font-bold text-slate-600">Analyst</TableHead>
                  <TableHead className="h-9 px-2 text-center font-bold text-amber-600 bg-amber-50/30 w-32">14d+ (Warning)</TableHead>
                  <TableHead className="h-9 px-2 text-center font-bold text-red-600 bg-red-50/30 w-32">30d+ (Stagnant)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground italic">
                      Pipeline is healthy! No aging deals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  agingStats.map((stat: any) => (
                    <TableRow key={stat.name} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="p-3 font-semibold text-slate-800">{stat.name}</TableCell>
                      <TableCell className={`p-2 text-center font-black ${stat.warning > 0 ? 'text-amber-600' : 'text-slate-200'}`}>
                        {stat.warning}
                      </TableCell>
                      <TableCell className={`p-2 text-center font-black ${stat.stagnant > 0 ? 'text-red-600' : 'text-slate-200'}`}>
                        {stat.stagnant}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
        <Card className="shadow-sm flex flex-col w-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Newspaper className="h-4 w-4 text-orange-500" />
              Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Tabs defaultValue="leads" className="w-full">
              <div className="px-4 border-b">
                <TabsList className="w-full justify-start h-9 bg-transparent p-0">
                  <TabsTrigger 
                    value="leads" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-2 pt-1"
                  >
                    Sectors & Deals
                  </TabsTrigger>
                  <TabsTrigger 
                    value="investors" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-2 pt-1"
                  >
                    Investor News
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="leads" className="m-0">
                <NewsFeedPanel category="leads" />
              </TabsContent>
              <TabsContent value="investors" className="m-0">
                <NewsFeedPanel category="investors" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <div className="w-full">
           <ActivityLog limit={10} title="Unified Activity Log" className="w-full" />
        </div>
      </div>
    </div>
  );
}