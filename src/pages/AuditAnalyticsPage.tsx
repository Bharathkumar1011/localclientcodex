import { useAuth } from "@/hooks/useAuth";
import AuditLogPage from "./AuditLogPage";

export default function AuditAnalyticsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to access audit analytics.</p>
        </div>
      </div>
    );
  }

  return <AuditLogPage />;
}