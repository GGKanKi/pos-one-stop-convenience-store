import { useState } from "react";
import { Link } from "react-router-dom";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
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

      <div className="flex items-center justify-center bg-white px-6 py-12 md:w-[45%] lg:w-[38%]">
        <div className="w-full max-w-[397px]">
          <form className="flex flex-col gap-6 p-6 rounded-lg border border-[#D9D9D9] bg-white">
            <div>
              <p className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                SIGN UP
              </p>
              <p className="text-[#666666] text-sm mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                Create your account to continue.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="firstName" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lastName" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <div className="flex flex-col gap-2 relative">
              <label htmlFor="password" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Password
              </label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-11 text-[#6B7280]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="confirmPassword" className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Value"
                className="w-full px-4 py-3 rounded-lg border border-[#D9D9D9] bg-white text-base text-[#B3B3B3] placeholder:text-[#B3B3B3] outline-none focus:border-[#2C2C2C] transition-colors"
                style={{ fontFamily: "Inter, sans-serif" }}
              />
            </div>

            <button
              type="button"
              className="w-full py-3 rounded-lg border border-[#2C2C2C] bg-[#2C2C2C] text-[#F5F5F5] transition-colors hover:bg-[#1f1f1f]"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Create account
            </button>

            <p className="text-[#1E1E1E] text-base font-normal leading-[140%]" style={{ fontFamily: "Inter, sans-serif" }}>
              Already have an account?{' '}
              <Link to="/login" className="underline underline-offset-auto">
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
