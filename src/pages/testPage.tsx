import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, Linkedin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const activityTypeOptions = [
  { value: 'linkedin_request_self', label: 'LinkedIn Request (Self)' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email_d0_analyst', label: 'Email D0 (Analyst)' },
];

const statusOptions = [
  { value: 'sent', label: 'Sent', tag: 'Non-responsive', variant: 'secondary' },
  { value: 'received', label: 'Received', tag: 'Responded', variant: 'default' },
];

export default function AddOutreachPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    activityType: 'linkedin_request_self',
    status: 'sent',
    followUpDate: '',
    followUpTime: '',
    notes: '',
  });
  const [selectedStatusTag, setSelectedStatusTag] = useState('');

  const handleSubmit = () => {
    if (!formData.notes.trim()) {
      toast({ title: "Error", description: "Please add notes", variant: "destructive" });
      return;
    }
    console.log("Submitting form:", formData);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Outreach Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Activity Type */}
          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type</Label>
            <Select
              value={formData.activityType}
              onValueChange={(value) => setFormData({ ...formData, activityType: value })}
            >
              <SelectTrigger id="activityType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleSubmit}>Save Activity</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
