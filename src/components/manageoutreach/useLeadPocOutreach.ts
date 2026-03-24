import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type ChannelKey =
  | "linkedin"
  | "email"
  | "whatsapp"
  | "call"
  | "channel_partner";

export type StatusRecord = {
  id: number;
  channel: ChannelKey;
  status: string | null;
  initiatedAt: string | null;
  lastUpdatedAt: string | null;
  remarks: string | null;
  nextActionText: string | null;
  nextActionAt: string | null;
};

export type PocContact = {
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

export type PocEntry = {
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

export type LeadPocOutreachResponse = {
  lead: {
    id: number;
    stage: string;
    companyId: number;
    companyName: string;
  };
  pocs: PocEntry[];
  statusOptions: Record<ChannelKey, string[]>;
};

export type SavePayload = {
  contactId: number;
  channel: ChannelKey;
  status?: string;
  remarks?: string | null;
  nextActionText?: string | null;
  nextActionAt?: string | Date | null;
};

export const CHANNEL_ORDER: ChannelKey[] = [
  "linkedin",
  "email",
  "whatsapp",
  "call",
  "channel_partner",
];

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => {
      if (!part) return part;
      if (/^\\d+(st|nd|rd|th)$/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function formatChannelLabel(channel: ChannelKey) {
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

export function useLeadPocOutreach(leadId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  const query = useQuery<LeadPocOutreachResponse>({
    queryKey: ["lead-poc-outreach", leadId],
    queryFn: () =>
      apiRequest("GET", `/lead-poc-outreach/lead/${leadId}`).then((r) => r.json()),
    enabled: Number.isFinite(leadId) && leadId > 0,
  });

  useEffect(() => {
    if (!query.data?.pocs?.length) return;

    const hasSelected = query.data.pocs.some((poc) => poc.slot === selectedSlot);
    if (!hasSelected) {
      setSelectedSlot(query.data.pocs[0].slot);
    }
  }, [query.data, selectedSlot]);

  const selectedPoc = useMemo(() => {
    if (!query.data?.pocs?.length) return null;
    return (
      query.data.pocs.find((poc) => poc.slot === selectedSlot) ?? query.data.pocs[0]
    );
  }, [query.data, selectedSlot]);

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
        `/lead-poc-outreach/lead/${leadId}`,
        payload
      );
      return response.json();
    },
    onMutate: async ({ rowKey, payload }) => {
      setSavingRowKey(rowKey);

      await queryClient.cancelQueries({
        queryKey: ["lead-poc-outreach", leadId],
      });

      const previousData = queryClient.getQueryData<LeadPocOutreachResponse>([
        "lead-poc-outreach",
        leadId,
      ]);

      if (previousData) {
        const optimisticNow = new Date().toISOString();

        const nextData: LeadPocOutreachResponse = {
          ...previousData,
          pocs: previousData.pocs.map((poc) => {
            if (poc.contact.id !== payload.contactId) return poc;

            return {
              ...poc,
              channels: {
                ...poc.channels,
                [payload.channel]: {
                  id: poc.channels[payload.channel]?.id ?? 0,
                  channel: payload.channel,
                  status:
                    payload.status !== undefined
                      ? payload.status
                      : poc.channels[payload.channel]?.status ?? null,
                  initiatedAt:
                    payload.status === "initiated" &&
                    !poc.channels[payload.channel]?.initiatedAt
                      ? optimisticNow
                      : poc.channels[payload.channel]?.initiatedAt ?? null,
                  lastUpdatedAt: optimisticNow,
                  remarks:
                    payload.remarks !== undefined
                      ? payload.remarks
                      : poc.channels[payload.channel]?.remarks ?? null,
                  nextActionText:
                    payload.nextActionText !== undefined
                      ? payload.nextActionText
                      : poc.channels[payload.channel]?.nextActionText ?? null,
                  nextActionAt:
                    payload.nextActionAt !== undefined
                      ? payload.nextActionAt
                        ? new Date(payload.nextActionAt).toISOString()
                        : null
                      : poc.channels[payload.channel]?.nextActionAt ?? null,
                },
              },
            };
          }),
        };

        queryClient.setQueryData(["lead-poc-outreach", leadId], nextData);
      }

      return { previousData };
    },
    onSuccess: async (_, { payload }) => {
      await queryClient.invalidateQueries({
        queryKey: ["lead-poc-outreach", leadId],
      });

      if (payload.channel === "email" && payload.status === "initiated") {
        toast({
          title: "Email outreach initiated",
          description: "Scheduled follow-up tasks were created automatically.",
        });
      }
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["lead-poc-outreach", leadId], context.previousData);
      }

      toast({
        title: "Failed to save outreach update",
        description:
          err?.message || "Something went wrong while saving outreach data.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSavingRowKey(null);
    },
  });

  const saveOutreachUpdate = ({
    rowKey,
    payload,
  }: {
    rowKey: string;
    payload: SavePayload;
  }) => {
    saveMutation.mutate({ rowKey, payload });
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    selectedSlot,
    setSelectedSlot,
    selectedPoc,

    savingRowKey,
    isSavingRow: (rowKey: string) =>
      savingRowKey === rowKey || saveMutation.isPending,

    saveOutreachUpdate,
  };
}