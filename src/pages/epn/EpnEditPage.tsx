import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, User, Briefcase, Phone, Mail, Linkedin, MapPin, Globe } from "lucide-react";

export default function EpnEditPage() {
  const params = useParams();
  const epnId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: partner, isLoading } = useQuery({
    queryKey: [`/epn/${epnId}`],
    enabled: !!epnId,
  });

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (partner) setForm({ ...partner });
  }, [partner]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `//epn/${epnId}`, form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/epn"] });
      queryClient.invalidateQueries({ queryKey: [`/epn/${epnId}`] });
      toast({
        title: "Success",
        description: "Partner details updated successfully.",
      });
      window.history.back();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update partner details.",
        variant: "destructive",
      });
    }
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-slate-50/50 dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Title */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <button 
              onClick={() => window.history.back()}
              className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Partner Profile</h1>
            <p className="text-muted-foreground">Modify professional details for <span className="font-semibold text-foreground">{partner?.name}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-sm border-slate-200 dark:border-neutral-800">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-neutral-900/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">General & Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" /> Full Name
                  </Label>
                  <Input 
                    placeholder="Enter full name" 
                    value={form.name || ""} 
                    onChange={(e) => set("name", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" /> Designation
                  </Label>
                  <Input 
                    placeholder="e.g. Director" 
                    value={form.designation || ""} 
                    onChange={(e) => set("designation", e.target.value)} 
                  />
                </div>
              </div>

              {/* Row 2: Contact Methods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" /> Phone Number
                  </Label>
                  <Input 
                    placeholder="+91..." 
                    value={form.phoneNumber || ""} 
                    onChange={(e) => set("phoneNumber", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" /> Email Address
                  </Label>
                  <Input 
                    type="email" 
                    placeholder="email@example.com" 
                    value={form.email || ""} 
                    onChange={(e) => set("email", e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4 text-blue-600" /> LinkedIn URL
                  </Label>
                  <Input 
                    placeholder="linkedin.com/in/..." 
                    value={form.linkedin || ""} 
                    onChange={(e) => set("linkedin", e.target.value)} 
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Location Details</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400" /> Zone
                    </Label>
                    <Input 
                      placeholder="e.g. West" 
                      value={form.zone || ""} 
                      onChange={(e) => set("zone", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> City
                    </Label>
                    <Input 
                      placeholder="e.g. Mumbai" 
                      value={form.city || ""} 
                      onChange={(e) => set("city", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" /> State
                    </Label>
                    <Input 
                      placeholder="e.g. Maharashtra" 
                      value={form.state || ""} 
                      onChange={(e) => set("state", e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky/Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              size="lg"
              className="px-8"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button 
              size="lg"
              className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}