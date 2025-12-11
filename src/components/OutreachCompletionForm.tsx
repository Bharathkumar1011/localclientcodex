import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Intervention, Lead, Company, Contact, User as UserType } from "@/lib/types";

import { useMutation } from "@tanstack/react-query";        // ⭐ ADDED
import { apiRequest, queryClient } from "@/lib/queryClient"; // ⭐ ADDED

interface OutreachCompletionFormProps {
  task: Intervention & {
    lead: Lead & {
      company: Company;
      contact?: Contact;
    };
    user: UserType;
  };
  onClose: () => void;
}

export default function OutreachCompletionForm({ task, onClose }: OutreachCompletionFormProps) {
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");

  // ⭐⭐⭐ ADDED — BACKEND MUTATIONS
  const completeMutation = useMutation({
    mutationFn: async (payload: any) =>
      apiRequest("POST", "/interventions/complete", payload).then((r) => r.json()),

    onSuccess: () => {
      queryClient.invalidateQueries(["interventions", "scheduled"]);
      onClose();
    }
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async (payload: any) =>
      apiRequest("POST", "/interventions", payload).then((r) => r.json()),

    onSuccess: () => {
      queryClient.invalidateQueries(["interventions", "scheduled"]);
    }
  });
  // ⭐⭐⭐ END ADDED BLOCK


  // Load saved data
  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("completedTasks") || "{}");
    const savedTask = savedData[task.id];
    if (savedTask) {
      if (savedTask.notes) setNotes(savedTask.notes);
      if (savedTask.followUpDate) setFollowUpDate(savedTask.followUpDate);
      if (savedTask.followUpTime) setFollowUpTime(savedTask.followUpTime);
    } else {
      if (task.notes) setNotes(task.notes);
      if (task.followUpDate) setFollowUpDate(task.followUpDate);
      if (task.followUpTime) setFollowUpTime(task.followUpTime);
    }
  }, [task.id, task.notes, task.followUpDate, task.followUpTime]);


  // ⭐⭐⭐ REPLACED HANDLE-SAVE LOGIC — BUT KEPT YOUR LOCAL STORAGE LOGIC INTACT
  const handleSave = () => {
    // 🔹 1. Save locally (your existing feature)
    const existingTasks = JSON.parse(localStorage.getItem("completedTasks") || "{}");
    existingTasks[task.id] = {
      ...task,
      notes,
      followUpDate,
      followUpTime,
    };
    localStorage.setItem("completedTasks", JSON.stringify(existingTasks));

    // 🔹 2. Tell backend this task is completed
    completeMutation.mutate({
      interventionId: task.id,
      notes,
      status: "completed",
    });

    // 🔹 3. Create follow-up task if date/time entered
    if (followUpDate && followUpTime) {
      createFollowUpMutation.mutate({
        leadId: task.lead.id,
        type: task.type,
        scheduledAt: `${followUpDate}T${followUpTime}:00`,
        notes: `Follow-up for task ${task.id}`,
      });
    }
  };
  // ⭐⭐⭐ END ADDED BLOCK


  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Activity Type</label>
        <Input value={task.type} disabled />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Input value="Completed" disabled />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Textarea
          placeholder="Add notes about this outreach..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Follow-up Date</label>
          <Input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Follow-up Time</label>
          <Input
            type="time"
            value={followUpTime}
            onChange={(e) => setFollowUpTime(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Activity</Button>
      </div>
    </div>
  );
}
