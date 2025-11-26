import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, FileText, CheckCircle } from "lucide-react";

interface DocumentGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  companyName: string;
  currentStage: string;
  targetStage: string;
  requiredDocument: string;
  onSuccess: () => void;
}

export function DocumentGateDialog({
  open,
  onOpenChange,
  leadId,
  companyName,
  currentStage,
  targetStage,
  requiredDocument,
  onSuccess,
}: DocumentGateDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    uploadDate: '',
    notes: '',
  });

  // Query to check if required document exists
  const { data: interventions = [], isLoading } = useQuery<any[]>({
    queryKey: ['/interventions/lead', leadId],
    enabled: open,
  });

  const documents = interventions.filter((i: any) => i.type === 'document');
  const hasRequiredDocument = documents.some((doc: any) => doc.documentName === requiredDocument);

  // Mutation to create document entry
  const createDocumentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/interventions', data),
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Document recorded successfully",
      });
      await queryClient.invalidateQueries({ queryKey: ['/interventions/lead', leadId], refetchType: 'active' });
      setFormData({ uploadDate: '', notes: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record document",
        variant: "destructive",
      });
    },
  });

  // Mutation to progress the stage
  const progressStageMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/leads/${leadId}/progress-stage`, {
      targetStage,
    }),
    onSuccess: async () => {
      toast({
        title: "Success",
        description: `Lead moved to ${targetStage} stage`,
      });
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to progress stage",
        variant: "destructive",
      });
    },
  });

  const handleSubmitDocument = () => {
    if (!formData.uploadDate) {
      toast({
        title: "Error",
        description: "Please select upload date",
        variant: "destructive",
      });
      return;
    }

    if (!formData.notes.trim()) {
      toast({
        title: "Error",
        description: "Please add notes about this document",
        variant: "destructive",
      });
      return;
    }

    createDocumentMutation.mutate({
      leadId,
      type: 'document',
      documentName: requiredDocument,
      scheduledAt: new Date(formData.uploadDate).toISOString(),
      notes: formData.notes,
    });
  };

  const handleProgressStage = () => {
    if (!hasRequiredDocument) {
      toast({
        title: "Error",
        description: `${requiredDocument} is required to proceed`,
        variant: "destructive",
      });
      return;
    }

    progressStageMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-document-gate">
        <DialogHeader>
          <DialogTitle>Move to {targetStage.charAt(0).toUpperCase() + targetStage.slice(1)}</DialogTitle>
          <DialogDescription>{companyName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Requirement Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">{requiredDocument}</span> is required to move from {currentStage} to {targetStage} stage.
            </AlertDescription>
          </Alert>

          {/* Document Status */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Document Status</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            ) : hasRequiredDocument ? (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    {requiredDocument} - Submitted
                  </p>
                  {documents
                    .filter((doc: any) => doc.documentName === requiredDocument)
                    .map((doc: any) => (
                      <p key={doc.id} className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {doc.notes}
                      </p>
                    ))}
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                  Ready
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    {requiredDocument} - Not Submitted
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Please record the document submission below
                  </p>
                </div>
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900">
                  Required
                </Badge>
              </div>
            )}
          </div>

          {/* Document Submission Form */}
          {!hasRequiredDocument && (
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-semibold text-sm">Record Document Submission</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uploadDate">Upload Date</Label>
                  <Input
                    id="uploadDate"
                    type="date"
                    value={formData.uploadDate}
                    onChange={(e) => setFormData({ ...formData, uploadDate: e.target.value })}
                    data-testid="input-gate-upload-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this document submission..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  data-testid="textarea-gate-notes"
                />
              </div>

              <Button
                onClick={handleSubmitDocument}
                disabled={createDocumentMutation.isPending}
                className="w-full"
                data-testid="button-submit-document"
              >
                {createDocumentMutation.isPending ? 'Saving...' : 'Submit Document'}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-gate"
          >
            Cancel
          </Button>
          <Button
            onClick={handleProgressStage}
            disabled={!hasRequiredDocument || progressStageMutation.isPending}
            data-testid="button-progress-stage"
          >
            {progressStageMutation.isPending ? 'Processing...' : `Move to ${targetStage.charAt(0).toUpperCase() + targetStage.slice(1)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
