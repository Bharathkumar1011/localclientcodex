import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch"; // Import directly from its file
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, ExternalLink, Plus, ArrowLeft, Loader2 , Download, Calendar} from "lucide-react";

export default function PitchingDashboard() {
  const [, params] = useRoute("/pitching/:id");
  const [, setLocation] = useLocation();
  const leadId = params ? parseInt(params.id) : 0;

  // Fetch Lead & Pitching Details
const { data: lead, isLoading: leadLoading } = useQuery({
  queryKey: ["lead", leadId],
  queryFn: async () => (await apiFetch(`/api/leads/${leadId}`)).json(),
});


  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ["pitching", leadId],
    queryFn: async () => (await apiFetch(`/api/leads/${leadId}/pitching`)).json()
  });

  // Fetch Meeting interventions (created by "Move to Pitching" dialog)
const { data: interventions, isLoading: meetingsLoading } = useQuery({
  queryKey: ["interventions", leadId],
  queryFn: async () => (await apiFetch(`/api/interventions/lead/${leadId}`)).json(),
});

// Keep only meetings
const meetings = Array.isArray(interventions)
  ? interventions
      .filter((i: any) => i.type === "meeting")
      .sort(
        (a: any, b: any) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      )
  : [];


  if (leadLoading || detailsLoading || meetingsLoading)
  return (
    <div className="p-8 flex justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );


  // Helper for Status Icons
  const StatusIcon = ({ check }: { check: boolean }) => (
    check ? <CheckCircle className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-red-300 mx-auto" />
  );

  // ✅ Secure Download Handler (Uses Auth Token)
  const handleDownload = async (type: string, fileName: string) => {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/pitching/download/${type}`);
      if (!res.ok) throw new Error("Download failed");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName; // Force the correct filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error(error);
      alert("Failed to download file. Please try again.");
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
  variant="ghost" 
  size="sm" 
  onClick={() => window.history.back()}  // ✅ Goes back to exactly where the user was
>
  <ArrowLeft className="h-4 w-4 mr-2" /> Back
</Button>
          <div>
            <h1 className="text-xl font-bold">Pitching Dashboard</h1>
            <p className="text-sm text-muted-foreground">{lead?.company?.name} - {lead?.company?.sector}</p>
          </div>
        </div>
        <Button onClick={() => setLocation(`/pitching/${leadId}/edit`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add / Update Pitching Details
        </Button>
      </div>

      {/* SECTION 1: The Pitching Tracker Table (New Features) */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Milestone Checklist</h2>
        <div className="border rounded-md">
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
              <TableRow>
                {/* 1. G-Drive */}
                <TableCell className="text-center">
                  {details?.gdriveLink ? (
                    <a href={details.gdriveLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-5 w-5 text-blue-600 mx-auto" />
                    </a>
                  ) : <StatusIcon check={false} />}
                </TableCell>

                {/* 2. Solution Note (Checkmark + Download) */}
                <TableCell className="text-center">
                  {details?.solutionNoteName ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] px-2 text-blue-600"
                        onClick={() => handleDownload("solutionNote", details.solutionNoteName)}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </div>
                  ) : <XCircle className="h-5 w-5 text-gray-300 mx-auto" />}
                </TableCell>

                {/* 3. PDM (Checkmark + Download) */}
                <TableCell className="text-center">
                  {details?.pdmName ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] px-2 text-blue-600"
                        onClick={() => handleDownload("pdm", details.pdmName)}
                      >
                        <Download className="h-3 w-3 mr-1" /> PDF
                      </Button>
                    </div>
                  ) : <XCircle className="h-5 w-5 text-gray-300 mx-auto" />}
                </TableCell>

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
            </TableBody>
          </Table>
        </div>
      </div>

{/* SECTION 2: Engagement History & Tasks (Meetings only) */}
<div className="bg-white rounded-lg border shadow-sm p-4">
  <h2 className="text-lg font-semibold mb-4">Engagement History & Tasks</h2>

  {meetings.length === 0 ? (
    <div className="text-sm text-muted-foreground">
      No meetings recorded yet.
    </div>
  ) : (
    <div className="space-y-3">
      {meetings.map((m: any) => (
        <div
          key={m.id}
          className="border rounded-lg p-3 bg-gray-50 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium capitalize">Meeting</div>
              <div className="text-xs text-muted-foreground mt-1">
                {m.meetingMode ? `Mode: ${m.meetingMode}` : null}
              </div>
              {m.notes ? (
                <div className="text-sm mt-2 whitespace-pre-wrap">{m.notes}</div>
              ) : null}
            </div>
          </div>

          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : ""}
          </div>
        </div>
      ))}
    </div>
  )}
</div>

    </div>
  );
}