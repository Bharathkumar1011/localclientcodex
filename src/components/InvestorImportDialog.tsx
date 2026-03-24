import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Upload, AlertCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface InvestorImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InvestorImportDialog({ open, onOpenChange }: InvestorImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  // 1. Preview Mutation
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/investors/import?preview=true", { 
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Preview failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.preview && data.data) {
        setPreviewData(data.data);
      } else {
        toast({ title: "Info", description: "No valid rows found in CSV." });
      }
    },
    onError: (err) => {
      toast({ title: "Error", description: "Failed to parse CSV.", variant: "destructive" });
    }
  });

  // 2. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/investors/import", { 
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Import Successful", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      handleClose();
    },
    onError: (err) => {
      toast({ title: "Error", description: "Failed to import investors.", variant: "destructive" });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileToUpload(f);
      previewMutation.mutate(f);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    setFileToUpload(null);
    setPreviewData(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Investors</DialogTitle>
          <DialogDescription>
            Upload a CSV file. The system will auto-detect multiple POCs (e.g. POC 1, POC 2...).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!previewData ? (
            // Upload State
            <div className="flex flex-col items-center gap-4 py-8">
              <Button 
                variant="outline" 
                className="w-full h-32 border-2 border-dashed flex flex-col gap-2 bg-muted/10 hover:bg-muted/20"
                onClick={() => fileRef.current?.click()}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {previewMutation.isPending ? "Analyzing CSV..." : "Click to Select CSV File"}
                </span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            // Preview State
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Found <strong>{previewData.length}</strong> valid investors. Review below.</span>
              </div>

              <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground font-medium sticky top-0">
                    <tr>
                      <th className="p-2 border-b">Organization</th>
                      <th className="p-2 border-b">Type</th> {/* ✅ Add This */}
                      <th className="p-2 border-b">Sector</th>
                      <th className="p-2 border-b">Primary POC</th>
                      <th className="p-2 border-b">Designation</th> {/* ✅ ADD THIS LINE */}
                      <th className="p-2 border-b">Total POCs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {previewData.slice(0, 50).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/50">
                        <td className="p-2 font-medium">{row.organization}</td>
                        <td className="p-2">{row.investorType}</td> {/* ✅ Add This */}
                        <td className="p-2">{row.sector}</td>
                        <td className="p-2">{row.firstPoc}</td>

                        {/* ✅ ADD THIS NEW CELL */}
                        <td className="p-2 text-muted-foreground">
                          {row.contacts?.[0]?.designation || "Investor"}
                        </td>

                        
                        <td className="p-2">
                            <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                <Users className="h-3 w-3" />
                                {row.pocCount}
                            </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 50 && (
                  <div className="p-2 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                    ... and {previewData.length - 50} more rows
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setPreviewData(null); setFileToUpload(null); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (fileToUpload) uploadMutation.mutate(fileToUpload);
                  }}
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...
                    </>
                  ) : (
                    "Confirm & Import"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}