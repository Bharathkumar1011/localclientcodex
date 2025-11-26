import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Shield, UserCheck, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type UserWithRole = {
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Fetch current user to determine available roles
  const { data: user } = useQuery<UserWithRole>({
    queryKey: ["/auth/user"],
  });

  const handleContinue = async () => {
    if (!selectedRole) {
      toast({
        title: "Role Required",
        description: "Please select a role to continue",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/auth/set-test-role`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ role: selectedRole }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Redirect to dashboard
      window.location.href = "/";
    } catch (error) {
      console.error("Error setting test role:", error);
      toast({
        title: "Error",
        description: "Failed to set role. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Select Admin Role</CardTitle>
          {/* <CardDescription>
            As an admin, you can test the system as different roles to verify workflows and permissions
          </CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger data-testid="select-role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                {/* Admin Role */}
                  <SelectItem value="admin" data-testid="option-admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Full system access</div>
                      </div>
                    </div>
                  </SelectItem>
                
                <SelectItem value="partner" data-testid="option-partner">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Partner</div>
                      <div className="text-xs text-muted-foreground">Oversee organization activities</div>
                    </div>
                  </div>
                </SelectItem> 
                
                <SelectItem value="analyst" data-testid="option-analyst">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Analyst</div>
                      <div className="text-xs text-muted-foreground">Manage leads and interns</div>
                    </div>
                  </div> 
                </SelectItem>
                {/* <SelectItem value="intern" data-testid="option-intern">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Intern</div>
                      <div className="text-xs text-muted-foreground">Work on assigned leads</div>
                    </div>
                  </div>
                </SelectItem> */}
              </SelectContent>
            </Select>

            <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Role Capabilities:</p>
              {selectedRole === "admin" && (
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Full access to all features</li>
                  <li>User management and invitations</li>
                  <li>View audit logs</li>
                  <li>Manage all leads across organization</li>
                </ul>
              )}
              {
                selectedRole === "partner" && (
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    <li>Oversee organizational activities</li>
                    <li>Manage analysts and interns</li>
                    <li>Access all leads and reports</li>
                    <li>Generate organizational insights</li>
                  </ul>
                )
              }
              {selectedRole === "analyst" && (
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Create and manage own leads</li>
                  <li>Assign leads to interns</li>
                  <li>Track outreach and interventions</li>
                  <li>Limited to assigned portfolio</li>
                </ul>
              )}
              {selectedRole === "intern" && (
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>View assigned leads only</li>
                  <li>Edit POC information</li>
                  <li>Log outreach and interventions</li>
                  <li>Cannot create or assign leads</li>
                </ul>
              )}
              {!selectedRole && (
                <p className="text-muted-foreground">Select a role to see capabilities</p>
              )}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            data-testid="button-continue"
          >
            {isLoading ? "Loading..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
