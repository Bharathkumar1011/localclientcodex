import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Make sure the user session exists before allowing update
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage("Recovery session not found. Try clicking the reset link again.");
      }
      setLoading(false);
    });
  }, []);

  const submit = async () => {
    if (!password) {
      setMessage("Password cannot be empty.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error(error);
      setMessage("Failed to update password. Your reset link may have expired.");
    } else {
      setMessage("Password updated successfully! Redirecting...");
      setTimeout(() => (window.location.href = "/"), 1500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-6 bg-white shadow-lg rounded">
        <h2 className="text-xl font-bold mb-4">Choose a new password</h2>

        <div className="relative mb-4">
          <input
            className="border w-full p-2 rounded pr-10"
            type={showPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <button
          className="w-full bg-blue-600 text-white p-2 rounded"
          onClick={submit}
        >
          Update Password
        </button>

        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}
