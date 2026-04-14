import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type InvestorChannelKey =
  | "linkedin"
  | "email"
  | "whatsapp"
  | "call"
  | "channel_partner"
  | "other";

export type InvestorStatusRecord = {
  id: number;
  channel: InvestorChannelKey;
  status: string | null;
  initiatedAt: string | null;
  lastUpdatedAt: string | null;
  remarks: string | null;
  nextActionText: string | null;
  nextActionAt: string | null;
  taskAssignedTo?: string | null;
};

export type InvestorPocContact = {
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

export type InvestorPocEntry = {
  slot: number;
  contact: InvestorPocContact;
  channels: {
    linkedin: InvestorStatusRecord | null;
    email: InvestorStatusRecord | null;
    whatsapp: InvestorStatusRecord | null;
    call: InvestorStatusRecord | null;
    channel_partner: InvestorStatusRecord | null;
    other: InvestorStatusRecord | null;
  };
};

export type InvestorPocOutreachResponse = {
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
  pocs: InvestorPocEntry[];
  statusOptions: Record<InvestorChannelKey, string[]>;
};

export type InvestorSavePayload = {
  contactId: number;
  channel: InvestorChannelKey;
  status?: string;
  remarks?: string | null;
  nextActionText?: string | null;
  nextActionAt?: string | null;
  taskAssignedTo?: string | null;
};

export function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => {
      if (!part) return part;
      if (/^\d+(st|nd|rd|th)$/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function useInvestorPocOutreach(leadId: number, investorId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  const queryKey = ["investor-poc-outreach", leadId, investorId];

  const { data, isLoading, isError, error } = useQuery<InvestorPocOutreachResponse>({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/investor-poc-outreach/lead/${leadId}/investor/${investorId}`
      );
      return res.json();
    },
    enabled:
      Number.isFinite(leadId) &&
      leadId > 0 &&
      Number.isFinite(investorId) &&
      investorId > 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!data?.pocs?.length) return;
    const hasSelected = data.pocs.some((poc) => poc.slot === selectedSlot);
    if (!hasSelected) {
      setSelectedSlot(data.pocs[0].slot);
    }
  }, [data, selectedSlot]);

  const selectedPoc = useMemo(() => {
    if (!data?.pocs?.length) return null;
    return data.pocs.find((poc) => poc.slot === selectedSlot) ?? data.pocs[0] ?? null;
  }, [data, selectedSlot]);

  const saveMutation = useMutation({
    mutationFn: async ({
      rowKey,
      payload,
    }: {
      rowKey: string;
      payload: InvestorSavePayload;
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
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/leads/linked-investors", leadId] });
      queryClient.invalidateQueries({ queryKey: ["interventions", "scheduled"] });

      toast({
        title: "Investor outreach saved",
        description: "Linked investor status synced automatically.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to save investor outreach",
        description:
          err?.message || "Please try again. The latest change was not saved.",
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
    payload: InvestorSavePayload;
  }) => {
    saveMutation.mutate({ rowKey, payload });
  };

  return {
    data,
    isLoading,
    isError,
    error,
    selectedSlot,
    setSelectedSlot,
    selectedPoc,
    savingRowKey,
    saveOutreachUpdate,
  };
}