import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";

export type PitchingFileType = "pdm";

export type LeadPitchingDetails = {
  id?: number;
  leadId?: number;

  pdmPath?: string | null;
  pdmName?: string | null;
  pdmNextActionText?: string | null;
  pdmNextActionAt?: string | null;
  pdmTaskAssignedTo?: string | null;
  pdmRemarks?: string | null;

  meeting1Date?: string | null;
  meeting1Notes?: string | null;
  meeting1NextActionText?: string | null;
  meeting1NextActionAt?: string | null;
  meeting1TaskAssignedTo?: string | null;
  meeting1Remarks?: string | null;

  meeting2Date?: string | null;
  meeting2Notes?: string | null;
  meeting2NextActionText?: string | null;
  meeting2NextActionAt?: string | null;
  meeting2TaskAssignedTo?: string | null;
  meeting2Remarks?: string | null;

  loeSigned?: boolean | null;
  loeNextActionText?: string | null;
  loeNextActionAt?: string | null;
  loeTaskAssignedTo?: string | null;
  loeRemarks?: string | null;

  investorCheckNotes?: string | null;

  mandateSigned?: boolean | null;
  mandateNextActionText?: string | null;
  mandateNextActionAt?: string | null;
  mandateTaskAssignedTo?: string | null;
  mandateRemarks?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type SavePitchingPayload = Partial<LeadPitchingDetails>;

// kept only for compatibility with existing imports if any old file still uses it
export type LeadPitchingFormData = SavePitchingPayload;

export function buildPitchingFormData(
  initialData?: Partial<LeadPitchingDetails> | null
): LeadPitchingFormData {
  return {
    ...(initialData || {}),
  };
}

function normalizePitchingPayload(data: SavePitchingPayload): SavePitchingPayload {
  const payload: Record<string, any> = { ...data };

  const dateFields = [
    "pdmNextActionAt",
    "meeting1Date",
    "meeting1NextActionAt",
    "meeting2Date",
    "meeting2NextActionAt",
    "loeNextActionAt",
    "mandateNextActionAt",
  ];

  for (const field of dateFields) {
    if (field in payload) {
      if (payload[field] === "" || payload[field] === undefined) {
        payload[field] = null;
      }
    }
  }

  const assigneeFields = [
    "pdmTaskAssignedTo",
    "meeting1TaskAssignedTo",
    "meeting2TaskAssignedTo",
    "loeTaskAssignedTo",
    "mandateTaskAssignedTo",
  ];

  for (const field of assigneeFields) {
    if (field in payload) {
      if (payload[field] === "" || payload[field] === undefined) {
        payload[field] = null;
      }
    }
  }

  return payload;
}

export function useLeadPitching(leadId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<LeadPitchingDetails>({
    queryKey: ["lead-pitching", leadId],
    queryFn: () =>
      apiRequest("GET", `/leads/${leadId}/pitching`).then((r) => r.json()),
    enabled: Number.isFinite(leadId) && leadId > 0,
  });

const refreshPitching = async () => {
  await queryClient.invalidateQueries({
    queryKey: ["lead-pitching", leadId],
  });

  await queryClient.invalidateQueries({
    queryKey: ["activity-log", leadId],
  });

  await queryClient.invalidateQueries({
    queryKey: ["interventions", "scheduled"],
  });
};

  const saveMutation = useMutation<
    void,
    Error,
    { data: SavePitchingPayload; silent?: boolean }
  >({
    mutationFn: async ({ data }) => {
      const payload = normalizePitchingPayload(data);
      await apiRequest("POST", `/leads/${leadId}/pitching`, payload);
    },
    onSuccess: async (_result, variables) => {
      await refreshPitching();

      if (!variables?.silent) {
        toast({ title: "Pitching details saved successfully" });
      }
    },
    onError: (_error, variables) => {
      toast({
        title: variables?.silent
          ? "Pitching autosave failed"
          : "Failed to save pitching details",
        variant: "destructive",
      });
    },
  });

const uploadMutation = useMutation<
  Response,
  Error,
  { file: File; type: PitchingFileType }
>({
  mutationFn: async ({ file, type }) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", type);

const response = await apiFetch(`/api/leads/${leadId}/pitching/upload`, {
  method: "POST",
  body: formData,
});

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Upload failed");
    }

    return response;
  },
  onSuccess: async (_result, variables) => {
    await refreshPitching();

    toast({
      title: "PDM uploaded successfully",
    });
  },
  onError: (error: any) => {
    toast({
      title: "File upload failed",
      description: error?.message || "Upload failed",
      variant: "destructive",
    });
  },
});

  const previewPitchingFile = async (type: PitchingFileType) => {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/pitching/preview/${type}`, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Preview failed");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      window.open(blobUrl, "_blank");

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error: any) {
      toast({
        title: "Failed to preview file",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const downloadPitchingFile = async (
    type: PitchingFileType,
    filename?: string | null
  ) => {
    if (!filename) return;

    try {
      const res = await apiFetch(`/api/leads/${leadId}/pitching/download/${type}`, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Download failed");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Failed to download file",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  return {
    details: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    refreshPitching,

    isSaving: saveMutation.isPending,
    savePitchingDetails: (
      data: SavePitchingPayload,
      options?: { silent?: boolean }
    ) => saveMutation.mutate({ data, silent: options?.silent ?? false }),

    isUploading: uploadMutation.isPending,
    uploadPitchingFile: ({
      file,
      type,
    }: {
      file: File;
      type: PitchingFileType;
    }) => uploadMutation.mutate({ file, type }),

    previewPitchingFile,
    downloadPitchingFile,
  };
}