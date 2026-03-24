import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch"; // ✅ Correct path
import { Loader2, Download, FileText, ArrowLeft } from "lucide-react";

export default function PitchingEditPage() {
  const [, params] = useRoute("/pitching/:id/edit");
  const [, setLocation] = useLocation();
  const leadId = params ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    gdriveLink: "",
    meeting1Date: "",
    meeting1Notes: "",
    meeting2Date: "",
    meeting2Notes: "",
    loeSigned: false,
    investorCheckNotes: "",
    mandateSigned: false,
  });

  const { data: initialData, isLoading } = useQuery({
    queryKey: ["pitching", leadId],
    queryFn: async () => (await apiFetch(`/api/leads/${leadId}/pitching`)).json()
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        gdriveLink: initialData.gdriveLink || "",
        meeting1Date: initialData.meeting1Date ? new Date(initialData.meeting1Date).toISOString().slice(0, 16) : "",
        meeting1Notes: initialData.meeting1Notes || "",
        meeting2Date: initialData.meeting2Date ? new Date(initialData.meeting2Date).toISOString().slice(0, 16) : "",
        meeting2Notes: initialData.meeting2Notes || "",
        loeSigned: initialData.loeSigned || false,
        investorCheckNotes: initialData.investorCheckNotes || "",
        mandateSigned: initialData.mandateSigned || false,
      });
    }
  }, [initialData]);

const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        meeting1Date: data.meeting1Date || null,
        meeting2Date: data.meeting2Date || null,
      };
      await apiRequest("POST", `/leads/${leadId}/pitching`, payload);
    },
    onSuccess: async () => {
      // ✅ AWAIT invalidation so data is fresh BEFORE we navigate
      await queryClient.invalidateQueries({ queryKey: ["pitching", leadId] });
      await queryClient.invalidateQueries({ queryKey: ["activity-log", leadId] });
      
      toast({ title: "Details saved" });
      setLocation(`/pitching/${leadId}`);
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: "solutionNote" | "pdm" }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileType", type);
      
      // ✅ Use apiFetch (It automatically adds your Supabase Auth Token)
      const res = await apiFetch(`/api/leads/${leadId}/pitching/upload`, { 
        method: "POST", 
        body: formData 
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pitching", leadId] });
      toast({ title: "File uploaded" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "solutionNote" | "pdm") => {
    if (e.target.files && e.target.files[0]) uploadMutation.mutate({ file: e.target.files[0], type });
  };

const handleDownload = async (type: string, filename: string) => {
    if (!filename) {
      toast({ title: "No file available", variant: "destructive" });
      return;
    }

    try {
      // 1. Use apiFetch to include Supabase tokens automatically
      const response = await apiFetch(`/api/leads/${leadId}/pitching/download/${type}`);
      
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      // 2. Convert the response to a Blob (Binary Large Object)
      const blob = await response.blob();
      
      // 3. Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // 4. Create a hidden anchor element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename); // Set the filename
      document.body.appendChild(link);
      
      // 5. Trigger click and clean up
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Download error:", error);
      toast({ 
        title: "Download failed", 
        description: "Could not retrieve the file from the server.",
        variant: "destructive" 
      });
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="bg-white w-full max-w-3xl rounded-lg border shadow-sm p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b pb-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/pitching/${leadId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-xl font-bold">Edit Pitching Details</h1>
        </div>

        {/* G-Drive */}
        <div className="space-y-2">
          <Label>G-Drive Link</Label>
          <Input 
            value={formData.gdriveLink} 
            onChange={(e) => setFormData({...formData, gdriveLink: e.target.value})} 
            placeholder="Paste Google Drive link..." 
          />
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 border p-3 rounded-md">
            <Label>Solution Note (PDF)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, "solutionNote")} disabled={uploadMutation.isPending} />
              {initialData?.solutionNoteName && (
                 <Button variant="outline" size="icon" onClick={() => handleDownload("solutionNote", initialData.solutionNoteName)}><Download className="h-4 w-4" /></Button>
              )}
            </div>
            {initialData?.solutionNoteName && <p className="text-xs text-green-600 flex gap-1"><FileText className="h-3 w-3"/> {initialData.solutionNoteName}</p>}
          </div>

          <div className="space-y-2 border p-3 rounded-md">
            <Label>PDM (PDF)</Label>
            <div className="flex items-center gap-2">
              <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, "pdm")} disabled={uploadMutation.isPending} />
              {initialData?.pdmName && (
                 <Button variant="outline" size="icon" onClick={() => handleDownload("pdm", initialData.pdmName)}><Download className="h-4 w-4" /></Button>
              )}
            </div>
            {initialData?.pdmName && <p className="text-xs text-green-600 flex gap-1"><FileText className="h-3 w-3"/> {initialData.pdmName}</p>}
          </div>
        </div>

        {/* Meetings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
            <Label className="font-semibold text-blue-600">Meeting 1</Label>
            <div className="space-y-2">
              <Label className="text-xs">Date & Time</Label>
              <Input type="datetime-local" value={formData.meeting1Date} onChange={(e) => setFormData({...formData, meeting1Date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formData.meeting1Notes} onChange={(e) => setFormData({...formData, meeting1Notes: e.target.value})} />
            </div>
          </div>

          <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
            <Label className="font-semibold text-blue-600">Meeting 2</Label>
            <div className="space-y-2">
              <Label className="text-xs">Date & Time</Label>
              <Input type="datetime-local" value={formData.meeting2Date} onChange={(e) => setFormData({...formData, meeting2Date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formData.meeting2Notes} onChange={(e) => setFormData({...formData, meeting2Notes: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
          <div className="flex items-center justify-between border p-4 rounded-md">
            <Label>LOE Signed</Label>
            <Switch
                checked={formData.loeSigned}
                onCheckedChange={(checked) => setFormData({ ...formData, loeSigned: checked })}
                className="
                    data-[state=unchecked]:bg-[#f5f5f5] 
                    data-[state=checked]:bg-blue-400/70  /* off-white when ON */

                        [&>span]:bg-white
    [&>span]:data-[state=checked]:bg-green-500
    [&>span]:data-[state=unchecked]:bg-gray-700
                "
                />
          </div>
          <div className="flex items-center justify-between border p-4 rounded-md ">
            <Label>Mandate Signed</Label>
            <Switch checked={formData.mandateSigned} onCheckedChange={(checked) => setFormData({...formData, mandateSigned: checked})} 
                 className="
                    data-[state=unchecked]:bg-[#f5f5f5] 
                    data-[state=checked]:bg-blue-400/70  /* off-white when ON */

                        [&>span]:bg-white
    [&>span]:data-[state=checked]:bg-green-500
    [&>span]:data-[state=unchecked]:bg-gray-700
                "
                />
          </div>
        </div>

        {/* Investor Check */}
        <div className="space-y-2">
          <Label>Investor Check Notes</Label>
          <Textarea value={formData.investorCheckNotes} onChange={(e) => setFormData({...formData, investorCheckNotes: e.target.value})} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setLocation(`/pitching/${leadId}`)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Details
          </Button>
        </div>
      </div>
    </div>
  );
}