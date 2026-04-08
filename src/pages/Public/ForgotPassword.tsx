import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Matches Login exactly */}
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
          RESET PASSWORD
        </h1>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex items-center justify-center bg-white px-6 py-12 md:w-[45%] lg:w-[38%]">
        <div className="w-full max-w-[397px]">
          <form className="flex flex-col gap-6 p-6 rounded-lg border border-[#D9D9D9] bg-white">
            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>Forgot Password?</h2>
                <p className="text-sm text-gray-500">Enter your email and we'll send you a link to reset your password.</p>
            </div>

            {/* Email Field - Styled like Login */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[#1E1E1E] text-base font-normal leading-[140%]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            {/* Action Button */}
            <button
              type="button"
              className="w-full py-3 rounded-lg border border-[#2C2C2C] bg-[#2C2C2C] text-[#F5F5F5] transition-colors"
            >
              Send Reset Link
            </button>

            {/* Back to Login */}
            <p
              className="text-[#1E1E1E] text-base font-normal leading-[140%]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Remember your password?{" "}
              <Link to="/login" className="underline underline-offset-auto">
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
