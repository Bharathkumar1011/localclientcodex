import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import InvestorCard from "@/components/InvestorCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DeletedInvestors() {
  const queryClient = useQueryClient();

  const { data: investors = [], isLoading } = useQuery<any[]>({
    queryKey: ["investors", "deleted"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/investors/deleted");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const restoreInvestorMutation = useMutation({
    mutationFn: async (investorId: number) => {
      await apiRequest("PATCH", `/investors/${investorId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investors"] });
      queryClient.invalidateQueries({ queryKey: ["investor-metrics"] });
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Deleted Investors</h1>
        <p className="text-muted-foreground">
          Restore soft-deleted investors from here.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${investors.length} deleted investors`}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-12 text-sm font-medium text-muted-foreground px-4">
            <div className="col-span-4">Investor Name</div>
            <div className="col-span-3">Sector</div>
            <div className="col-span-3">Linked Companies</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="space-y-2">
            {investors.map((inv) => (
              <InvestorCard
                key={inv.id}
                investor={inv}
                stage="all"
                onRestoreInvestor={(investor) => {
                  if (window.confirm(`Restore investor "${investor.name}"?`)) {
                    restoreInvestorMutation.mutate(investor.id);
                  }
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}