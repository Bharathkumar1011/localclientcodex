import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  Users,
  Calendar,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  useInvestorPocOutreach,
  type InvestorChannelKey,
  type InvestorSavePayload,
  formatStatusLabel,
} from "@/components/manageinvestoroutreach/useInvestorPocOutreach";

type Props = {
  leadId: number;
  investorId: number;
};

const CHANNEL_ORDER: InvestorChannelKey[] = [
  "linkedin",
  "email",
  "whatsapp",
  "call",
  "channel_partner",
  "other",
];

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

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChannelLabel(channel: InvestorChannelKey) {
  switch (channel) {
    case "linkedin":
      return "LinkedIn";
    case "email":
      return "Email";
    case "whatsapp":
      return "WhatsApp";
    case "call":
      return "Call";
    case "channel_partner":
      return "Channel Partner";
    case "other":
      return "Other Action";
    default:
      return channel;
  }
}

function ChannelIcon({ channel }: { channel: InvestorChannelKey }) {
  switch (channel) {
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    case "email":
      return <Mail className="h-4 w-4" />;
    case "whatsapp":
      return <MessageSquare className="h-4 w-4" />;
    case "call":
      return <Phone className="h-4 w-4" />;
    case "channel_partner":
      return <Users className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
}

function channelPillClasses(channel: InvestorChannelKey) {
  switch (channel) {
    case "linkedin":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "email":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "whatsapp":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "call":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "channel_partner":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "other":
      return "border-stone-200 bg-stone-50 text-stone-700";
    default:
      return "border-slate-300 bg-slate-50 text-slate-700";
  }
}

function statusToneClasses(status?: string | null) {
  if (!status) return "border-slate-200 bg-white text-slate-800";

  const value = status.toLowerCase();

  if (value === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value === "negative" ||
    value === "unavailable" ||
    value === "email_bounced"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (value === "neutral") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (value === "request_sent") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "no_response_post_process") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (value === "call_required") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (value.includes("follow_up")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "initiated") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

type OutreachChannelCardProps = {
  channel: InvestorChannelKey;
  contactId: number;
  record: any;
  statusOptions: string[];
  isSaving: boolean;
  assignableUsers: AssignableUser[];
  onStatusChange: (payload: InvestorSavePayload) => void;
  onRemarksSave: (payload: InvestorSavePayload) => void;
  onNextActionSave: (payload: InvestorSavePayload) => void;
  onAssigneeSave: (payload: InvestorSavePayload) => void;
};

function OutreachChannelCard({
  channel,
  contactId,
  record,
  statusOptions,
  isSaving,
  assignableUsers,
  onStatusChange,
  onRemarksSave,
  onNextActionSave,
  onAssigneeSave,
}: OutreachChannelCardProps) {
  const existingRemarks = record?.remarks ?? "";
  const existingNextActionText = record?.nextActionText ?? "";
  const existingNextActionAt = record?.nextActionAt
    ? new Date(record.nextActionAt).toISOString().slice(0, 10)
    : "";

  const [remarksDraft, setRemarksDraft] = useState(existingRemarks);
  const [nextActionTextDraft, setNextActionTextDraft] = useState(existingNextActionText);
  const [nextActionAtDraft, setNextActionAtDraft] = useState(existingNextActionAt);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const isOtherChannel = channel === "other";

  useEffect(() => {
    setRemarksDraft(existingRemarks);
  }, [existingRemarks, contactId, channel]);

  useEffect(() => {
    setNextActionTextDraft(existingNextActionText);
  }, [existingNextActionText, contactId, channel]);

  useEffect(() => {
    setNextActionAtDraft(existingNextActionAt);
  }, [existingNextActionAt, contactId, channel]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (remarksDraft !== existingRemarks) {
        onRemarksSave({
          contactId,
          channel,
          remarks: remarksDraft,
        });
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [remarksDraft, existingRemarks, contactId, channel, onRemarksSave]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (nextActionTextDraft !== existingNextActionText) {
        onNextActionSave({
          contactId,
          channel,
          nextActionText: nextActionTextDraft,
        });
      }
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [nextActionTextDraft, existingNextActionText, contactId, channel, onNextActionSave]);

  return (
    <div className="rounded-xl border bg-white px-3 py-3 shadow-sm">
      <div
        className={`grid grid-cols-1 gap-3 items-start ${
          isOtherChannel
            ? "lg:grid-cols-[145px_215px_minmax(0,1.2fr)]"
            : "lg:grid-cols-[145px_175px_215px_minmax(0,1.2fr)]"
        }`}
      >
        <div className="space-y-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium w-fit ${channelPillClasses(
              channel
            )}`}
          >
            <ChannelIcon channel={channel} />
            {formatChannelLabel(channel)}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Initiated
            </div>
            <div className="text-xs text-slate-900 leading-5">
              {formatDateTime(record?.initiatedAt)}
            </div>
          </div>
        </div>

        {!isOtherChannel && (
          <div className="space-y-2">
            <Select
              value={record?.status ?? "__unset"}
              onValueChange={(value) => {
                if (value === "__unset") return;
                onStatusChange({
                  contactId,
                  channel,
                  status: value,
                });
              }}
            >
              <SelectTrigger
                className={`h-8 bg-white px-2.5 text-xs font-medium ${statusToneClasses(record?.status)}`}
              >
                <SelectValue placeholder="Select status" className="text-xs" />
              </SelectTrigger>

              <SelectContent className="bg-cyan-50">
                <SelectItem value="__unset" disabled>
                  Select status
                </SelectItem>

                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {formatStatusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Updated
              </div>
              <div className="text-xs text-slate-900 leading-5">
                {formatDateTime(record?.lastUpdatedAt)}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2 min-w-0">
          <div className="relative rounded-lg border bg-white px-2.5 py-1.5">
            <input
              type="text"
              value={nextActionTextDraft}
              onChange={(e) => setNextActionTextDraft(e.target.value)}
              placeholder="Next action..."
              className="w-full bg-transparent pr-9 text-xs outline-none"
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
              value={nextActionAtDraft}
              className="absolute opacity-0 pointer-events-none h-0 w-0"
              onChange={(e) => {
                const nextDate = e.target.value;
                setNextActionAtDraft(nextDate);
                onNextActionSave({
                  contactId,
                  channel,
                  nextActionAt: nextDate || null,
                });
              }}
            />
          </div>

          <div className="text-[10px] text-slate-500">
            {nextActionAtDraft
              ? `Due: ${new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(nextActionAtDraft))}`
              : "No date selected"}
          </div>

                    <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Assigned To
            </div>

            <select
              value={record?.taskAssignedTo ?? "__unassigned"}
              onChange={(e) => {
                const value = e.target.value;
                onAssigneeSave({
                  contactId,
                  channel,
                  taskAssignedTo: value === "__unassigned" ? null : value,
                });
              }}
              className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-primary"
            >
              <option value="__unassigned">Unassigned</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {getAssignableUserLabel(user)}
                </option>
              ))}
            </select>

            <Badge variant="outline" className="w-fit text-[10px]">
              {record?.taskAssignedTo
                ? getAssignableUserLabel(
                    assignableUsers.find((u) => u.id === record.taskAssignedTo)
                  )
                : "Unassigned"}
            </Badge>
          </div>
        </div>

        <div className="min-w-0">
          <Textarea
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            rows={1}
            placeholder="Add remarks..."
            className="min-h-[36px] w-full h-auto max-h-40 resize-none overflow-auto border-0 bg-slate-50/40 px-2 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          {isSaving ? (
            <div className="mt-1 text-[10px] text-slate-400">Saving...</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function InvestorPocWorkspace({ leadId, investorId }: Props) {
  const {
    data,
    isLoading,
    isError,
    error,
    selectedSlot,
    setSelectedSlot,
    selectedPoc,
    savingRowKey,
    saveOutreachUpdate,
  } = useInvestorPocOutreach(leadId, investorId);

    const { data: assignableUsers = [] } = useQuery<AssignableUser[]>({
    queryKey: ["assignable-task-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        Loading investor outreach workspace...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-red-600">
        {error instanceof Error
          ? error.message
          : "Failed to load investor outreach workspace."}
      </div>
    );
  }

  if (!selectedPoc) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        No investor outreach data found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Manage Outreach</div>
            <div className="text-sm text-slate-500">
              Compact inline investor outreach workspace.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {data.pocs.map((poc) => {
              const isActive = selectedPoc.contact.id === poc.contact.id;

              return (
                <button
                  key={poc.contact.id}
                  onClick={() => setSelectedSlot(poc.slot)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  POC{poc.slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold text-slate-900">
                {selectedPoc.contact.name || "—"}
              </div>

              {selectedPoc.contact.designation ? (
                <span className="text-sm text-slate-500">
                  {selectedPoc.contact.designation}
                </span>
              ) : null}

              {selectedPoc.contact.isPrimary ? (
                <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  Primary POC
                </Badge>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {selectedPoc.contact.email ? <span>{selectedPoc.contact.email}</span> : null}
              {selectedPoc.contact.phone ? <span>{selectedPoc.contact.phone}</span> : null}
              {selectedPoc.contact.linkedinProfile ? (
                <span>{selectedPoc.contact.linkedinProfile}</span>
              ) : null}
            </div>
          </div>

          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700"
          >
            Linked Status: {formatStatusLabel(data.investor.currentLinkedStatus || "yet_to_contact")}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {CHANNEL_ORDER.map((channel) => {
          const rowKey = `${selectedPoc.contact.id}:${channel}`;

          return (
            <OutreachChannelCard
              key={rowKey}
              channel={channel}
              contactId={selectedPoc.contact.id}
              record={selectedPoc.channels[channel]}
              statusOptions={data.statusOptions[channel] || []}
              isSaving={savingRowKey === rowKey}
              assignableUsers={assignableUsers}
              onStatusChange={(payload) =>
                saveOutreachUpdate({ rowKey, payload })
              }
              onRemarksSave={(payload) =>
                saveOutreachUpdate({ rowKey, payload })
              }
              onNextActionSave={(payload) =>
                saveOutreachUpdate({ rowKey, payload })
              }
              onAssigneeSave={(payload) =>
                saveOutreachUpdate({ rowKey, payload })
              }
            />
          );
        })}
      </div>
    </div>
  );
}