import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  Building2,
} from "lucide-react";

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

type InvestorPocOutreachResponse = {
  lead: {
    id: number;
    stage: string;
    companyId: number;
    companyName: string;
  };
  investor: {
    id: number;
    name: string;
    currentLinkedStatus: string;
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

  if (value === "no_response_post_process") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (value === "call_required") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (value === "neutral") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  if (value.includes("follow_up")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (value === "request_sent") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  if (value === "initiated") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function linkedStatusToneClasses(status?: string | null) {
  switch (status) {
    case "positive":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "hold":
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "dropped":
      return "border-slate-300 bg-slate-200 text-slate-800";
    case "no_response":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "yet_to_contact":
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
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

export default function InvestorOutreachStatus() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const leadId = Number(params.leadId);
  const investorId = Number(params.investorId || params.id);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<InvestorPocOutreachResponse>({
    queryKey: ["investor-poc-outreach", leadId, investorId],
    queryFn: () =>
      apiRequest(
        "GET",
        `/investor-poc-outreach/lead/${leadId}/investor/${investorId}`
      ).then((r) => r.json()),
    enabled:
      Number.isFinite(leadId) &&
      leadId > 0 &&
      Number.isFinite(investorId) &&
      investorId > 0,
  });

  useEffect(() => {
    if (!data?.pocs?.length) return;
    const hasSelected = data.pocs.some((poc) => poc.slot === selectedSlot);
    if (!hasSelected) {
      setSelectedSlot(data.pocs[0].slot);
    }
  }, [data, selectedSlot]);

  const saveMutation = useMutation({
    mutationFn: async ({
      rowKey,
      payload,
    }: {
      rowKey: string;
      payload: SavePayload;
    }) => {
      const response = await apiRequest(
        "PUT",
        `/investor-poc-outreach/lead/${leadId}/investor/${investorId}`,
        payload
      );
      return response.json();
    },
    onMutate: ({ rowKey }) => {
      setSavingRowKey(rowKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["investor-poc-outreach", leadId, investorId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/leads/linked-investors", leadId],
      });

      toast({
        title: "Investor outreach saved",
        description: "Linked investor status synced automatically.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save outreach update",
        description:
          err?.message || "Please try again. The latest change was not saved.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSavingRowKey(null);
    },
  });

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

  if (
    !Number.isFinite(leadId) ||
    leadId <= 0 ||
    !Number.isFinite(investorId) ||
    investorId <= 0
  ) {
    return (
      <div className="min-h-full bg-slate-50/40 p-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-8">Invalid leadId or investorId in URL.</CardContent>
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
              Loading investor outreach management...
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
          <CardContent className="py-8 text-sm text-rose-600">
            {(error as any)?.message || "Failed to load investor outreach management."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedPoc =
    data.pocs.find((poc) => poc.slot === selectedSlot) ?? data.pocs[0] ?? null;

  return (
    <div className="min-h-full bg-slate-50/40 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0 border-slate-200 bg-white"
              onClick={() => setLocation(`/investor-outreach/${leadId}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                Investor Manage Outreach
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {data.investor.name}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Linked to <span className="font-medium text-slate-700">{data.lead.companyName}</span>
                </p>
              </div>
            </div>
          </div>

          <Badge
            variant="outline"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${linkedStatusToneClasses(
              data.investor.currentLinkedStatus
            )}`}
          >
            Linked Investor Status: {formatStatusLabel(data.investor.currentLinkedStatus)}
          </Badge>
        </div>

        {data.pocs.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="py-8 text-sm text-slate-500">
              No linked POCs found for this investor on this lead. Go back and link at least one contact first.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {data.pocs.map((poc) => {
                    const isActive = selectedSlot === poc.slot;
                    return (
                      <button
                        key={poc.contact.id}
                        type="button"
                        onClick={() => setSelectedSlot(poc.slot)}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>POC {poc.slot}</span>
                        <span className="text-xs text-slate-500">
                          {poc.contact.name || "Unnamed"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedPoc && (
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="space-y-6 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Selected Investor POC
                      </div>
                      <h2 className="mt-2 text-xl font-semibold text-slate-900">
                        {selectedPoc.contact.name || "Unnamed POC"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedPoc.contact.designation || "Designation not available"}
                      </p>
                    </div>

                    {selectedPoc.contact.isPrimary ? (
                      <Badge
                        variant="outline"
                        className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                      >
                        Primary POC
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <ContactInfoRow
                      label="Email"
                      value={selectedPoc.contact.email}
                      actionHref={normalizeEmailHref(selectedPoc.contact.email)}
                      actionType="email"
                      copied={copiedKey === `email-${selectedPoc.contact.id}`}
                      onCopy={() =>
                        copyText(`email-${selectedPoc.contact.id}`, selectedPoc.contact.email)
                      }
                    />

                    <ContactInfoRow
                      label="Phone"
                      value={selectedPoc.contact.phone}
                      actionHref={normalizePhoneHref(selectedPoc.contact.phone)}
                      actionType="phone"
                      copied={copiedKey === `phone-${selectedPoc.contact.id}`}
                      onCopy={() =>
                        copyText(`phone-${selectedPoc.contact.id}`, selectedPoc.contact.phone)
                      }
                    />

                    <ContactInfoRow
                      label="LinkedIn"
                      value={
                        selectedPoc.contact.linkedinProfile ||
                        selectedPoc.contact.linkedin ||
                        selectedPoc.contact.linkedIn
                      }
                      actionHref={normalizeLinkedinUrl(
                        selectedPoc.contact.linkedinProfile ||
                          selectedPoc.contact.linkedin ||
                          selectedPoc.contact.linkedIn
                      )}
                      actionType="linkedin"
                      copied={copiedKey === `linkedin-${selectedPoc.contact.id}`}
                      onCopy={() =>
                        copyText(
                          `linkedin-${selectedPoc.contact.id}`,
                          selectedPoc.contact.linkedinProfile ||
                            selectedPoc.contact.linkedin ||
                            selectedPoc.contact.linkedIn
                        )
                      }
                    />

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 shadow-sm">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Designation
                      </div>
                      <div className="text-sm font-medium text-slate-800">
                        {selectedPoc.contact.designation || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-slate-100/80">
                        <tr>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Channel
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Status
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Initiation Date
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Last Updated
                          </th>
                          <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Remarks
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {CHANNEL_ORDER.map((channel) => {
                          const rowKey = `${selectedPoc.contact.id}-${channel}`;
                          return (
                            <ChannelRow
                              key={rowKey}
                              channel={channel}
                              contactId={selectedPoc.contact.id}
                              record={selectedPoc.channels[channel]}
                              statusOptions={data.statusOptions[channel] || []}
                              onStatusChange={(payload) =>
                                saveMutation.mutate({ rowKey, payload })
                              }
                              onRemarksSave={(payload) =>
                                saveMutation.mutate({ rowKey, payload })
                              }
                              isSaving={savingRowKey === rowKey}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}