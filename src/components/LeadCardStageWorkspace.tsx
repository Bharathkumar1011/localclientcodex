import { useEffect, useMemo, useRef, useState } from "react";


import { Button } from "@/components/ui/button";
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
  ExternalLink,
  CheckCircle,
  XCircle,
  History,
  Clock3,
  Calendar,
} from "lucide-react";
import PitchingManagementForm from "./PitchingManagementForm";

import {
  useLeadPocOutreach,
  type SavePayload,
  formatStatusLabel,
} from "@/components/manageoutreach/useLeadPocOutreach";


import { useLeadPitching } from "@/components/managepitching/useLeadPitching";


type StageWorkspaceProps = {
  leadId: number;
  stage: string;
  companyName: string;
};

type ChannelKey =
  | "linkedin"
  | "email"
  | "whatsapp"
  | "call"
  | "channel_partner";

type StatusRecord = {
  id: number;
  channel: ChannelKey;
  status: string | null;
  initiatedAt: string | null;
  lastUpdatedAt: string | null;
  remarks: string | null;
  nextActionText: string | null;
  nextActionAt: string | null;
};

type PocContact = {
  id: number;
  name: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinProfile?: string | null;
  linkedIn?: string | null;
  linkedin?: string | null;
  isPrimary?: boolean | null;
};

type PocEntry = {
  slot: number;
  contact: PocContact;
  channels: {
    linkedin: StatusRecord | null;
    email: StatusRecord | null;
    whatsapp: StatusRecord | null;
    call: StatusRecord | null;
    channel_partner: StatusRecord | null;
  };
};

type LeadPocOutreachResponse = {
  lead: {
    id: number;
    stage: string;
    companyId: number;
    companyName: string;
  };
  pocs: PocEntry[];
  statusOptions: Record<ChannelKey, string[]>;
};

const CHANNEL_ORDER: ChannelKey[] = [
  "linkedin",
  "email",
  "whatsapp",
  "call",
  "channel_partner",
];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChannelLabel(channel: ChannelKey) {
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
    default:
      return channel;
  }
}

