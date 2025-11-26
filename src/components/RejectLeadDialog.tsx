import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface RejectLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  companyName: string;
  currentStage: string;
  onSuccess: () => void;
}

export function RejectLeadDialog({
  open,
  onOpenChange,
  leadId,
  companyName,
  currentStage,
  onSuccess,
}: RejectLeadDialogProps) {
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");

  // Mutation to reject the lead
  const rejectLeadMutation = useMutation({
    mutationFn: () => apiRequest('PATCH', `/leads/${leadId}/reject`, {
      rejectionReason: rejectionReason.trim(),
    }),
    onSuccess: async () => {
      toast({
        title: "Lead Rejected",
        description: "The lead has been moved to rejected stage",
      });
      // Invalidate Universe view (uses ['leads','all'] query key)
      await queryClient.invalidateQueries({ queryKey: ['leads', 'all'], refetchType: 'active' });
      // Invalidate current stage view
      await queryClient.invalidateQueries({ queryKey: ['leads', 'stage', currentStage], refetchType: 'active' });
      // Invalidate Rejected stage view to show the newly rejected lead
      await queryClient.invalidateQueries({ queryKey: ['leads', 'stage', 'rejected'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['activity-log'], refetchType: 'active' });
      setRejectionReason("");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject lead",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    rejectLeadMutation.mutate();
  };

  const handleCancel = () => {
    setRejectionReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-reject-lead">
        <DialogHeader>
          <DialogTitle>Reject Lead</DialogTitle>
          <DialogDescription>{companyName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Are you sure you want to reject this lead from <span className="font-semibold">{currentStage}</span> stage?
            </AlertDescription>
          </Alert>

          {/* Rejection Reason */}
          <div className="space-y-2">
            <Label htmlFor="rejectionReason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejectionReason"
              placeholder="Please provide a reason for rejecting this lead..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              data-testid="textarea-rejection-reason"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be recorded in the activity log
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={rejectLeadMutation.isPending}
            data-testid="button-cancel-reject"
          >
            No, Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejectLeadMutation.isPending || !rejectionReason.trim()}
            data-testid="button-confirm-reject"
          >
            {rejectLeadMutation.isPending ? 'Rejecting...' : 'Yes, Reject Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
