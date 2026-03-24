import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, ExternalLink, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import PitchingManagementForm from "./PitchingManagementForm";

interface PitchingTrackerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  companyName: string;
}

export default function PitchingTrackerDialog({ open, onOpenChange, leadId, companyName }: PitchingTrackerDialogProps) {
  const [showForm, setShowForm] = useState(false);

  // Fetch Data
  const { data: details, isLoading } = useQuery({
    queryKey: ["pitching", leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/pitching`);
      return res.json();
    },
    enabled: open,
  });

  // Helper for Status Icon
  const StatusIcon = ({ check }: { check: boolean }) => (
    check ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-300 mx-auto" />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="text-xl">Pitching Tracker - {companyName}</DialogTitle>
          
          {/* Add/Update Button (Top Right, but separate from close button) */}
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add / Update Pitching Details
            </Button>
          )}
        </DialogHeader>

        {showForm ? (
          // --- LAYER 2: THE FORM ---
          <PitchingManagementForm 
            leadId={leadId} 
            initialData={details} 
            onClose={() => setShowForm(false)} 
          />
        ) : (
          // --- LAYER 1: THE TRACKER TABLE ---
          <div className="space-y-4 py-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-center">G-Drive</TableHead>
                    <TableHead className="text-center">Solution Note</TableHead>
                    <TableHead className="text-center">PDM</TableHead>
                    <TableHead className="text-center">Meeting 1</TableHead>
                    <TableHead className="text-center">Meeting 2</TableHead>
                    <TableHead className="text-center">LOE Signed</TableHead>
                    <TableHead className="text-center">Inv. Check</TableHead>
                    <TableHead className="text-center">Mandate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24">Loading...</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      {/* 1. G-Drive */}
                      <TableCell className="text-center">
                        {details?.gdriveLink ? (
                          <a href={details.gdriveLink} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-5 w-5 text-blue-600 mx-auto" />
                          </a>
                        ) : <StatusIcon check={false} />}
                      </TableCell>

                      {/* 2. Solution Note */}
                      <TableCell className="text-center"><StatusIcon check={!!details?.solutionNotePath} /></TableCell>

                      {/* 3. PDM */}
                      <TableCell className="text-center"><StatusIcon check={!!details?.pdmPath} /></TableCell>

                      {/* 4. Meeting 1 */}
                      <TableCell className="text-center">
                        <StatusIcon check={!!details?.meeting1Date} />
                        {details?.meeting1Date && <div className="text-[10px] text-muted-foreground mt-1">{new Date(details.meeting1Date).toLocaleDateString()}</div>}
                      </TableCell>

                      {/* 5. Meeting 2 */}
                      <TableCell className="text-center">
                        <StatusIcon check={!!details?.meeting2Date} />
                        {details?.meeting2Date && <div className="text-[10px] text-muted-foreground mt-1">{new Date(details.meeting2Date).toLocaleDateString()}</div>}
                      </TableCell>

                      {/* 6. LOE */}
                      <TableCell className="text-center"><StatusIcon check={!!details?.loeSigned} /></TableCell>

                      {/* 7. Investor Check */}
                      <TableCell className="text-center"><StatusIcon check={!!details?.investorCheckNotes} /></TableCell>

                      {/* 8. Mandate */}
                      <TableCell className="text-center"><StatusIcon check={!!details?.mandateSigned} /></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="text-xs text-muted-foreground italic text-center">
              * Click "Add / Update Pitching Details" to upload files or update status.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}