function ChannelIcon({ channel }: { channel: ChannelKey }) {
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

function channelPillClasses(channel: ChannelKey) {
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
  channel: ChannelKey;
  contactId: number;
  record: StatusRecord | null;
  statusOptions: string[];
  isSaving: boolean;
  onStatusChange: (payload: SavePayload) => void;
  onRemarksSave: (payload: SavePayload) => void;
  onNextActionSave: (payload: SavePayload) => void;
};

function OutreachChannelCard({
  channel,
  contactId,
  record,
  statusOptions,
  isSaving,
  onStatusChange,
  onRemarksSave,
  onNextActionSave,
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
      <div className="grid grid-cols-1 lg:grid-cols-[145px_175px_215px_minmax(0,1.2fr)] gap-3 items-start">
        {/* CHANNEL */}
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

        {/* STATUS */}
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

        {/* NEXT ACTION */}
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
                }).format(new Date(nextActionAtDraft))}
              `
              : "No date selected"}
          </div>
        </div>

        {/* REMARKS */}
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
function normalizeLinkedinUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function normalizePhoneHref(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `tel:${trimmed}`;
}

function normalizeEmailHref(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `mailto:${trimmed}`;
}

function StatusIcon({ check }: { check: boolean }) {
  return check ? (
    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
  ) : (
    <XCircle className="h-5 w-5 text-red-300 mx-auto" />
  );
}

function OutreachInlineWorkspace({ leadId }: { leadId: number }) {
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
  } = useLeadPocOutreach(leadId);

  const linkedinValueRaw =
    selectedPoc?.contact.linkedinProfile ||
    selectedPoc?.contact.linkedin ||
    selectedPoc?.contact.linkedIn ||
    null;

  const linkedinHref = normalizeLinkedinUrl(linkedinValueRaw);
  const emailHref = normalizeEmailHref(selectedPoc?.contact.email);
  const phoneHref = normalizePhoneHref(selectedPoc?.contact.phone);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        Loading outreach workspace...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-red-600">
        {error instanceof Error
          ? error.message
          : "Failed to load outreach workspace."}
      </div>
    );
  }

  if (!selectedPoc) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        No outreach data found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + POC tabs */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Manage Outreach</div>
            <div className="text-sm text-slate-500">
              Compact inline outreach workspace for this lead.
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



      {/* Selected POC summary */}
{/* Selected POC summary */}
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
    </div>

    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <div className="inline-flex items-center gap-2 min-w-0">
        <Mail className="h-4 w-4 text-amber-600 shrink-0" />
        {emailHref ? (
          <a
            href={emailHref}
            className="text-slate-700 hover:text-amber-700 hover:underline truncate"
          >
            {selectedPoc.contact.email}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>

      <div className="inline-flex items-center gap-2 min-w-0">
        <Phone className="h-4 w-4 text-cyan-600 shrink-0" />
        {phoneHref ? (
          <a
            href={phoneHref}
            className="text-slate-700 hover:text-cyan-700 hover:underline truncate"
          >
            {selectedPoc.contact.phone}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>

      <div className="inline-flex items-center gap-2 min-w-0">
        <Linkedin className="h-4 w-4 text-blue-600 shrink-0" />
        {linkedinHref ? (
          <a
            href={linkedinHref}
            target="_blank"
            rel="noreferrer"
            className="text-slate-700 hover:text-blue-700 hover:underline truncate max-w-[320px]"
          >
            {linkedinValueRaw}
          </a>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </div>
    </div>
  </div>
</div>

      {/* Channel cards */}
      <div className="space-y-4">
<div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
  <div className="min-w-0 flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-3">
    <div className="text-base font-semibold text-slate-900">
      POC{selectedPoc.slot} Outreach
    </div>

    <div className="text-xs text-slate-500 xl:border-l xl:border-slate-200 xl:pl-3">
      <span className="font-semibold text-slate-700">Reminder rule:</span>{" "}
      only <span className="font-semibold">Email → Initiated</span> auto-creates
      scheduled follow-up tasks.
    </div>
  </div>

  <Badge
    variant="outline"
    className="border-slate-200 bg-slate-50 text-slate-600"
  >
    Live inline
  </Badge>
</div>

        <div className="space-y-4">
          {CHANNEL_ORDER.map((channel) => {
            const record = selectedPoc.channels[channel];
            const rowKey = `${selectedPoc.contact.id}:${channel}`;

            return (
                  <OutreachChannelCard
                    key={rowKey}
                    channel={channel}
                    contactId={selectedPoc.contact.id}
                    record={record}
                    statusOptions={data.statusOptions[channel] || []}
                    isSaving={savingRowKey === rowKey}
                    onStatusChange={(payload) =>
                      saveOutreachUpdate({ rowKey, payload })
                    }
                    onRemarksSave={(payload) =>
                      saveOutreachUpdate({ rowKey, payload })
                    }
                    onNextActionSave={(payload) =>
                      saveOutreachUpdate({ rowKey, payload })
                    }
                  />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PitchingInlineWorkspace({
  leadId,
  companyName,
}: {
  leadId: number;
  companyName: string;
}) {
const [mode, setMode] = useState<"manage" | "history">("manage");

const { details, isLoading } = useLeadPitching(leadId);

  const historyItems = useMemo(() => {
    const items = [];

    if (details?.meeting1Date || details?.meeting1Notes) {
      items.push({
        title: "Meeting 1",
        date: details?.meeting1Date,
        notes: details?.meeting1Notes,
      });
    }

    if (details?.meeting2Date || details?.meeting2Notes) {
      items.push({
        title: "Meeting 2",
        date: details?.meeting2Date,
        notes: details?.meeting2Notes,
      });
    }

    return items;
  }, [details]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-base font-semibold text-slate-900">Manage Pitching</div>
            <div className="text-sm text-slate-500">
              Work directly on pitching from the lead card.
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode((prev) => (prev === "manage" ? "history" : "manage"))}
          >
            <History className="h-4 w-4 mr-2" />
            {mode === "manage" ? "Show History" : "Back to Manage"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="border-b bg-slate-50 px-4 py-3">
          <div className="text-base font-semibold text-slate-900">Pitching Tracker</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-3 text-center">G-Drive</th>
                <th className="px-3 py-3 text-center">Solution Note</th>
                <th className="px-3 py-3 text-center">PDM</th>
                <th className="px-3 py-3 text-center">Meeting 1</th>
                <th className="px-3 py-3 text-center">Meeting 2</th>
                <th className="px-3 py-3 text-center">LOE</th>
                <th className="px-3 py-3 text-center">Inv. Check</th>
                <th className="px-3 py-3 text-center">Mandate</th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-t">
                <td className="px-3 py-4 text-center">
                  {details?.gdriveLink ? (
                    <a href={details.gdriveLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-5 w-5 text-blue-600 mx-auto" />
                    </a>
                  ) : (
                    <StatusIcon check={false} />
                  )}
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.solutionNotePath} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.pdmPath} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.meeting1Date} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.meeting2Date} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.loeSigned} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.investorCheckNotes} />
                </td>
                <td className="px-3 py-4 text-center">
                  <StatusIcon check={!!details?.mandateSigned} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {mode === "manage" ? (
        <div className="rounded-xl border bg-white p-4">
          {isLoading ? (
            <div className="text-sm text-slate-500">Loading pitching details...</div>
          ) : (
            <PitchingManagementForm
              leadId={leadId}
              initialData={details}
              onClose={() => {}}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-4">
          <div className="mb-4 text-base font-semibold text-slate-900">
            Engagement History & Tasks
          </div>

          {historyItems.length === 0 ? (
            <div className="text-sm text-slate-500">No meetings recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="font-medium text-slate-900">{item.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.date ? formatDateTime(item.date) : "No date"}
                  </div>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {item.notes || "No notes"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeadCardStageWorkspace({
  leadId,
  stage,
  companyName,
}: StageWorkspaceProps) {
  if (stage === "outreach") {
    return <OutreachInlineWorkspace leadId={leadId} />;
  }

  if (stage === "pitching") {
    return <PitchingInlineWorkspace leadId={leadId} companyName={companyName} />;
  }

  return (
    <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
      No inline workspace for this stage in phase 1.
    </div>
  );
}