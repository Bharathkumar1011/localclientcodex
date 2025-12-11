import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bell, CheckCircle, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday } from "date-fns";
import type { Intervention, Lead, Company, Contact, User as UserType } from "@/lib/types";

type ScheduledIntervention = Intervention & {
  lead: Lead & {
    company: Company;
    contact?: Contact;
  };
  user: UserType;
};

const activityTypeLabels: Record<string, string> = {
  linkedin_request_self: "LinkedIn Request (Self)",
  linkedin_messages_self: "LinkedIn Messages (Self)",
  linkedin_request_dinesh: "LinkedIn Request (Dinesh)",
  linkedin_messages_dinesh: "LinkedIn Messages (Dinesh)",
  linkedin_request_kvs: "LinkedIn Request (KVS)",
  linkedin_messages_kvs: "LinkedIn Messages (KVS)",
  whatsapp_kvs: "WhatsApp (KVS)",
  whatsapp_dinesh: "WhatsApp (Dinesh)",
  email_d0_analyst: "Email D0 (Analyst)",
  email_d3_analyst: "Email D3 (Analyst)",
  email_d7_kvs: "Email D7 (KVS)",
  call_d1_dinesh: "Call D1 (Dinesh)",
  channel_partner: "Channel Partner",
  // fallback
};

export function ReminderBell() {
  const [open, setOpen] = useState(false);

  const { data: interventions = [], isLoading } = useQuery<ScheduledIntervention[]>({
    queryKey: ["/interventions/scheduled"],
  });

  // Filter: only today's pending
  const todayReminders = interventions.filter((i) => {
    if (i.status === "completed") return false;
    if (!i.scheduledAt) return false;
    return isToday(new Date(i.scheduledAt));
  });

  const completeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PUT", `/interventions/${id}`, { status: "completed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/interventions/scheduled"] });
    },
  });

  const count = todayReminders.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted"
          aria-label="Today's reminders"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1">
              <Badge className="px-1.5 py-0 text-xs rounded-full">
                {count}
              </Badge>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="    w-96 p-3 
    bg-white dark:bg-gray-900 
    shadow-xl 
    rounded-lg 
    border border-gray-200 dark:border-gray-800
    z-50" align="end">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-sm">
            {count === 0 ? "No reminders for today" : "Today's reminders"}
          </span>
        </div>
        {count === 0 ? (
          <p className="text-xs text-muted-foreground">
            You’re all caught up 🎉
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {todayReminders.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-muted"
              >
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground">
                    {item.lead?.company?.name || "Unknown company"}
                  </div>
                  <div className="text-sm font-medium">
                    {activityTypeLabels[item.type] || item.type}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {item.scheduledAt
                        ? format(new Date(item.scheduledAt), "MMM d, h:mm a")
                        : "Time not set"}
                    </span>
                  </div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {item.notes}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={completeMutation.isPending}
                  onClick={() => completeMutation.mutate(item.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
