import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
import { useQueryClient } from "@tanstack/react-query";



import type { Company, Lead } from "@/lib/types";

export default function LeadDetailsModal({
  open,
  onClose,
  company,
  lead,
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();   // <-- add this line


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

    // Edit mode for lead/company fields
  // const [isEditingLead, setIsEditingLead] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(() => {
  return sessionStorage.getItem(`lead-is-editing-${company.id}`) === "true";
});

useEffect(() => {
  sessionStorage.setItem(
    `lead-is-editing-${company.id}`,
    isEditingLead.toString()
  );
}, [isEditingLead, company.id]);

type EditCompany = {
  name: string;
  sector: string;
  location: string;
  website: string;
  channelPartner: string;
  businessDescription: string;
  revenueInrCr: string;
  ebitdaInrCr: string;
  patInrCr: string;
};
  // Local editable copy of company fields
const [editCompany, setEditCompany] = useState(() => {
  const saved = sessionStorage.getItem(`lead-edit-company-${company.id}`);
  if (saved) return JSON.parse(saved);

  return {
    name: company.name || "",
    sector: company.sector || "",
    location: company.location || "",
    website: (company as any).website || "",
    channelPartner: (company as any).channelPartner || "",
    businessDescription: (company as any).businessDescription || "",
    revenueInrCr: company.revenueInrCr?.toString?.() ?? "",
    ebitdaInrCr: company.ebitdaInrCr?.toString?.() ?? "",
    patInrCr: company.patInrCr?.toString?.() ?? "",
  };
});
useEffect(() => {
  sessionStorage.setItem(
    `lead-edit-company-${company.id}`,
    JSON.stringify(editCompany)
  );
}, [editCompany, company.id]);



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
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Lead Details</DialogTitle>
          <div className="flex gap-2">
            {isEditingLead ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Reset local edits and exit edit mode
                    setEditCompany({
                      name: company.name || "",
                      sector: company.sector || "",
                      location: company.location || "",
                      website: (company as any).website || "",
                      channelPartner: (company as any).channelPartner || "",
                      businessDescription: (company as any).businessDescription || "",
                      revenueInrCr: company.revenueInrCr ?? "",
                      ebitdaInrCr: company.ebitdaInrCr ?? "",
                      patInrCr: company.patInrCr ?? "",
                    });
                    setIsEditingLead(false);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      // 1) Send update to backend (updates companies table in Neon)
                      await apiRequest("PUT", `/companies/${company.id}`, {
                        name: editCompany.name,
                        sector: editCompany.sector,
                        location: editCompany.location,
                        website: editCompany.website || null,
                        channelPartner: editCompany.channelPartner || null,
                        businessDescription: editCompany.businessDescription || null,
                        revenueInrCr: editCompany.revenueInrCr === "" ? null : editCompany.revenueInrCr,
                        ebitdaInrCr: editCompany.ebitdaInrCr === "" ? null : editCompany.ebitdaInrCr,
                        patInrCr: editCompany.patInrCr === "" ? null : editCompany.patInrCr,
                      });

                      // 2) Sync local company object so this modal shows new values immediately
                      company.name = editCompany.name;
                      company.sector = editCompany.sector;
                      company.location = editCompany.location;
                      (company as any).website = editCompany.website || null;
                      (company as any).channelPartner = editCompany.channelPartner || null;
                      (company as any).businessDescription = editCompany.businessDescription || null;
                      company.revenueInrCr =
                        editCompany.revenueInrCr === "" ? null : editCompany.revenueInrCr;
                      company.ebitdaInrCr =
                        editCompany.ebitdaInrCr === "" ? null : editCompany.ebitdaInrCr;
                      company.patInrCr =
                        editCompany.patInrCr === "" ? null : editCompany.patInrCr;

                      // 3) (Optional but recommended) refresh parent lists next time
                      await queryClient.invalidateQueries({ queryKey: ["leads"] });
                      await queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
                      
                      // 👇 Add these two lines:
                      sessionStorage.removeItem(`lead-edit-company-${company.id}`);
                      sessionStorage.removeItem(`lead-is-editing-${company.id}`);

                      toast({ title: "Lead updated" });
                      setIsEditingLead(false);
                    } catch (err: any) {
                      toast({
                        title: "Update failed",
                        description: err?.message || "Could not update lead",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditingLead(true)}>
                Edit Lead
              </Button>
            )}
          </div>
        </DialogHeader>


        <div className="space-y-4 text-sm py-4">

        {/* Company Fields + Financials */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Company Information</h3>

          {/* Company Name */}
          <div>
            <h4 className="font-semibold">Company Name</h4>
            {isEditingLead ? (
              <input
                className="border rounded px-2 py-1 w-full text-sm"
                value={editCompany.name}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({ ...c, name: e.target.value }))
                }
              />
            ) : (
              <p>{company.name || "Not provided"}</p>
            )}
          </div>

          {/* Sector */}
          <div>
            <h4 className="font-semibold">Sector</h4>
            {isEditingLead ? (
              <input
                className="border rounded px-2 py-1 w-full text-sm"
                value={editCompany.sector}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({ ...c, sector: e.target.value }))
                }
              />
            ) : (
              <p>{company.sector || "Not provided"}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <h4 className="font-semibold">Location</h4>
            {isEditingLead ? (
              <input
                className="border rounded px-2 py-1 w-full text-sm"
                value={editCompany.location}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({ ...c, location: e.target.value }))
                }
              />
            ) : (
              <p>{company.location || "Not provided"}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <h4 className="font-semibold">Website</h4>
            {isEditingLead ? (
              <input
                className="border rounded px-2 py-1 w-full text-sm"
                value={editCompany.website}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({ ...c, website: e.target.value }))
                }
              />
            ) : (company as any).website ? (
              <a
                href={(company as any).website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {(company as any).website}
              </a>
            ) : (
              <p>Not provided</p>
            )}
          </div>

          {/* Channel Partner */}
          <div>
            <h4 className="font-semibold">Channel Partner</h4>
            {isEditingLead ? (
              <input
                className="border rounded px-2 py-1 w-full text-sm"
                value={editCompany.channelPartner}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({ ...c, channelPartner: e.target.value }))
                }
              />
            ) : (
              <p>{(company as any).channelPartner || "Not provided"}</p>
            )}
          </div>

          {/* Business Description */}
          <div>
            <h4 className="font-semibold">Business Description</h4>
            {isEditingLead ? (
              <textarea
                className="border rounded px-2 py-1 w-full text-sm"
                rows={3}
                value={editCompany.businessDescription}
                onChange={(e) =>
                  setEditCompany((c: EditCompany) => ({
                    ...c,
                    businessDescription: e.target.value,
                  }))
                }
              />
            ) : (
              <p className="whitespace-pre-wrap">
                {(company as any).businessDescription || "Not provided"}
              </p>
            )}
          </div>

          {/* Financials */}
          <div className="pt-2 space-y-1">
            <h3 className="font-semibold text-lg">Financial Information</h3>

            <div>
              <h4 className="font-semibold">Revenue (INR Cr)</h4>
              {isEditingLead ? (
                <input
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={editCompany.revenueInrCr}
                  onChange={(e) =>
                    setEditCompany((c: EditCompany) => ({ ...c, revenueInrCr: e.target.value }))
                  }
                />
              ) : (
                <p>{company.revenueInrCr ?? "N/A"}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold">EBITDA (INR Cr)</h4>
              {isEditingLead ? (
                <input
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={editCompany.ebitdaInrCr}
                  onChange={(e) =>
                    setEditCompany((c: EditCompany) => ({ ...c, ebitdaInrCr: e.target.value }))
                  }
                />
              ) : (
                <p>{company.ebitdaInrCr ?? "N/A"}</p>
              )}
            </div>

            <div>
              <h4 className="font-semibold">PAT (INR Cr)</h4>
              {isEditingLead ? (
                <input
                  className="border rounded px-2 py-1 w-full text-sm"
                  value={editCompany.patInrCr}
                  onChange={(e) =>
                    setEditCompany((c: EditCompany) => ({ ...c, patInrCr: e.target.value }))
                  }
                />
              ) : (
                <p>{company.patInrCr ?? "N/A"}</p>
              )}
            </div>
          </div>
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
