import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Download, FileText } from "lucide-react";
import {
  useLeadPitching,
  buildPitchingFormData,
  type LeadPitchingFormData,
} from "@/components/managepitching/useLeadPitching";

import { apiFetch } from "@/lib/apiFetch";
interface PitchingManagementFormProps {
  leadId: number;
  initialData: any;
  onClose: () => void;
}

export default function PitchingManagementForm({ leadId, initialData, onClose }: PitchingManagementFormProps) {
const {
    details,
    isSaving,
    isUploading,
    savePitchingDetails,
    uploadPitchingFile,
  } = useLeadPitching(leadId);

  const pitchingData = details ?? initialData;

  // State for form fields
  const [formData, setFormData] = useState<LeadPitchingFormData>(() =>
    buildPitchingFormData(initialData)
  );

  // Load / refresh form data from shared pitching source
  useEffect(() => {
    setFormData(buildPitchingFormData(pitchingData));
  }, [pitchingData]);

  // Mutation: Save Text/Dates/Booleans


  // Mutation: Upload File


  // Helper to handle file selection
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "solutionNote" | "pdm"
  ) => {
    if (e.target.files && e.target.files[0]) {
      uploadPitchingFile({ file: e.target.files[0], type });
    }
  };

const handleDownload = async (
  type: "solutionNote" | "pdm",
  filename?: string
) => {
  if (!filename) return;

  try {
    const res = await apiFetch(`/leads/${leadId}/pitching/download/${type}`, {
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
  } catch (error) {
    console.error("Pitching file download failed:", error);
  }
};

  return (
    <div className="space-y-6 py-4">
      {/* 1. G-Drive Link */}
      <div className="space-y-2">
        <Label>G-Drive Link</Label>
        <Input 
          value={formData.gdriveLink} 
          onChange={(e) => setFormData({...formData, gdriveLink: e.target.value})} 
          placeholder="Paste Google Drive folder link..." 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Solution Note Upload */}
        <div className="space-y-2 border p-3 rounded-md">
          <Label>Solution Note (PDF)</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, "solutionNote")} disabled={isUploading} />
            {pitchingData?.solutionNoteName && (
               <Button variant="outline" size="icon" onClick={() => handleDownload("solutionNote", pitchingData.solutionNoteName)} title="Download">
                 <Download className="h-4 w-4" />
               </Button>
            )}
          </div>
          {pitchingData?.solutionNoteName && <p className="text-xs text-green-600 flex items-center gap-1"><FileText className="h-3 w-3"/> {pitchingData.solutionNoteName}</p>}
        </div>

        {/* 3. PDM Upload */}
        <div className="space-y-2 border p-3 rounded-md">
          <Label>PDM (PDF)</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, "pdm")} disabled={isUploading} />
            {pitchingData?.pdmName && (
               <Button variant="outline" size="icon" onClick={() => handleDownload("pdm", pitchingData.pdmName)} title="Download">
                 <Download className="h-4 w-4" />
               </Button>
            )}
          </div>
          {pitchingData?.pdmName && <p className="text-xs text-green-600 flex items-center gap-1"><FileText className="h-3 w-3"/> {pitchingData.pdmName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 4. Meeting 1 */}
        <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
          <Label className="font-semibold text-blue-600">Meeting 1</Label>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={formData.meeting1Date} 
              onChange={(e) => setFormData({...formData, meeting1Date: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea 
              value={formData.meeting1Notes} 
              onChange={(e) => setFormData({...formData, meeting1Notes: e.target.value})} 
              placeholder="Key takeaways..."
            />
          </div>
        </div>

        {/* 5. Meeting 2 */}
        <div className="space-y-3 border p-3 rounded-md bg-gray-50/50">
          <Label className="font-semibold text-blue-600">Meeting 2</Label>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Date & Time</Label>
            <Input 
              type="datetime-local" 
              value={formData.meeting2Date} 
              onChange={(e) => setFormData({...formData, meeting2Date: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea 
              value={formData.meeting2Notes} 
              onChange={(e) => setFormData({...formData, meeting2Notes: e.target.value})} 
              placeholder="Key takeaways..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 6. LOE Toggle */}
        <div className="flex items-center justify-between border p-4 rounded-md">
          <div className="space-y-0.5 ">
            <Label className="text-base">LOE Signed</Label>
            <p className="text-xs text-muted-foreground">Has the Letter of Engagement been signed?</p>
          </div>
<Switch
  className="border border-slate-300 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300 [&>span]:bg-white [&>span]:border [&>span]:border-slate-300 [&>span]:shadow-sm"
  checked={formData.loeSigned}
  onCheckedChange={(checked) =>
    setFormData({ ...formData, loeSigned: checked })
  }
/>
        </div>

        {/* 7. Mandate Toggle */}
        <div className="flex items-center justify-between border p-4 rounded-md">
          <div className="space-y-0.5">
            <Label className="text-base">Mandate Signed</Label>
            <p className="text-xs text-muted-foreground">Is the mandate officially secured?</p>
          </div>
<Switch
  className="border border-slate-300 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300 [&>span]:bg-white [&>span]:border [&>span]:border-slate-300 [&>span]:shadow-sm"
  checked={formData.mandateSigned}
  onCheckedChange={(checked) =>
    setFormData({ ...formData, mandateSigned: checked })
  }
/>
        </div>
      </div>

      {/* 8. Investor Check */}
      <div className="space-y-2">
        <Label>Investor Check Notes</Label>
        <Textarea 
          value={formData.investorCheckNotes} 
          onChange={(e) => setFormData({...formData, investorCheckNotes: e.target.value})} 
          placeholder="Add notes about investor background checks or feedback..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => savePitchingDetails(formData)} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Details
        </Button>
      </div>
    </div>
  );
}