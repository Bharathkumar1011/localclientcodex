import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ParsedRow = {
  name: string;
  designation: string;
  email: string;
  phoneNumber: string;
  linkedin: string;
  zone: string;
  city: string;
  state: string;
  bucket: string;
  stage: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBucket?: string;
  hideBucketSelector?: boolean; // ✅ NEW: Prop to control if the dropdown shows
};

export default function EpnBulkUpload({ 
  open, 
  onOpenChange, 
  defaultBucket = "idfc",
  hideBucketSelector = false // ✅ Defaults to false (will show dropdown)
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBucket, setSelectedBucket] = useState(defaultBucket);

  // ... (Keep your EXACT handleFileUpload, toggleSelection, toggleAll, uploadMutation, and handleClose functions here) ...
  // [Paste your existing functions here, no changes needed to them]
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split("\n").filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        toast({ title: "Error", description: "File seems empty or invalid", variant: "destructive" });
        return;
      }

      const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const headers = lines[0].split(splitRegex).map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      const nameIdx = headers.findIndex(h => h.includes("name"));
      const desigIdx = headers.findIndex(h => h.includes("designation"));
      const emailIdx = headers.findIndex(h => h.includes("email"));
      const phoneIdx = headers.findIndex(h => h.includes("phone"));
      const linkedinIdx = headers.findIndex(h => h.includes("linkedin"));
      const zoneIdx = headers.findIndex(h => h.includes("zone"));
      const cityIdx = headers.findIndex(h => h.includes("city"));
      const stateIdx = headers.findIndex(h => h.includes("state"));

      const rows: ParsedRow[] = [];
      const newSelected = new Set<number>();

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(splitRegex).map(val => val.trim().replace(/"/g, ''));
        if (row.length < 3) continue;

        rows.push({
          name: nameIdx !== -1 ? row[nameIdx] || "Unknown" : "Unknown",
          designation: desigIdx !== -1 ? row[desigIdx] || "" : "",
          email: emailIdx !== -1 ? row[emailIdx] || "" : "",
          phoneNumber: phoneIdx !== -1 ? row[phoneIdx] || "" : "",
          linkedin: linkedinIdx !== -1 ? row[linkedinIdx] || "" : "",
          zone: zoneIdx !== -1 ? row[zoneIdx] || "" : "",
          city: cityIdx !== -1 ? row[cityIdx] || "" : "",
          state: stateIdx !== -1 ? row[stateIdx] || "" : "",
          bucket: selectedBucket, // Uses state (which is defaultBucket if hidden)
          stage: "outreach", 
        });
        newSelected.add(rows.length - 1); 
      }

      if (rows.length === 0) {
         toast({ title: "Parse Error", description: "Could not read valid data from the CSV.", variant: "destructive" });
         return;
      }

      setParsedData(rows);
      setSelectedIndices(newSelected);
      setStep(2); 
    };
    reader.readAsText(file);
  };

  const toggleSelection = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedIndices(next);
  };

  const toggleAll = () => {
    if (selectedIndices.size === parsedData.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(parsedData.map((_, i) => i)));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const selectedPartners = parsedData.filter((_, i) => selectedIndices.has(i));
      const res = await apiRequest("POST", "/epn/bulk", { partners: selectedPartners });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/epn"] });
      toast({ title: "Success", description: `Successfully imported ${data.length || data.createdCount} partners!` });
      handleClose();
    },
    onError: () => {
      toast({ title: "Upload Failed", description: "Database rejected the bulk upload.", variant: "destructive" });
    }
  });

  const handleClose = () => {
    setStep(1);
    setParsedData([]);
    setSelectedIndices(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className={step === 2 ? "max-w-5xl" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="text-xl">Bulk Import Network Partners</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? (hideBucketSelector ? `Upload your CSV directly into the ${defaultBucket.toUpperCase()} bucket.` : "Select a destination bucket and upload your CSV.") 
              : `Review partners before importing into '${selectedBucket.toUpperCase()}'.`}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: UPLOAD AREA */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            
            {/* ✅ Conditionally render the dropdown based on hideBucketSelector */}
            {!hideBucketSelector && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Destination Bucket</label>
                <select 
                  className="w-full border border-gray-300 dark:border-neutral-700 rounded-md p-2 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedBucket}
                  onChange={(e) => setSelectedBucket(e.target.value)}
                >
                  <option value="idfc">IDFC Relationship Managers</option>
                  <option value="other_channel_partner">Other Channel Partners</option>
                  <option value="other_epn">Other External Partner Network</option>
                </select>
              </div>
            )}

            {/* The actual drag/drop box */}
            <div 
              className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="p-3 bg-white dark:bg-neutral-800 rounded-full shadow-sm mb-4">
                <UploadCloud className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Click to upload CSV</h3>
              <p className="text-xs text-gray-500 mb-4 text-center">
                Expected columns: Name, Designation, Email, Phone, Zone, City, State
              </p>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button className="bg-blue-600 hover:bg-blue-700 text-white pointer-events-none">
                Browse Files
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW TABLE */}
        {/* ... (Keep your EXACT Step 2 table rendering code here) ... */}
        {step === 2 && (
          <div className="space-y-4 mt-2">
            <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-3 rounded-md text-sm flex items-start gap-3 border border-green-200 dark:border-green-800/50">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5">File Parsed Successfully!</strong> 
                Found <strong>{parsedData.length}</strong> valid rows for the <strong>{selectedBucket}</strong> bucket.
              </div>
            </div>

            <div className="border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-neutral-900 sticky top-0 shadow-sm z-10 border-b dark:border-neutral-800">
                  <tr>
                    <th className="p-3 w-12 text-center">
                      <input type="checkbox" checked={selectedIndices.size === parsedData.length && parsedData.length > 0} onChange={toggleAll} className="rounded border-gray-300 w-4 h-4 cursor-pointer" />
                    </th>
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300">Partner Details</th>
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300">Contact</th>
                    <th className="p-3 font-semibold text-gray-600 dark:text-gray-300">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {parsedData.map((row, i) => (
                    <tr key={i} className={`transition-colors ${selectedIndices.has(i) ? "bg-white dark:bg-neutral-950" : "bg-gray-50 dark:bg-neutral-900 opacity-50"}`}>
                      <td className="p-3 text-center align-top pt-4">
                        <input type="checkbox" checked={selectedIndices.has(i)} onChange={() => toggleSelection(i)} className="rounded border-gray-300 w-4 h-4 cursor-pointer" />
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{row.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.designation || "No Designation"}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{row.email || "—"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.phoneNumber || "—"}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{row.city || row.state ? `${row.city}, ${row.state}` : "—"}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Zone: {row.zone || "—"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-800">
              <div className="text-sm font-medium text-gray-500">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedIndices.size}</span> selected for import
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back to Upload</Button>
                <Button 
                  onClick={() => uploadMutation.mutate()} 
                  disabled={selectedIndices.size === 0 || uploadMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {uploadMutation.isPending ? "Importing..." : `Import ${selectedIndices.size} Partners`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}