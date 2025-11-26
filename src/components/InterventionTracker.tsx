import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Plus, Edit2, Trash2, Calendar, Clock, MessageSquare, Phone, MessageCircle, Mail, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InterventionFormData, Intervention, User } from "@/lib/types";
import { z } from "zod";

// Define local schema for intervention form
const interventionFormSchema = z.object({
  type: z.enum(["linkedin_message", "call", "whatsapp", "email", "meeting"]),
  scheduledAt: z.date(),
  notes: z.string().min(1, "Notes are required"),
});

interface InterventionTrackerProps {
  leadId: number;
  companyName: string;
  onClose: () => void;
}

const INTERVENTION_TYPES = [
  { value: "linkedin_message", label: "LinkedIn Message", icon: MessageSquare },
  { value: "call", label: "Call", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Meeting", icon: Users },
] as const;

const INTERVENTION_TYPE_COLORS = {
  linkedin_message: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  call: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  email: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  meeting: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function InterventionTracker({ leadId, companyName, onClose }: InterventionTrackerProps) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<(Intervention & { user: User }) | null>(null);

  // Fetch interventions for this lead
  const { data: interventions = [], isLoading } = useQuery<(Intervention & { user: User })[]>({
    queryKey: ['/interventions/lead', leadId],
    enabled: !!leadId,
  });

  const form = useForm<InterventionFormData>({
    resolver: zodResolver(interventionFormSchema),
    defaultValues: {
      leadId,
      type: "linkedin_message",
      scheduledAt: new Date(),
      notes: "",
    },
  });

  // Create intervention mutation
  const createMutation = useMutation({
    mutationFn: (data: InterventionFormData) => apiRequest('POST', '/interventions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/interventions/lead', leadId] });
      toast({ title: "Intervention scheduled successfully" });
      setShowCreateForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update intervention mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InterventionFormData> }) =>
      apiRequest('PUT', `/interventions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/interventions/lead', leadId] });
      toast({ title: "Intervention updated successfully" });
      setEditingIntervention(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete intervention mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/interventions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/interventions/lead', leadId] });
      toast({ title: "Intervention deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (data: InterventionFormData) => {
    if (editingIntervention) {
      updateMutation.mutate({ id: editingIntervention.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (intervention: Intervention & { user: User }) => {
    setEditingIntervention(intervention);
    setShowCreateForm(true);
    form.reset({
      leadId: intervention.leadId,
      type: intervention.type as any,
      scheduledAt: new Date(intervention.scheduledAt),
      notes: intervention.notes || "",
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this intervention?")) {
      deleteMutation.mutate(id);
    }
  };

  const getInterventionIcon = (type: string) => {
    const intervention = INTERVENTION_TYPES.find(t => t.value === type);
    const Icon = intervention?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Intervention Tracking</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track outreach activities for {companyName}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-interventions">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Create/Edit Form */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {interventions.length === 0 ? "No interventions yet" : `${interventions.length} intervention(s)`}
            </h3>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingIntervention(null);
                  form.reset({
                    leadId,
                    type: "linkedin_message",
                    scheduledAt: new Date(),
                    notes: "",
                  });
                }} data-testid="button-add-intervention">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Intervention
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingIntervention ? "Edit Intervention" : "Schedule New Intervention"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intervention Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-intervention-type">
                                <SelectValue placeholder="Select intervention type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INTERVENTION_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date & Time</FormLabel>
                          <FormControl>
                            <input
                              type="datetime-local"
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ""}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                              data-testid="input-scheduled-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the intervention details, objectives, or outcomes..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-intervention-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateForm(false);
                          setEditingIntervention(null);
                          form.reset();
                        }}
                        data-testid="button-cancel-intervention"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-intervention"
                      >
                        {editingIntervention ? "Update" : "Schedule"} Intervention
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Interventions List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-20 bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : interventions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No interventions scheduled</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your outreach activities by scheduling your first intervention.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interventions.map((intervention) => (
                <Card key={intervention.id} className="p-4" data-testid={`intervention-card-${intervention.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge 
                          variant="secondary" 
                          className={INTERVENTION_TYPE_COLORS[intervention.type as keyof typeof INTERVENTION_TYPE_COLORS]}
                        >
                          <div className="flex items-center gap-1">
                            {getInterventionIcon(intervention.type)}
                            {INTERVENTION_TYPES.find(t => t.value === intervention.type)?.label}
                          </div>
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(intervention.scheduledAt), "MMM dd, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      
                      {intervention.notes && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                          {intervention.notes}
                        </p>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        Scheduled by {intervention.user?.firstName} {intervention.user?.lastName}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(intervention)}
                        data-testid={`button-edit-intervention-${intervention.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(intervention.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-intervention-${intervention.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}