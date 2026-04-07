import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    if (email === "admin@gmail.com" && password === "admin123") {
      navigate("/admin/dashboard");
    } else if (email === "member@gmail.com" && password === "member123") {
      navigate("/member/dashboard");
    } else if (email === "staff@gmail.com" && password === "staff123") {
      navigate("/staff/dashboard");
    } else {
      setErrorMsg("Invalid email or password.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Lavender Background */}
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
            letterSpacing: "-0.03em",
            color: "#E0E0E0",
            textShadow: "0 4px 4px rgba(0, 0, 0, 0.25)",
            WebkitTextStrokeWidth: "3px",
            WebkitTextStrokeColor: "#000",
            filter: "blur(0.8px)",
            maxWidth: "600px",
          }}
        >
          ONE STOP CONVENIENCE STORE
        </h1>
      </div>

      {/* Right Panel - White Login Form */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:w-[45%] lg:w-[38%]">
        <div className="w-full max-w-[397px]">
          <form
            onSubmit={handleSignIn}
            className="flex flex-col gap-6 p-6 rounded-lg border border-[#D9D9D9] bg-white"
          >
            {errorMsg && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-sm">
                {errorMsg}
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[#1E1E1E] text-base font-normal leading-[140%]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-[#1E1E1E] text-base font-normal leading-[140%]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg border border-[#2C2C2C] bg-[#2C2C2C] text-[#F5F5F5] transition-colors disabled:opacity-50"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {loading ? "Checking..." : "Sign In"}
            </button>

            {/* Forgot Password */}
            <Link
              to="/forgot-password"
              className="text-[#1E1E1E] text-base font-normal leading-[140%] underline underline-offset-auto"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Forgot password?
            </Link>

            {/* Sign Up */}
            <p
              className="text-[#1E1E1E] text-base font-normal leading-[140%]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Don't have an account?{" "}
              <Link to="/signup" className="underline underline-offset-auto">
                Sign up here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}