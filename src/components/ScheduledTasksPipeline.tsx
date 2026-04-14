import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ScheduledTaskCard from "./ScheduledTaskCard";
import type { Lead, Company, Contact, User as UserType } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduledTasksPipelineProps {
  currentUser: UserType;
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
  investorId?: number | null;
  contactId?: number | null;
  taskAssignedTo?: string | null;
  taskAssignedToName?: string | null;
  taskAssignedBy?: string | null;
  taskAssignedByName?: string | null;
  lead: Lead & {
    company: Company;
    contact?: Contact;
  };
};

const STAGE_ROUTE_MAP: Record<
  ScheduledTaskItem["stage"],
  "/outreach" | "/pitching" | "/mandates"
> = {
  outreach: "/outreach",
  pitching: "/pitching",
  mandates: "/mandates",
};

export default function ScheduledTasksPipeline({
  currentUser,
}: ScheduledTasksPipelineProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStage, setFilterStage] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("due_asc");
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: scheduledTasks = [], isLoading } = useQuery<ScheduledTaskItem[]>({
    queryKey: ["interventions", "scheduled"],
    queryFn: () =>
      apiRequest("GET", "/interventions/scheduled").then((res) => res.json()),
  });

 // Mutation to mark a task as completed
const completeTaskMutation = useMutation({
  mutationFn: async (task: ScheduledTaskItem) => {
    // 1) Lead POC outreach task
    if (task.source === "lead_poc_outreach") {
      const leadId = Number(task.lead.id);
      const contactId = Number(task.lead.contact?.id);
      const channel = task.taskType;

      if (!Number.isFinite(leadId) || !Number.isFinite(contactId)) {
        throw new Error("Missing lead/contact info for lead POC task");
      }

      return apiRequest("PUT", `/lead-poc-outreach/lead/${leadId}`, {
        contactId,
        channel,
        nextActionText: null,
        nextActionAt: null,
        taskAssignedTo: null,
      });
    }

    // 2) Pitching task
    if (task.source === "pitching") {
      const leadId = Number(task.lead.id);

      if (!Number.isFinite(leadId)) {
        throw new Error("Missing leadId for pitching task");
      }

      const pitchingClearMap: Record<string, Record<string, any>> = {
        pdm: {
          pdmNextActionText: null,
          pdmNextActionAt: null,
          pdmTaskAssignedTo: null,
        },
        meeting1: {
          meeting1NextActionText: null,
          meeting1NextActionAt: null,
          meeting1TaskAssignedTo: null,
        },
        meeting2: {
          meeting2NextActionText: null,
          meeting2NextActionAt: null,
          meeting2TaskAssignedTo: null,
        },
        loe: {
          loeNextActionText: null,
          loeNextActionAt: null,
          loeTaskAssignedTo: null,
        },
        mandate: {
          mandateNextActionText: null,
          mandateNextActionAt: null,
          mandateTaskAssignedTo: null,
        },
      };

      const payload = pitchingClearMap[task.taskType];
      if (!payload) {
        throw new Error(`Unsupported pitching task type: ${task.taskType}`);
      }

      return apiRequest("POST", `/leads/${leadId}/pitching`, payload);
    }

    // 3) Investor link task
if (task.source === "investor_link") {
  const leadId = Number(task.lead.id);
  const investorId = Number(task.investorId);

  if (!Number.isFinite(leadId) || !Number.isFinite(investorId)) {
    throw new Error("Missing leadId/investorId for investor-level task");
  }

  return apiRequest("PATCH", `/leads/${leadId}/investors/${investorId}/next-action`, {
    nextActionText: null,
    nextActionAt: null,
    taskAssignedTo: null,
  });
}

    // 4) Investor POC task
    if (task.source === "investor_poc_outreach") {
      throw new Error(
        "Investor POC scheduled task needs investorId/contactId metadata in the task payload before it can be completed from this card"
      );
    }

    throw new Error("Unsupported task source");
  },

  onSuccess: async () => {
    await queryClient.invalidateQueries({
      queryKey: ["interventions", "scheduled"],
    });

    toast({
      title: "Task completed",
      description: "The scheduled task was removed from the scheduled list.",
    });
  },

  onError: (error: any) => {
    toast({
      title: "Failed to complete task",
      description: error?.message || "Please try again.",
      variant: "destructive",
    });
  },
});


  const ownerOptions = useMemo(() => {
    const names = Array.from(
      new Set(
        scheduledTasks
          .flatMap((task) => [
            task.ownerName,
            task.createdByName,
            task.taskAssignedToName,
            task.taskAssignedByName,
          ])
          .filter(Boolean)
      )
    ).sort();

    return names;
  }, [scheduledTasks]);

  const filteredTasks = useMemo(() => {
    const result = scheduledTasks.filter((task) => {
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        searchTerm === "" ||
        task.lead.company.name.toLowerCase().includes(searchLower) ||
        (task.relatedName || "").toLowerCase().includes(searchLower) ||
        (task.title || "").toLowerCase().includes(searchLower) ||
        (task.nextActionText || "").toLowerCase().includes(searchLower) ||
        (task.notes || "").toLowerCase().includes(searchLower) ||
        (task.ownerName || "").toLowerCase().includes(searchLower) ||
        (task.createdByName || "").toLowerCase().includes(searchLower) ||
        (task.taskAssignedToName || "").toLowerCase().includes(searchLower) ||
        (task.taskAssignedByName || "").toLowerCase().includes(searchLower);

      const matchesStage = filterStage === "all" || task.stage === filterStage;
      const matchesSource = filterSource === "all" || task.source === filterSource;

      const effectiveOwner = task.ownerName || task.createdByName || "";
      const matchesOwner =
        filterOwner === "all" ||
        task.ownerName === filterOwner ||
        task.createdByName === filterOwner ||
        task.taskAssignedToName === filterOwner ||
        task.taskAssignedByName === filterOwner;

      let matchesStatus = true;
      if (filterStatus !== "all") {
        const scheduledDate = new Date(task.scheduledAt);
        const now = new Date();
        const isOverdue = scheduledDate < now && !isToday(scheduledDate);
        const isTodayTask = isToday(scheduledDate);

        if (filterStatus === "overdue") {
          matchesStatus = isOverdue;
        } else if (filterStatus === "today") {
          matchesStatus = isTodayTask;
        } else if (filterStatus === "upcoming") {
          matchesStatus = !isOverdue && !isTodayTask;
        }
      }

      if (showMyTasks) {
        const isExplicitlyAssigned = task.taskAssignedTo === currentUser.id;

        const isUserTaskByLeadVisibility =
          task.lead?.assignedTo === currentUser.id ||
          task.lead?.ownerAnalystId === currentUser.id ||
          task.lead?.createdBy === currentUser.id ||
          (task.lead as any)?.assignedPartnerId === currentUser.id;

        if (!isExplicitlyAssigned && !isUserTaskByLeadVisibility) return false;
      }
      
      return (
        matchesSearch &&
        matchesStage &&
        matchesSource &&
        matchesOwner &&
        matchesStatus
      );
    });

    result.sort((a, b) => {
      const aTime = new Date(a.scheduledAt).getTime();
      const bTime = new Date(b.scheduledAt).getTime();

      if (sortBy === "due_desc") return bTime - aTime;
      return aTime - bTime;
    });

    return result;
  }, [
    scheduledTasks,
    searchTerm,
    filterStage,
    filterSource,
    filterOwner,
    filterStatus,
    sortBy,
    showMyTasks,
    currentUser.id,
  ]);


  function isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scheduled tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="scheduled-tasks-pipeline">
      <div>
        <h1 className="text-3xl font-bold mb-2">Scheduled Tasks</h1>
        <p className="text-muted-foreground">
          Stage-wise next actions from Outreach, Pitching, and Mandates
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          variant={showMyTasks ? "default" : "outline"}
          onClick={() => setShowMyTasks(!showMyTasks)}
        >
          {showMyTasks ? "Show All Tasks" : "My Tasks"}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company, person, owner, remarks, or next action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>

          <Select value={filterStage} onValueChange={setFilterStage}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-stage-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="outreach">Outreach</SelectItem>
              <SelectItem value="pitching">Pitching</SelectItem>
              <SelectItem value="mandates">Mandates</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-full sm:w-52" data-testid="select-source-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="lead_poc_outreach">Lead POC</SelectItem>
              <SelectItem value="pitching">Pitching</SelectItem>
              <SelectItem value="investor_link">Investor</SelectItem>
              <SelectItem value="investor_poc_outreach">Investor POC</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-status">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-full sm:w-52" data-testid="select-owner-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {ownerOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-sort">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_asc">Due Soonest</SelectItem>
              <SelectItem value="due_desc">Due Latest</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setFilterStage("all");
              setFilterSource("all");
              setFilterOwner("all");
              setFilterStatus("all");
              setSortBy("due_asc");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-task-count">
          {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} scheduled
        </p>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No scheduled tasks</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterStage !== "all" || filterStatus !== "all"
              ? "No tasks match your current filters"
              : "You do not have any stage-wise next actions right now"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTasks.map((task) => (
          <ScheduledTaskCard
            key={task.id}
            task={task}
            onOpen={() => {
              const route = STAGE_ROUTE_MAP[task.stage];
              navigate(`${route}?highlightLead=${task.lead.id}`);
            }}
            onComplete={() => completeTaskMutation.mutate(task)}
            isCompleting={
              completeTaskMutation.isPending &&
              completeTaskMutation.variables?.id === task.id
            }
          />
        ))}
        </div>
      )}
    </div>
  );
}