import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Static Validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    // Simulating a successful "Static" reset
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Keeping your branding */}
      <div
        className="flex-1 flex items-center justify-center min-h-[40vh] md:min-h-screen"
        style={{ backgroundColor: "#D1C4E9" }}
      >
        <h1
          className="text-center px-8 select-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            lineHeight: "120%",
            color: "#E0E0E0",
            textShadow: "0 4px 4px rgba(0, 0, 0, 0.25)",
            WebkitTextStrokeWidth: "3px",
            WebkitTextStrokeColor: "#000",
          }}
        >
          ONE STOP CONVENIENCE STORE
        </h1>
      </div>

      {/* Right Panel - The Static Form */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:w-[45%] lg:w-[38%]">
        <div className="w-full max-w-[397px]">
          <form
            onSubmit={handlePasswordReset}
            className="flex flex-col gap-6 p-6 rounded-lg border border-[#D9D9D9] bg-white"
          >
            <h2 className="text-xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>
              Set New Password
            </h2>

            {errorMsg && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm">
                Success! Password updated. Redirecting to login...
              </div>
            )}

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[#1E1E1E] text-base font-normal" style={{ fontFamily: "Inter, sans-serif" }}>
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] outline-none focus:border-[#2C2C2C] transition-colors"
              />
            </div>

            {/* Confirm Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[#1E1E1E] text-base font-normal" style={{ fontFamily: "Inter, sans-serif" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] outline-none focus:border-[#2C2C2C] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 rounded-lg bg-[#2C2C2C] text-[#F5F5F5] font-bold disabled:opacity-50 transition-opacity"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {loading ? "Updating..." : "RESET PASSWORD"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}