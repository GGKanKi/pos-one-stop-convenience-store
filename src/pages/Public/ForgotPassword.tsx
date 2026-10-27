import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await apiRequest("/requestpasswordreset.php", "POST", { email });
      if (!response.success) throw new Error(response.message || "Could not send the reset link.");
      setMessage(response.message || "If an account exists for that email, a reset link has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-screen flex items-center justify-center overflow-hidden">
      {/* BACKGROUND IMAGE WITH BLUE OVERLAY */}
      <img src="/pictures/store.jpg" alt="Store Environment" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/85 via-blue-900/80 to-blue-950/95 backdrop-blur-[2px]" />

      {/* CENTERED CARD CONTAINER */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <form 
          onSubmit={handleSubmit} 
          className="flex flex-col gap-6 p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white"
        >
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">Forgot Password</h2>
            <p className="text-xs text-blue-200/80 font-medium">Enter your email to reset your password</p>
          </div>

          {message && <div role="status" className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-2 rounded-xl text-xs">{message}</div>}
          {error && <div role="alert" className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-2 rounded-xl text-xs">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-blue-200 uppercase tracking-wider block">Email Address</label>
            <input 
              type="email" 
              autoComplete="email" 
              required 
              value={email} 
              onChange={(event) => setEmail(event.target.value)} 
              placeholder="your@email.com" 
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-blue-300/40 border border-white/20 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 text-sm transition font-medium" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50 text-sm uppercase tracking-wider cursor-pointer"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <div className="text-center pt-2">
            <p className="text-xs text-blue-200/70">
              Remember your password?{" "}
              <Link to="/login" className="text-white hover:text-blue-300 underline font-semibold transition">
                Back to Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}