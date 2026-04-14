import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  User as UserIcon,
  Calendar,
  ArrowRight,
  MessageSquare,
  Presentation,
  Briefcase,
  ListTodo,
} from "lucide-react";
import type { Lead, Company, Contact } from "@/lib/types";
import { formatDistanceToNow, format, isToday, isPast } from "date-fns";

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
    company: Company;
    contact?: Contact;
  };
};
interface ScheduledTaskCardProps {
  task: ScheduledTaskItem;
  onOpen?: () => void;
  onComplete?: () => void;
  isCompleting?: boolean;
}

const STAGE_META = {
  outreach: {
    label: "Outreach",
    icon: MessageSquare,
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700",
  },
  pitching: {
    label: "Pitching",
    icon: Presentation,
    badgeClass:
      "border-violet-200 bg-violet-50 text-violet-700",
  },
  mandates: {
    label: "Mandates",
    icon: Briefcase,
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
} as const;

const SOURCE_LABELS = {
  lead_poc_outreach: "Lead POC",
  pitching: "Pitching Milestone",
  investor_link: "Investor",
  investor_poc_outreach: "Investor POC",
} as const;


const TASK_TYPE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  email: "Email",
  whatsapp: "WhatsApp",
  call: "Call",
  channel_partner: "Channel Partner",
  other: "Other Action",
  pdm: "PDM",
  meeting1: "Meeting 1",
  meeting2: "Meeting 2",
  loe: "LOE",
  mandate: "Mandate",
  investor: "Investor Level",
};

function getStatusMeta(scheduledAt: string) {
  const scheduledDate = new Date(scheduledAt);

  if (isPast(scheduledDate) && !isToday(scheduledDate)) {
    return {
      label: "Overdue",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (isToday(scheduledDate)) {
    return {
      label: "Today",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Upcoming",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

export default function ScheduledTaskCard({
  task,
  onOpen,
  onComplete,
  isCompleting = false,
}: ScheduledTaskCardProps) {
  const stageMeta = STAGE_META[task.stage];
  const StageIcon = stageMeta.icon;
  const statusMeta = getStatusMeta(task.scheduledAt);


  const taskTypeLabel =
   TASK_TYPE_LABELS[task.taskType] || task.taskType || "Task";

  const scheduledDate = new Date(task.scheduledAt);
  const relativeTime = formatDistanceToNow(scheduledDate, { addSuffix: true });
  const formattedDateTime = format(scheduledDate, "MMM d, yyyy • h:mm a");

  return (
    <Card className="hover-elevate" data-testid={`scheduled-task-card-${task.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-base truncate">
                {task.lead.company.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={stageMeta.badgeClass}
              >
                <StageIcon className="h-3.5 w-3.5 mr-1" />
                {stageMeta.label}
              </Badge>

              <Badge variant="outline" className="text-xs">
                {SOURCE_LABELS[task.source]}
              </Badge>

              <Badge variant="outline" className="text-xs">
                {taskTypeLabel}
              </Badge>

              {task.taskAssignedToName ? (
                <Badge
                  variant="outline"
                  className="text-xs border-cyan-200 bg-cyan-50 text-cyan-700"
                >
                  Assigned
                </Badge>
              ) : null}
            </div>
          </div>

          <Badge
            variant="outline"
            className={statusMeta.className}
          >
            {statusMeta.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <ListTodo className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{task.title}</div>
            {task.nextActionText ? (
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.nextActionText}
              </div>
            ) : null}
          </div>
        </div>

        {task.relatedName ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{task.relatedName}</span>
          </div>
        ) : null}

        {task.ownerName ||
        task.createdByName ||
        task.taskAssignedToName ||
        task.taskAssignedByName ? (
          <div className="text-xs text-muted-foreground space-y-1">
            {task.ownerName ? <div>Owner: {task.ownerName}</div> : null}
            {task.createdByName ? <div>Created By: {task.createdByName}</div> : null}
            {task.taskAssignedToName ? (
              <div>Assigned To: {task.taskAssignedToName}</div>
            ) : null}
            {task.taskAssignedByName ? (
              <div>Assigned By: {task.taskAssignedByName}</div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-medium">{formattedDateTime}</span>
            <span className="text-xs text-muted-foreground">{relativeTime}</span>
          </div>
        </div>

        {task.notes ? (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            <p className="line-clamp-2">{task.notes}</p>
          </div>
        ) : null}

<div className="pt-2 flex gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={onOpen}
    className="flex-1"
  >
    Open Lead
    <ArrowRight className="h-3.5 w-3.5 ml-1" />
  </Button>

  <Button
    size="sm"
    onClick={onComplete}
    disabled={isCompleting}
    className="flex-1"
  >
    {isCompleting ? "Completing..." : "Complete Task"}
  </Button>
</div>
      </CardContent>
    </Card>
  );
}