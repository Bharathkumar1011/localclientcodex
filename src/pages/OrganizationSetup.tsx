import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function OrganizationSetup() {
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateOrganization = async () => {
    if (!organizationName.trim()) {
      toast({
        title: "Organization name required",
        description: "Please enter a name for your organization",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/organizations/setup", { name: organizationName.trim() });

      toast({
        title: "Organization created successfully!",
        description: "You can now access the full CRM features.",
      });

      // Reload the page to trigger authentication refresh
      window.location.reload();
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast({
        title: "Failed to create organization",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to Investment Bank CRM</CardTitle>
            <CardDescription className="mt-2">
              Let's set up your organization to get started with managing your deal pipeline.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization Name</Label>
            <Input
              id="organizationName"
              placeholder="Enter your organization name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              data-testid="input-organization-name"
            />
          </div>
          
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary" />
              What you'll get:
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• Complete deal pipeline management</li>
              <li>• User management with role-based access</li>
              <li>• Lead tracking and assignment</li>
              <li>• Analytics and reporting</li>
            </ul>
          </div>

          <Button
            onClick={handleCreateOrganization}
            disabled={isLoading}
            className="w-full"
            data-testid="button-create-organization"
          >
            {isLoading ? "Creating Organization..." : "Create Organization"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}