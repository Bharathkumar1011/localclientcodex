import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Loader2, SquarePen } from "lucide-react";
import {
  RELATIONSHIP_STATUS_OPTIONS,
  formatStageLabel,
  getRelationshipStatusClass,
  getRelationshipStatusLabel,
} from "./epnReportUtils";

type Props = {
  row: {
    epnId: number;
    leadId: number;
    rmName: string;
    leadName: string;
    relationshipStatus?: string | null;
    linkRemarks?: string | null;
    leadStage?: string | null;
    rmStage?: string | null;
  };
};

export function EpnLinkActionsDialog({ row }: Props) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const initialStatus = row.relationshipStatus || "yet_to_contact";
  const initialRemarks = row.linkRemarks || "";

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [remarks, setRemarks] = useState(initialRemarks);

  useEffect(() => {
    if (open) {
      setStatus(initialStatus);
      setRemarks(initialRemarks);
    }
  }, [open, initialStatus, initialRemarks]);

  const hasChanges = useMemo(() => {
    return status !== initialStatus || remarks !== initialRemarks;
  }, [status, remarks, initialStatus, initialRemarks]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const calls: Promise<any>[] = [];

      if (status !== initialStatus) {
        calls.push(
          apiRequest("PATCH", `/epn/${row.epnId}/link-lead/${row.leadId}/status`, {
            status,
          })
        );
      }

      if (remarks !== initialRemarks) {
        calls.push(
          apiRequest("PATCH", `/epn/${row.epnId}/link-lead/${row.leadId}/remarks`, {
            remarks,
          })
        );
      }

      if (calls.length === 0) return;
      await Promise.all(calls);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["/epn/reports/idfc-lead-tracker"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/epn/reports/idfc-rm-summary"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["/epn/reports/epn-level"],
        }),
        queryClient.invalidateQueries({
          queryKey: [`/epn/linked-to-lead/${row.leadId}`],
        }),
      ]);

      toast({
        title: "Link details updated",
        description: "Relationship status and remarks were saved successfully.",
      });

      setOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: "Could not save the relationship status or remarks.",
      });
    },
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <SquarePen className="mr-2 h-4 w-4" />
        Actions
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Update Link Details</DialogTitle>
            <DialogDescription>
              Manage the RM to lead relationship status and remarks without leaving the report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    RM / Partner
                  </p>
                  <p className="mt-1 font-medium">{row.rmName}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Lead
                  </p>
                  <p className="mt-1 font-medium">{row.leadName}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Current Lead Stage
                  </p>
                  <p className="mt-1">{formatStageLabel(row.leadStage)}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Current RM Stage
                  </p>
                  <p className="mt-1">{formatStageLabel(row.rmStage)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Relationship Status</p>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship status" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_STATUS_OPTIONS.filter(
                    (option) => option.value !== "all"
                  ).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="pt-1">
                <Badge
                  variant="outline"
                  className={getRelationshipStatusClass(status)}
                >
                  {getRelationshipStatusLabel(status)}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Link Remarks</p>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add relationship notes here..."
                className="min-h-[130px]"
              />
              <p className="text-xs text-muted-foreground">
                These are RM ↔ Lead link remarks, separate from the lead’s own notes.
              </p>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                onClick={() => setLocation(`/leads/${row.leadId}/edit`)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Lead Remarks
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>

                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!hasChanges || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}