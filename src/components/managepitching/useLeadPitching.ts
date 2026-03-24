import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type LeadPitchingDetails = {
  id?: number;
  leadId?: number;
  gdriveLink?: string | null;

  solutionNotePath?: string | null;
  solutionNoteName?: string | null;

  pdmPath?: string | null;
  pdmName?: string | null;

  meeting1Date?: string | null;
  meeting1Notes?: string | null;

  meeting2Date?: string | null;
  meeting2Notes?: string | null;

  loeSigned?: boolean | null;
  investorCheckNotes?: string | null;
  mandateSigned?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LeadPitchingFormData = {
  gdriveLink: string;
  meeting1Date: string;
  meeting1Notes: string;
  meeting2Date: string;
  meeting2Notes: string;
  loeSigned: boolean;
  investorCheckNotes: string;
  mandateSigned: boolean;
};

export function buildPitchingFormData(
  initialData?: Partial<LeadPitchingDetails> | null
): LeadPitchingFormData {
  return {
    gdriveLink: initialData?.gdriveLink || "",
    meeting1Date: initialData?.meeting1Date
      ? new Date(initialData.meeting1Date).toISOString().slice(0, 16)
      : "",
    meeting1Notes: initialData?.meeting1Notes || "",
    meeting2Date: initialData?.meeting2Date
      ? new Date(initialData.meeting2Date).toISOString().slice(0, 16)
      : "",
    meeting2Notes: initialData?.meeting2Notes || "",
    loeSigned: !!initialData?.loeSigned,
    investorCheckNotes: initialData?.investorCheckNotes || "",
    mandateSigned: !!initialData?.mandateSigned,
  };
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
  };

  const saveMutation = useMutation({
    mutationFn: async (data: LeadPitchingFormData) => {
      const payload = {
        ...data,
        meeting1Date: data.meeting1Date || null,
        meeting2Date: data.meeting2Date || null,
      };

      await apiRequest("POST", `/leads/${leadId}/pitching`, payload);
    },
    onSuccess: async () => {
      await refreshPitching();
      toast({ title: "Pitching details saved successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to save pitching details",
        variant: "destructive",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      type,
    }: {
      file: File;
      type: "solutionNote" | "pdm";
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", type);

      const response = await fetch(`/leads/${leadId}/pitching/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      return response;
    },
    onSuccess: async (_, variables) => {
      await refreshPitching();

      toast({
        title:
          variables.type === "solutionNote"
            ? "Solution note uploaded successfully"
            : "PDM uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "File upload failed",
        variant: "destructive",
      });
    },
  });

  return {
    details: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    refreshPitching,

    isSaving: saveMutation.isPending,
    savePitchingDetails: (data: LeadPitchingFormData) =>
      saveMutation.mutate(data),

    isUploading: uploadMutation.isPending,
    uploadPitchingFile: ({
      file,
      type,
    }: {
      file: File;
      type: "solutionNote" | "pdm";
    }) => uploadMutation.mutate({ file, type }),
  };
}