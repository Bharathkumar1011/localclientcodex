import { useEffect, useState } from "react";


import { useToast } from "@/hooks/use-toast";

import { useLeadPocOutreach } from "@/components/manageoutreach/useLeadPocOutreach";

import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeft,
  Loader2,
  Linkedin,
  Mail,
  MessageSquare,
  Phone,
  Users,
  Copy,
  Check,
} from "lucide-react";

type Props = { params: { leadId: string } };

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

type SavePayload = {
  contactId: number;
  channel: ChannelKey;
  status?: string;
  remarks?: string | null;
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

function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => {
      if (!part) return part;
      if (/^\d+(st|nd|rd|th)$/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
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

function quickActionClasses(type: ContactActionType) {
  switch (type) {
    case "email":
      return "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 hover:text-amber-800";
    case "phone":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 hover:border-cyan-300 hover:bg-cyan-100 hover:text-cyan-800";
    case "linkedin":
      return "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800";
    default:
      return "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900";
  }
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

type ContactActionType = "email" | "phone" | "linkedin";

type ContactInfoRowProps = {
  label: string;
  value?: string | null;
  actionHref?: string | null;
  actionType: ContactActionType;
  copied: boolean;
  onCopy: () => void;
};

function ActionIcon({ type }: { type: ContactActionType }) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "phone":
      return <Phone className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    default:
      return <Mail className="h-4 w-4" />;
  }
}

function ContactInfoRow({
  label,
  value,
  actionHref,
  actionType,
  copied,
  onCopy,
}: ContactInfoRowProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 shadow-sm">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>

      <div className="flex items-start justify-between gap-3">
        {value ? (
          <div className="min-w-0 break-all text-sm font-medium text-slate-800">
            {value}
          </div>
        ) : (
          <div className="text-sm text-slate-400">—</div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={actionHref || undefined}
            target={actionType === "linkedin" ? "_blank" : undefined}
            rel={actionType === "linkedin" ? "noreferrer" : undefined}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${quickActionClasses(
              actionType
            )}`}
            aria-label={`Open ${label}`}
            onClick={(e) => {
              if (!actionHref) e.preventDefault();
            }}
          >
            <ActionIcon type={actionType} />
          </a>

          <button
            type="button"
            onClick={onCopy}
            disabled={!value}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50 ${
              copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-label={`Copy ${label}`}
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

type ChannelRowProps = {
  channel: ChannelKey;
  contactId: number;
  record: StatusRecord | null;
  statusOptions: string[];
  onStatusChange: (payload: SavePayload) => void;
  onRemarksSave: (payload: SavePayload) => void;
  isSaving: boolean;
};

function ChannelRow({
  channel,
  contactId,
  record,
  statusOptions,
  onStatusChange,
  onRemarksSave,
  isSaving,
}: ChannelRowProps) {
  const existingRemarks = record?.remarks ?? "";
  const [remarksDraft, setRemarksDraft] = useState(existingRemarks);

  useEffect(() => {
    setRemarksDraft(existingRemarks);
  }, [existingRemarks, contactId, channel]);

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

  return (
    <tr className="bg-white transition-colors hover:bg-slate-50/70">
      <td className="border-b border-slate-200 px-4 py-4 align-top">
        <div
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm ${channelPillClasses(
            channel
          )}`}
        >
          <ChannelIcon channel={channel} />
          <span>{formatChannelLabel(channel)}</span>
        </div>
      </td>

      <td className="border-b border-slate-200 px-4 py-4 align-top min-w-[230px]">
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
              className={`bg-white font-medium ${statusToneClasses(record?.status)}`}
            >
              <SelectValue placeholder="Select status" />
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

          {record?.status ? (
            <span
              className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusToneClasses(
                record.status
              )}`}
            >
              {formatStatusLabel(record.status)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">No status selected</span>
          )}
        </div>
      </td>

      <td className="border-b border-slate-200 px-4 py-4 align-top whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(record?.initiatedAt)}
      </td>

      <td className="border-b border-slate-200 px-4 py-4 align-top whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(record?.lastUpdatedAt)}
      </td>

      <td className="border-b border-slate-200 px-4 py-4 align-top min-w-[320px]">
        <div className="space-y-2">
          <Textarea
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
            placeholder="Add remarks..."
            className="min-h-[88px] resize-none border-slate-300 bg-white text-slate-800"
          />

          <div className="text-xs text-slate-500">
            {isSaving ? "Saving..." : "Auto-saves after a short pause"}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function OutreachStatus({ params }: Props) {
  const leadId = Number(params.leadId);
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const copyText = async (key: string, value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast({
        title: "Copied",
        description: `${value} copied to clipboard.`,
      });
      window.setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy value.",
        variant: "destructive",
      });
    }
  };

  if (!Number.isFinite(leadId) || leadId <= 0) {
    return (
      <div className="min-h-full bg-slate-50/40 p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-8">Invalid leadId in URL.</CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-full bg-slate-50/40 p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-10">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading outreach management...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-full bg-slate-50/40 p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-3 py-8">
            <div className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Failed to load outreach management data."}
            </div>

            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }



  const linkedinValueRaw =
    selectedPoc?.contact.linkedinProfile ||
    selectedPoc?.contact.linkedin ||
    selectedPoc?.contact.linkedIn ||
    null;

  const linkedinHref = normalizeLinkedinUrl(linkedinValueRaw);
  const emailHref = normalizeEmailHref(selectedPoc?.contact.email);
  const phoneHref = normalizePhoneHref(selectedPoc?.contact.phone);

  return (
    <div className="min-h-full bg-slate-50/40 p-6 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div>
            <div className="text-[28px] font-semibold tracking-tight text-slate-900">
              Outreach Log
            </div>
            <div className="text-sm text-slate-500">{data.lead.companyName}</div>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="border border-slate-200 bg-white text-slate-700 capitalize"
        >
          Lead Stage: {data.lead.stage}
        </Badge>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-900">Reminder rule:</span>{" "}
            only <span className="font-semibold">Email → Initiated</span> auto-creates
            scheduled follow-up tasks. LinkedIn, WhatsApp, Call, and Channel Partner
            rows update status only.
          </div>
        </CardContent>
      </Card>

      {data.pocs.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10 text-sm text-slate-500">
            No POCs found for this lead&apos;s company. Add contacts first to manage outreach.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {data.pocs.map((poc) => (
              <button
                key={poc.contact.id}
                onClick={() => setSelectedSlot(poc.slot)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  selectedPoc?.contact.id === poc.contact.id
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                POC{poc.slot}
              </button>
            ))}
          </div>

          {selectedPoc && (
            <>
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="pt-6 space-y-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xl font-semibold text-slate-900">
                        {selectedPoc.contact.name || "—"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {selectedPoc.contact.designation || "No designation"}
                      </div>
                    </div>

                    {selectedPoc.contact.isPrimary ? (
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                        Primary POC
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <ContactInfoRow
                      label="Email"
                      value={selectedPoc.contact.email}
                      actionHref={emailHref}
                      actionType="email"
                      copied={copiedKey === "email"}
                      onCopy={() => copyText("email", selectedPoc.contact.email)}
                    />

                    <ContactInfoRow
                      label="Phone"
                      value={selectedPoc.contact.phone}
                      actionHref={phoneHref}
                      actionType="phone"
                      copied={copiedKey === "phone"}
                      onCopy={() => copyText("phone", selectedPoc.contact.phone)}
                    />

                    <ContactInfoRow
                      label="LinkedIn"
                      value={linkedinValueRaw}
                      actionHref={linkedinHref}
                      actionType="linkedin"
                      copied={copiedKey === "linkedin"}
                      onCopy={() => copyText("linkedin", linkedinValueRaw)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardContent className="p-0">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="text-base font-semibold text-slate-900">
                      POC{selectedPoc.slot} Outreach
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Update the channel status and remarks for this contact.
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-[1200px] w-full border-collapse text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-sky-700">
                            Channel
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-orange-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-teal-700">
                            Initiated Date & Time
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-indigo-700">
                            Last Updated Date & Time
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-emerald-700">
                            Remarks
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {CHANNEL_ORDER.map((channel) => {
                          const rowKey = `${selectedPoc.contact.id}:${channel}`;

                          return (
                            <ChannelRow
                              key={rowKey}
                              channel={channel}
                              contactId={selectedPoc.contact.id}
                              record={selectedPoc.channels[channel]}
                              statusOptions={data.statusOptions[channel] || []}
                              isSaving={savingRowKey === rowKey}
onStatusChange={(payload) =>
                                saveOutreachUpdate({ rowKey, payload })
                              }
                              onRemarksSave={(payload) =>
                                saveOutreachUpdate({ rowKey, payload })
                              }
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}