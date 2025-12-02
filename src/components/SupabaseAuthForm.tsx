import { useState, type FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseAuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Forces Supabase to refresh session cookies
      await supabase.auth.getSession();

      toast({
        title: "Signed in",
        description: "You're now authenticated.",
      });

      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error?.message || "Invalid login credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        <CardDescription>
          Use your organization-provided credentials to access the Investment CRM.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>

            {/* 🔵 Add this block */}
         <div style={{ textAlign: "right", marginBottom: "8px" }}>
             <button
             type="button"
             onClick={() => (window.location.href = "/forgot-password")}
             className="text-sm text-blue-600 hover:underline"
             >
             Forgot password?
             </button>
         </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
