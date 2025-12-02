import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setMessage("Failed to send reset link.");
    } else {
      setMessage("Password reset email sent. Check your inbox.");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your account email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button onClick={handleReset} className="w-full">
            Send Reset Link
          </Button>

          {message && <p className="text-center text-sm mt-2">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
