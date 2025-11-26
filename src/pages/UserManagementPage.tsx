import { useAuth } from "@/hooks/useAuth";
import UserManagement from "@/components/UserManagement";

export default function UserManagementPage() {
  const { user } = useAuth();
  
  // User should already be available from parent Home component,
  // but keeping this as a safety check
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access user management.</p>
        </div>
      </div>
    );
  }

  return <UserManagement currentUser={user} />;
}