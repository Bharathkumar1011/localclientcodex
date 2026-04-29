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
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
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

              <div className="border rounded-md overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground font-medium sticky top-0">
                    <tr>
                      <th className="p-2 border-b min-w-[220px]">Organization</th>
                      <th className="p-2 border-b min-w-[120px]">Type</th>
                      <th className="p-2 border-b min-w-[140px]">Sector</th>
                      <th className="p-2 border-b min-w-[180px]">Primary POC</th>
                      <th className="p-2 border-b min-w-[120px]">Total POCs</th>
                      <th className="p-2 border-b min-w-[520px]">POC Details Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {previewData.slice(0, 50).map((row: any, i: number) => {
                      const poc1 = row.contacts?.[0] || null;
                      const poc2 = row.contacts?.[1] || null;

                      return (
                        <tr key={i} className="hover:bg-muted/50 align-top">
                          <td className="p-2 font-medium align-top">{row.organization || "-"}</td>
                          <td className="p-2 align-top">{row.investorType || "-"}</td>
                          <td className="p-2 align-top">{row.sector || "-"}</td>
                          <td className="p-2 align-top">{row.firstPoc || "No POC"}</td>
                          <td className="p-2 align-top">
                            <Badge variant="secondary" className="flex w-fit items-center gap-1">
                              <Users className="h-3 w-3" />
                              {row.pocCount}
                            </Badge>
                          </td>

                          <td className="p-2 align-top">
                            <div className="space-y-3">
                              {poc1 ? (
                                <div className="rounded-md border bg-slate-50 p-3">
                                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    POC 1
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div><span className="font-medium">Name:</span> {poc1.name || "-"}</div>
                                    <div><span className="font-medium">Designation:</span> {poc1.designation || "-"}</div>
                                    <div><span className="font-medium">Phone:</span> {poc1.phone || "-"}</div>
                                    <div><span className="font-medium">Email:</span> {poc1.email || "-"}</div>
                                    <div className="col-span-2 break-all">
                                      <span className="font-medium">LinkedIn:</span> {poc1.linkedinProfile || "-"}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No POC 1 detected</div>
                              )}

                              {poc2 && (
                                <div className="rounded-md border bg-slate-50 p-3">
                                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    POC 2
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div><span className="font-medium">Name:</span> {poc2.name || "-"}</div>
                                    <div><span className="font-medium">Designation:</span> {poc2.designation || "-"}</div>
                                    <div><span className="font-medium">Phone:</span> {poc2.phone || "-"}</div>
                                    <div><span className="font-medium">Email:</span> {poc2.email || "-"}</div>
                                    <div className="col-span-2 break-all">
                                      <span className="font-medium">LinkedIn:</span> {poc2.linkedinProfile || "-"}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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