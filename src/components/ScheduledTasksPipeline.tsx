import { useState } from "react";
import { useQuery,useQueryClien } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Calendar, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ScheduledTaskCard from "./ScheduledTaskCard";
import type { Intervention, Lead, Company, Contact, User as UserType } from "@/lib/types";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import OutreachCompletionForm from "./OutreachCompletionForm"; // ✅ new component we’ll create next
// import { useCreateOutreachMutation } from "@/lib/hooks/mutations/outreach";


interface ScheduledTasksPipelineProps {
  currentUser: UserType;
}

type ScheduledIntervention = Intervention & {
  lead: Lead & {
    company: Company;
    contact?: Contact;
  };
  user: UserType;
};

export default function ScheduledTasksPipeline({ currentUser }: ScheduledTasksPipelineProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [, navigate] = useLocation();
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledIntervention | null>(null);
  

  // Fetch scheduled interventions
  const { data: scheduledTasks = [], isLoading } = useQuery<ScheduledIntervention[]>({
    queryKey: ['interventions', 'scheduled'],
    queryFn: () =>
      apiRequest("GET", "/interventions/scheduled").then(res => res.json()),
  });


  console.log("\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ ");
  // 🔍 Debug: check what the backend actually sends
  console.log("Scheduled task example:", scheduledTasks[0]);
  
  // Filter and search logic
  const filteredTasks = scheduledTasks.filter(task => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || 
      task.lead.company.name.toLowerCase().includes(searchLower) ||
      task.lead.contact?.name?.toLowerCase().includes(searchLower) ||
      task.notes?.toLowerCase().includes(searchLower);

    // Type filter
    const matchesType = filterType === "all" || task.type === filterType;

    // Status filter
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

    // "My Tasks" filter
    if (showMyTasks) {
      const isUserTask =
        task.user?.id === currentUser.id ||               // task assigned to this user
        task.lead?.assignedTo === currentUser.id ||       // lead assigned to this user
        task.lead?.ownerAnalyst?.id === currentUser.id; // or created by this user

      if (!isUserTask) return false; // skip tasks not belonging to user
    }


    return matchesSearch && matchesType && matchesStatus;
  });

  // Helper function to check if date is today
  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Scheduled Tasks</h1>
        <p className="text-muted-foreground">
          Upcoming outreach activities and scheduled interventions
        </p>
      </div>
        {/* "My Tasks" toggle button */}
      <div className="flex justify-end">
        <Button
          variant={showMyTasks ? "default" : "outline"}
          onClick={() => setShowMyTasks(!showMyTasks)}
        >
          {showMyTasks ? "Show All Tasks" : "My Tasks"}
        </Button>
      </div>
  

      {/* ✅ Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Complete Outreach Task</DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <OutreachCompletionForm
              task={selectedTask}
              onClose={() => setShowCompleteModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>



      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company, contact, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>

        {/* Activity Type Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-activity-type">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="linkedin_message">LinkedIn Message</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="document">Document</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-status">
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

      {/* Task Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-task-count">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} scheduled
        </p>
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No scheduled tasks</h3>
          <p className="text-muted-foreground">
            {searchTerm || filterType !== "all" || filterStatus !== "all"
              ? "No tasks match your current filters"
              : "You don't have any upcoming scheduled activities"}
          </p>
        </div>
      ) : (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <ScheduledTaskCard
              key={task.id}
              intervention={task}
              onEdit={() => {
            // send the task info to /outreach
            navigate(
              `/outreach?interventionId=${task.id}&leadId=${task.lead.id}`
             );
             }}
              // onComplete={(id) => console.log('Complete intervention:', id)}
              onComplete={(id) => {
                const selected = scheduledTasks.find((t) => t.id === id);
                setSelectedTask(selected || null);
                setShowCompleteModal(true);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
