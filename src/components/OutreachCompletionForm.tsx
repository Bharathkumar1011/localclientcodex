
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Intervention, Lead, Company, Contact, User as UserType } from "@/lib/types";

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

  // ✅ Load saved data from localStorage every time the popup opens
  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("completedTasks") || "{}");
    const savedTask = savedData[task.id];
    if (savedTask) {
      if (savedTask.notes) setNotes(savedTask.notes);
      if (savedTask.followUpDate) setFollowUpDate(savedTask.followUpDate);
      if (savedTask.followUpTime) setFollowUpTime(savedTask.followUpTime);
    } else {
      // fallback to data from the backend (if available)
      if (task.notes) setNotes(task.notes);
      if (task.followUpDate) setFollowUpDate(task.followUpDate);
      if (task.followUpTime) setFollowUpTime(task.followUpTime);
    }
  }, [task.id, task.notes, task.followUpDate, task.followUpTime]);

  // ✅ Save new/updated data
  const handleSave = () => {
    const existingTasks = JSON.parse(localStorage.getItem("completedTasks") || "{}");
    existingTasks[task.id] = {
      ...task,
      notes,
      followUpDate,
      followUpTime,
    };
    localStorage.setItem("completedTasks", JSON.stringify(existingTasks));

    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Activity Type (frozen) */}
      <div>
        <label className="block text-sm font-medium mb-1">Activity Type</label>
        <Input value={task.type} disabled />
      </div>

      {/* Status (frozen) */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <Input value="Completed" disabled />
      </div>

      {/* Notes (pre-filled + editable) */}
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <Textarea
          placeholder="Add notes about this outreach..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Follow-up Date and Time (pre-filled + editable) */}
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

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Activity</Button>
      </div>
    </div>
  );
}
