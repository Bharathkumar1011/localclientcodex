import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Calendar, CheckCircle, UserCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface Contact {
  id: number;
  companyId: number;
  name: string;
  designation: string;
  email?: string;
  phone?: string;
  linkedinProfile: string;
  isPrimary: boolean;
  isComplete: boolean;
}

interface EngagementGateDialogProps {
  isOpen: boolean;
  leadId: number;
  companyId: number;
  companyName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EngagementGateDialog({
  isOpen,
  leadId,
  companyId,
  companyName,
  onClose,
  onSuccess
}: EngagementGateDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showNoInfoConfirm, setShowNoInfoConfirm] = useState(false);

  // Keep form data even if dialog unmounts while navigating
const [formData, setFormData] = useState(() => {
  const saved = sessionStorage.getItem(`engagement-gate-${leadId}`);

  const base = saved
    ? JSON.parse(saved)
    : {
        meetingType: "online" as "online" | "inperson",
        scheduledAt: "",
        notes: "",
        defaultPocId: "",
        backupPocId: "",
      };

  // normalize bad/old values like "meeting"
  if (base.meetingType !== "online" && base.meetingType !== "inperson") {
    base.meetingType = "online";
  }

  return base;
});

  // Save to sessionStorage whenever formData changes
  useEffect(() => {
    sessionStorage.setItem(
      `engagement-gate-${leadId}`,
      JSON.stringify(formData)
    );
  }, [formData, leadId]);


  // Fetch contacts for POC selection
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: [`/contacts/company/${companyId}`],
    enabled: isOpen && !!companyId,
  });

const performMoveToPitching = async () => {
  setIsSaving(true);

  try {
    const hasMeetingInfo = !!formData.scheduledAt && !!formData.notes.trim();

    // Create the meeting intervention ONLY if both datetime + notes exist
    if (hasMeetingInfo) {
      await apiRequest("POST", `/interventions`, {
        leadId,
        type: "meeting",
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        notes: formData.notes,
        meetingMode: formData.meetingType, // "online" | "inperson"
      });
    }

    // Move lead to pitching ALWAYS (even without meeting)
    const payload: any = { stage: "pitching" };

    // Send POCs only if selected
    if (formData.defaultPocId) payload.defaultPocId = parseInt(formData.defaultPocId);
    if (formData.backupPocId) payload.backupPocId = parseInt(formData.backupPocId);

    await apiRequest("PATCH", `/leads/${leadId}/stage`, payload);

    toast({
      title: "Success",
      description: hasMeetingInfo
        ? "Meeting recorded and lead moved to Pitching stage"
        : "Lead moved to Pitching stage (no meeting info recorded)",
    });

    await queryClient.invalidateQueries({ queryKey: [`/leads/${leadId}`] });
    await queryClient.invalidateQueries({ queryKey: [`/interventions/scheduled`] });
    await queryClient.invalidateQueries({ queryKey: [`/outreach/lead/${leadId}`] });
    await queryClient.invalidateQueries({ queryKey: [`/contacts/company/${companyId}`] });

    // Reset form (IMPORTANT: meetingType should not be "meeting")
    setFormData({
      meetingType: "online",
      scheduledAt: "",
      notes: "",
      defaultPocId: "",
      backupPocId: "",
    });

    sessionStorage.removeItem(`engagement-gate-${leadId}`);
    onSuccess();
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to move lead to Pitching",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const isCompletelyEmpty =
    !formData.scheduledAt &&
    !formData.notes.trim() &&
    !formData.defaultPocId &&
    !formData.backupPocId;

  // If user filled nothing at all, show warning confirm (frontend-only)
  if (isCompletelyEmpty) {
    setShowNoInfoConfirm(true);
    return;
  }

  await performMoveToPitching();
};


  const handleCancel = () => {
    setFormData({
      meetingType: 'online',
      scheduledAt: '',
      notes: '',
      defaultPocId: '',
      backupPocId: ''
    });
    sessionStorage.removeItem(`engagement-gate-${leadId}`);
    onClose();
  };

  // Filter available backup POCs (exclude the selected default POC)
  const availableBackupPocs = contacts.filter(c => c.id.toString() !== formData.defaultPocId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl" data-testid="dialog-engagement-gate">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Record Meeting - Move to Pitching
          </DialogTitle>
          <DialogDescription>
            To move <span className="font-semibold">{companyName}</span> to Pitching stage, you must record a meeting and select POCs for engagement.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="space-y-4 mt-4 h-[550px] pl-2 overflow-y-auto pr-2 ">
          {showNoInfoConfirm ? (
            <div className="space-y-4">
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">
                  You're moving this lead to Pitching without any meeting info.
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  Do you want to proceed?
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNoInfoConfirm(false)}
                  disabled={isSaving}
                >
                  No
                </Button>

                <Button
                  type="button"
                  onClick={performMoveToPitching}
                  disabled={isSaving}
                >
                  Yes, proceed
                </Button>
              </div>
            </div>
          ) : (
            <>
          <div className="space-y-2">
            <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select
                value={formData.meetingType}
                onValueChange={(value) => setFormData({ ...formData, meetingType: value as "online" | "inperson" })}
              >
              <SelectTrigger id="meeting-type" data-testid="select-meeting-type">
                <SelectValue placeholder="Select meeting type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
               <SelectItem value="online">Online</SelectItem>
               <SelectItem value="inperson">In-person</SelectItem>            
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Meeting Date & Time *</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              data-testid="input-meeting-datetime"
            />
            <p className="text-xs text-muted-foreground">When did or will the meeting take place?</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Meeting Notes *</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Describe the meeting: attendees, key discussion points, outcomes, next steps..."
              rows={5}
              data-testid="textarea-meeting-notes"
            />
            <p className="text-xs text-muted-foreground">Include POC names, discussion topics, and outcomes</p>
          </div>

          {/* POC Selection Section */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              <h3 className="font-semibold">POC Selection for Pitching</h3>
            </div>
            
            {isLoadingContacts ? (
              <p className="text-sm text-muted-foreground">Loading contacts...</p>
            ) : contacts.length === 0 ? (
              <div className="p-4 border border-destructive rounded-md bg-destructive/10">
                <p className="text-sm text-destructive font-medium">No contacts found for this company</p>
                <p className="text-xs text-muted-foreground mt-1">Please add POCs before moving to Pitching stage</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="default-poc">
                    Default POC (Optional)
                  </Label>
                  <Select
                    value={formData.defaultPocId}
                    onValueChange={(value) => {
                      setFormData({ ...formData, defaultPocId: value });
                      // Clear backup POC if it's the same as default POC
                      if (formData.backupPocId === value) {
                        setFormData({ ...formData, defaultPocId: value, backupPocId: '' });
                      }
                    }}
                  >
                    <SelectTrigger id="default-poc" data-testid="select-default-poc">
                      <SelectValue placeholder="Select primary contact for pitching" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-50">
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} - {contact.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Primary point of contact for this pitch</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup-poc">Backup POC (Optional)</Label>
                  <Select
                    value={formData.backupPocId}
                    onValueChange={(value) => setFormData({ ...formData, backupPocId: value })}
                    disabled={!formData.defaultPocId}
                  >
                    <SelectTrigger id="backup-poc" data-testid="select-backup-poc">
                      <SelectValue placeholder="Select backup contact (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBackupPocs.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id.toString()}>
                          {contact.name} - {contact.designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Secondary contact if primary is unavailable</p>
                </div>
              </>
            )}
          </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              data-testid="button-cancel-engagement"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              formNoValidate
              disabled={isSaving}
              data-testid="button-save-engagement"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Record Meeting & Move to Pitching"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
