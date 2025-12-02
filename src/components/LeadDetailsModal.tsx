import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";



import type { Company, Lead } from "@/lib/types";

export default function LeadDetailsModal({
  open,
  onClose,
  company,
  lead,
}) {
  const { toast } = useToast();

    // -----------------------------
  // UPCOMING TASKS (Scheduled interventions, all leads)
  // -----------------------------
  // const {
  //   data: scheduledInterventions = [],
  //   isLoading: isLoadingScheduled,
  //   error: scheduledError,
  // } = useQuery({
  //   queryKey: ["/interventions/scheduled"],
  //   queryFn: async () => {
  //     const res = await apiFetch("/interventions/scheduled");
  //     if (!res.ok) {
  //       throw new Error("Failed to load scheduled interventions");
  //     }
  //     return res.json();
  //   },
  // });
    const {
    data: leadDetails,
    isLoading: isLoadingLeadDetails,
  } = useQuery({
    queryKey: ["lead-details", lead.id],
    queryFn: async () => {
      const res = await apiFetch(
        `${import.meta.env.VITE_API_URL}/leads/${lead.id}/details`
      );
      if (!res.ok) throw new Error("Failed to load lead details");
      return res.json();
    },
    enabled: open, // fetch only when modal is open
  });
  const upcomingTasksForLead = leadDetails?.upcomingTasks || [];



  // -----------------------------
  // STATE
  // -----------------------------
  const [remarks, setRemarks] = useState<any[]>([]);
  const [newRemark, setNewRemark] = useState("");

  // Actionables state
  const [actionables, setActionables] = useState<any[]>([]);
  const [newActionable, setNewActionable] = useState("");

  // -----------------------------
  // LOAD remarks + actionables when modal opens
  // -----------------------------
  useEffect(() => {
    if (!open) return;
    fetchRemarks();
    fetchActionables();
  }, [open]);

  async function fetchRemarks() {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/remarks`
    );
      const data = await res.json();
      setRemarks(data);
    } catch (err) {
      console.error("Failed to load remarks", err);
    }
  }

  async function fetchActionables() {
    try {
    const res = await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/actionables`
    );
      const data = await res.json();
      setActionables(data);
    } catch (err) {
      console.error("Failed to load actionables", err);
    }
  }

  // -----------------------------
  // ADD remark
  // -----------------------------
  async function handleAddRemark() {
    if (!newRemark.trim()) return;

    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: newRemark })
      });

      const created = await res.json();
      setRemarks((prev) => [...prev, created]);
      setNewRemark("");

      toast({ title: "Remark added" });
    } catch {
      toast({ variant: "destructive", title: "Failed to add remark" });
    }
  }

  // -----------------------------
  // DELETE remark
  // -----------------------------
  async function handleDeleteRemark(id: string) {
    try {
      await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/remarks/${id}`, {
        method: "DELETE"
      });

      setRemarks((prev) => prev.filter((r) => r.id !== id));

      toast({ title: "Remark removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete remark" });
    }
  }

  // -----------------------------
  // ACTIONABLES: ADD
  // -----------------------------
  async function handleAddActionable() {
    if (!newActionable.trim()) return;

    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/actionables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newActionable }),
      });

      const created = await res.json();
      setActionables((prev) => [...prev, created]);
      setNewActionable("");

      toast({ title: "Actionable added" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save actionable" });
    }
  }

  // -----------------------------
  // ACTIONABLES: DELETE
  // -----------------------------
  async function handleDeleteActionable(id: string) {
    try {
      await apiFetch(`${import.meta.env.VITE_API_URL}/leads/${lead.id}/actionables/${id}`, {
        method: "DELETE"      });

      setActionables((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Actionable removed" });
    } catch {
      toast({ variant: "destructive", title: "Failed to delete actionable" });
    }
  }

  

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm py-4">

          {/* Company Fields */}
          <div>
            <h4 className="font-semibold">Company Name</h4>
            <p>{company.name}</p>
          </div>

          <div>
            <h4 className="font-semibold">Sector</h4>
            <p>{company.sector || "Not provided"}</p>
          </div>

          <div>
            <h4 className="font-semibold">Headquartered City</h4>
            <p>{company.location || "Not provided"}</p>
          </div>

          <div>
            <h4 className="font-semibold">Year Established</h4>
            <p>{company.foundedYear || "Not provided"}</p>
          </div>

          <div>
            <h4 className="font-semibold">Financials</h4>
            <p>Revenue: {company.revenueInrCr || "N/A"} Cr</p>
            <p>EBITDA: {company.ebitdaInrCr || "N/A"} Cr</p>
            <p>PAT: {company.patInrCr || "N/A"} Cr</p>
          </div>

          {/* Remarks Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Remarks / Notes</h3>

            <textarea
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm h-24"
              placeholder="Write a remark and press Save..."
            />

            <Button onClick={handleAddRemark}>Save Remark</Button>


            {/* Actionables Section — MATCHES REMARKS DESIGN */}
            <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Other Actionables</h3>

            {/* Input for actionable */}
            <textarea
                value={newActionable}
                onChange={(e) => setNewActionable(e.target.value)}
                className="w-full border rounded-lg p-3 text-sm h-24"
                placeholder="Write an actionable and press Save..."
            />

            <Button onClick={handleAddActionable}>Save Actionable</Button>

            {/* List Actionables */}
            <div className="space-y-3 max-h-60 overflow-y-auto border-t pt-3">
                {actionables.map((a) => (
                <div
                    key={a.id}
                    className="border p-3 rounded-md flex justify-between items-start"
                >
                    <div>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-gray-400">
                        {new Date(a.createdAt).toLocaleString()}
                    </p>
                    </div>

                    <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteActionable(a.id)}
                    >
                    Delete
                    </Button>
                </div>
                ))}
            </div>
            </div>


            {/* Upcoming Tasks */}
            <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Upcoming Tasks</h3>

            {isLoadingLeadDetails ? (
                <p className="text-sm text-gray-400">Loading tasks...</p>
            ) : upcomingTasksForLead.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                No upcoming tasks for this lead.
                </p>
            ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto border-t pt-3">
                {upcomingTasksForLead.map((task: any) => (
                    <div key={task.id} className="border p-3 rounded-md">
                    <p className="text-sm font-medium capitalize">
                        {task.type?.replace("_", " ")}
                    </p>

                    {task.notes && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                        {task.notes}
                        </p>
                    )}

                    <p className="text-xs text-gray-400">
                        {new Date(task.scheduledAt).toLocaleString()}
                    </p>
                    </div>
                ))}
                </div>
            )}
            </div>



            {/* List Remarks */}
            <div className="space-y-3 max-h-60 overflow-y-auto border-t pt-3">
              {remarks.map((r) => (
                <div
                  key={r.id}
                  className="border p-3 rounded-md flex justify-between items-start"
                >
                  <div>
                    <p className="text-sm">{r.remark}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRemark(r.id)}
                  >
                    Delete
                  </Button>
                </div>               
              ))}
            </div>

          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
