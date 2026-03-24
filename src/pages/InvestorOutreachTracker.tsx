import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { activityTypeOptions, statusOptions } from "@/components/OutreachTracker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Props = {
  investorId: number;
  investorName: string;
  onClose: () => void;
};

type InvestorOutreachActivity = {
  id: number;
  activityType: string;
  status: string;
  notes?: string | null;
  followUpDate?: string | null;
  createdAt: string;
};

export default function InvestorOutreachTracker({ investorId, investorName, onClose }: Props) {
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    activityType: "",
    status: "",
    followUpDate: "",
    notes: "",
  });

  const { data: activities = [], isLoading } = useQuery<InvestorOutreachActivity[]>({
    queryKey: ["/investors/outreach-activities", investorId],
    queryFn: () => apiRequest("GET", `/investors/${investorId}/outreach-activities`).then((r) => r.json()),
    enabled: Number.isFinite(investorId) && investorId > 0,
  });

  const rows = useMemo(() => activities ?? [], [activities]);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        activityType: form.activityType,
        status: form.status,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
        notes: form.notes || null,
      };

      const res = await apiRequest("POST", `/investors/${investorId}/outreach-activities`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/investors/outreach-activities", investorId] });
      setOpen(false);
      setForm({ activityType: "", status: "", followUpDate: "", notes: "" });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="min-w-0">
          <div className="text-lg font-semibold">Manage Outreach</div>
          <div className="text-sm text-muted-foreground truncate">{investorName}</div>
        </div>

        <div className="ml-auto">
          intake
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Outreach
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outreach History</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No outreach activities yet.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">
                      {r.activityType} • {r.status}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {r.notes ? <div className="text-sm mt-1 text-muted-foreground">{r.notes}</div> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Outreach</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="text-sm mb-1">Activity Type</div>
              <Select value={form.activityType} onValueChange={(v) => setForm((p) => ({ ...p, activityType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select activity type" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="text-sm mb-1">Status</div>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <div className="text-sm mb-1">Next Follow-up Date</div>
              <Input
                type="datetime-local"
                value={form.followUpDate}
                onChange={(e) => setForm((p) => ({ ...p, followUpDate: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <div className="text-sm mb-1">Notes</div>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Add notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!form.activityType || !form.status || create.isPending}
            >
              {create.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
