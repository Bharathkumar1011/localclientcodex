import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, MapPin, Globe, DollarSign, FileText, UserCheck } from "lucide-react";
import { channel } from "diagnostics_channel";

// Form validation schema - matches server-side expectations
const individualLeadFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255, "Company name too long"),
  sector: z.string().min(1, "Sector is required").max(100, "Sector too long"),
  location: z.string().optional(),
  businessDescription: z.string().optional(),
  ChannelPartner: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  revenueInrCr: z.coerce.number().positive("Revenue must be positive").optional(),
  ebitdaInrCr: z.coerce.number().optional(), // EBITDA can be negative
  patInrCr: z.coerce.number().optional(), // PAT can be negative
  assignedTo: z.string().optional(),
  // createdBy: z.string().optional(),
});

type IndividualLeadFormData = z.infer<typeof individualLeadFormSchema>;

// Predefined sector options for consistency
const SECTOR_OPTIONS = [
  "Technology",
  "Healthcare", 
  "Financial Services",
  "Manufacturing",
  "Retail & E-commerce",
  "Real Estate",
  "Energy & Utilities",
  "Education",
  "Agriculture",
  "Transportation & Logistics",
  "Media & Entertainment",
  "Telecommunications",
  "Aerospace & Defense",
  "Food & Beverage",
  "Pharmaceuticals",
  "Automotive",
  "Construction",
  "Mining",
  "Chemicals",
  "Other"
];

interface IndividualLeadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  currentUser?: {
    firstName: string;
    lastName: string;
    role: string;
  }; // Pass current user info for default assignment
}

export function IndividualLeadForm({ onSuccess, onCancel, currentUser }: IndividualLeadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users for assignment dropdown (analysts and partners only)
  const { data: users = [] } = useQuery({
    queryKey: ['/users'],
    select: (data: any[]) => data.filter(user => ['analyst', 'partner'].includes(user.role))
  });

  const form = useForm<IndividualLeadFormData>({
    resolver: zodResolver(individualLeadFormSchema),
    defaultValues: {
      companyName: "",
      sector: "",
      location: "",
      businessDescription: "",
      website: "",
      ChannelPartner: undefined,
      revenueInrCr: undefined,
      ebitdaInrCr: undefined,
      patInrCr: undefined,
      assignedTo: undefined,
      // createdBy: currentUser?.firstName || undefined,
    },
  });

  // Create individual lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (data: IndividualLeadFormData) =>
      apiRequest("POST", "/leads/individual", data),
    onSuccess: async (data: any) => {
      toast({
        title: "Lead Created Successfully",
        description: data.message || "Lead and company created successfully",
      });
      
      // Invalidate relevant queries and wait for refetch to complete
      await queryClient.invalidateQueries({ queryKey: ['leads'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies'], refetchType: 'active' });
      await queryClient.invalidateQueries({ queryKey: ['/dashboard/metrics'], refetchType: 'active' });
      
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Lead", 
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: IndividualLeadFormData) => {
    setIsSubmitting(true);
    try {
      await createLeadMutation.mutateAsync(data);
    } catch (error) {
      // Error handling is done in the mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Create Individual Lead
        </CardTitle>
        <CardDescription>
          Add a new company to the pipeline. Company names are automatically deduplicated to prevent duplicates.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-500">Company Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter company name"
                          data-testid="input-company-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-500">Sector *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-sector">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-50">
                          {SECTOR_OPTIONS.map((sector) => (
                            <SelectItem key={sector} value={sector}>
                              {sector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="City, State, Country"
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Website
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://company.com"
                          data-testid="input-website"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
 <FormField
                  control={form.control}
                  name="ChannelPartner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">Channel Partner</FormLabel>
                      <FormControl>
                        <Input 
                          // {...field} 
                          placeholder="Channel Partner"
                          data-testid="input-channel-partner"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Business Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Brief description of company's business model and operations"
                        className="min-h-[80px]"
                        data-testid="textarea-business-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {/* Financial Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="revenueInrCr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Revenue (INR Cr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          data-testid="input-revenue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ebitdaInrCr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EBITDA (INR Cr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          data-testid="input-ebitda"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="patInrCr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAT (INR Cr)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          {...field}
                          placeholder="0.00"
                          data-testid="input-pat"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Assignment Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Assignment (Optional)
              </h3>
              
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign to Team Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assigned-to">
                          <SelectValue placeholder="Select team member (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-50">
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting || createLeadMutation.isPending}
                data-testid="button-create-lead"
              >
                {isSubmitting ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}